
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import ErrorHandler from "../utils/errorHandler.js";
import Product from "../models/productModel.js";
import mongoose from "mongoose";

import PaymentReconciliation from "../models/paymentReconciliationModel.js";
import Order from "../models/orderModel.js";
import { getStripe, getScopedIdempotencyKey, verifyPaymentIntent } from "../services/stripeService.js";
import { createReconciliationSnapshot, finalizeReconciliation, releaseReservationSnapshot } from "../services/orderFinalizationService.js";

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export { getScopedIdempotencyKey, verifyPaymentIntent } from "../services/stripeService.js";

// The client supplies product IDs and quantities only. Prices, tax, shipping,
// and the Stripe amount are calculated from the current catalog here.
export const calculateOrderPricing = async (orderitems) => {
    if (!Array.isArray(orderitems) || orderitems.length === 0) {
        throw new ErrorHandler("Your cart is empty.", 400);
    }

    const requested = new Map();
    for (const item of orderitems) {
        const productId = item?.product?.toString();
        const quantity = Number(item?.quantity);
        if (!productId || !mongoose.isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) {
            throw new ErrorHandler("Each order item must have a valid product and quantity.", 400);
        }
        if (requested.has(productId)) {
            throw new ErrorHandler("Duplicate products are not allowed in an order.", 400);
        }
        requested.set(productId, quantity);
    }

    const products = await Product.find({ _id: { $in: [...requested.keys()] } });
    if (products.length !== requested.size) {
        throw new ErrorHandler("One or more products are no longer available.", 400);
    }

    const items = products.map((product) => {
        const quantity = requested.get(product._id.toString());
        if (product.stock < quantity) {
            throw new ErrorHandler(`Insufficient stock for ${product.name}.`, 400);
        }
        return {
            name: product.name,
            price: product.price,
            quantity,
            image: product.images[0],
            product: product._id,
        };
    });

    const itemsprice = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const shippingcost = itemsprice > 1000 ? 0 : 200;
    const tax = roundMoney(itemsprice * 0.18);
    const totalprice = roundMoney(itemsprice + tax + shippingcost);

    return { items, itemsprice, tax, shippingcost, totalprice, amount: Math.round(totalprice * 100), currency: "inr" };
};

export const processPayment = catchAsyncErrors(async (req, res, next) => {
    const { shippinginfo } = req.body;
    if (!shippinginfo) throw new ErrorHandler("Shipping information is required before payment.", 400);
    const pricing = await calculateOrderPricing(req.body.orderitems);
    const idempotencyKey = req.body.idempotencyKey;
    const scopedIdempotencyKey = idempotencyKey
        ? getScopedIdempotencyKey(req.user.id, idempotencyKey)
        : undefined;
    const myPayment = await getStripe().paymentIntents.create({
        amount: pricing.amount,
        currency: pricing.currency,
        metadata: { company: "NutriNavigator", userId: req.user.id.toString() },
    }, scopedIdempotencyKey ? { idempotencyKey: scopedIdempotencyKey } : undefined);
    await createReconciliationSnapshot({
        paymentIntentId: myPayment.id,
        userId: req.user.id,
        shippinginfo,
        pricing,
        paymentStatus: myPayment.status || "requires_payment_method",
    });
    res.status(200).json({
        success: true,
        client_secret: myPayment.client_secret,
        pricing: {
            itemsprice: pricing.itemsprice,
            tax: pricing.tax,
            shippingcost: pricing.shippingcost,
            totalprice: pricing.totalprice,
            currency: pricing.currency,
        },
    });
});

export const sendApiKey = catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({
        success: true,
        stripeApiKey: process.env.STRIPE_API_KEY,
    });
});

// Stripe calls this endpoint directly, so it must not use the authenticated
// user middleware. Authenticity comes from Stripe's signed raw request body.
export const handleStripeWebhook = catchAsyncErrors(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return res.status(500).json({ success: false, message: "Stripe webhook is not configured." });
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid Stripe webhook signature." });
    }

    const paymentIntent = event.data?.object;
    if (!paymentIntent?.id) return res.status(200).json({ success: true, received: true });

    const reconciliation = await PaymentReconciliation.findOne({ paymentIntentId: paymentIntent.id });
    const existingOrder = await Order.findOne({ "paymentinfo.id": paymentIntent.id });

    if (event.type === "payment_intent.succeeded") {
        if (!reconciliation) return res.status(200).json({ success: true, received: true, recoverable: !existingOrder });
        await finalizeReconciliation(reconciliation);
    } else if (event.type === "payment_intent.payment_failed" && reconciliation) {
        // Release by marker even if a crash occurred before stockReserved was
        // persisted; the marker is the authoritative reservation state.
        await releaseReservationSnapshot(reconciliation);
        await PaymentReconciliation.updateOne(
            { _id: reconciliation._id },
            { $set: { paymentStatus: "failed", status: "failed", stockReserved: false } },
        );
    }

    return res.status(200).json({ success: true, received: true });
});
