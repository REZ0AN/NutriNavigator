import Order from "../models/orderModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import { calculateOrderPricing } from "./paymentController.js";
import PaymentReconciliation from "../models/paymentReconciliationModel.js";
import { finalizeReconciliation, createReconciliationSnapshot, releaseOrderStock } from "../services/orderFinalizationService.js";
import { verifyPaymentIntent } from "../services/stripeService.js";

// ─── Create order ─────────────────────────────────────────────────────────────
export const newOrder = catchAsyncErrors(async (req, res) => {
    const { shippinginfo, orderitems, paymentinfo } = req.body;
    const paymentId = paymentinfo?.id;

    const existingOrder = paymentId
        ? await Order.findOne({ "paymentinfo.id": paymentId, user: req.user.id })
        : null;
    if (existingOrder) return res.status(200).json({ success: true, order: existingOrder });

    // A PaymentIntent already linked to another user is never returned to this
    // caller, even when the caller supplies the correct PaymentIntent ID.
    if (paymentId && await Order.findOne({ "paymentinfo.id": paymentId })) {
        return res.status(404).json({ success: false, message: "Order not found." });
    }

    const reconciliation = paymentId
        ? await PaymentReconciliation.findOne({ paymentIntentId: paymentId })
        : null;
    if (reconciliation && reconciliation.user.toString() !== req.user.id.toString()) {
        return res.status(404).json({ success: false, message: "Order not found." });
    }
    const pricing = reconciliation ? null : await calculateOrderPricing(orderitems);
    const paymentIntent = reconciliation ? null : await verifyPaymentIntent(paymentId, pricing.amount, pricing.currency);
    const reconciliationRecord = reconciliation || await createReconciliationSnapshot({
        paymentIntentId: paymentId,
        userId: req.user.id,
        shippinginfo,
        pricing,
        paymentStatus: paymentIntent.status,
    });
    try {
      const order = await finalizeReconciliation(reconciliationRecord);
      res.status(201).json({ success: true, order });
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await Order.findOne({ "paymentinfo.id": paymentId, user: req.user.id });
        if (duplicate) return res.status(200).json({ success: true, order: duplicate });
        if (await Order.findOne({ "paymentinfo.id": paymentId })) {
          return res.status(404).json({ success: false, message: "Order not found." });
        }
      }

      return res.status(202).json({
        success: false,
        reconciliationRequired: true,
        message: "Payment received; order recovery is pending. Retry this request to complete the order.",
      });
    }
});

// ─── Get single order ─────────────────────────────────────────────────────────
export const getSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findOne({
        _id: req.params.id,
        user: req.user.id,
    }).populate("user", "name email");
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, order });
});

// ─── Get single order (Admin) ────────────────────────────────────────────────
export const getAdminSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, order });
});

// ─── Get all orders (Admin) ───────────────────────────────────────────────────
export const getAllOrders = catchAsyncErrors(async (req, res) => {
    const orders = await Order.find().populate("user", "name email");
    const totalAmount = orders.reduce((acc, order) => acc + order.totalprice, 0);
    res.status(200).json({ success: true, orders, totalAmount });
});

// ─── Update order status (Admin) ──────────────────────────────────────────────
export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }

    if (order.orderstatus === "delivered") {
        return next(new ErrorHandler("This order has already been delivered.", 400));
    }

    const allowedTransitions = { processing: "shipped", shipped: "delivered" };
    if (req.body.status !== allowedTransitions[order.orderstatus]) {
        return next(new ErrorHandler(`Invalid order status transition from ${order.orderstatus} to ${req.body.status}.`, 400));
    }

    const update = { $set: { orderstatus: req.body.status } };
    if (req.body.status === "delivered") update.$set.deliveredat = Date.now();

    // Re-check the observed status and deletion claim atomically. If deletion
    // claimed the order after the read above, this update must not win.
    const updatedOrder = await Order.findOneAndUpdate(
        { _id: req.params.id, orderstatus: order.orderstatus, deletionInProgress: { $ne: true } },
        update,
        { new: true, runValidators: false },
    );
    if (!updatedOrder) {
        return next(new ErrorHandler("The order is being deleted or has changed; retry the operation.", 409));
    }

    res.status(200).json({ success: true, order: updatedOrder });
});

// ─── Delete order (Admin) ─────────────────────────────────────────────────────
export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }
    if (order.orderstatus !== "processing") {
        return next(new ErrorHandler("Only processing orders can be deleted; shipped and delivered orders cannot be fulfilled by deletion.", 400));
    }

    // Claim before touching Product. This is the concurrency boundary: a
    // status update must observe deletionInProgress and fail, while a stale
    // delete request cannot claim an order that has already shipped.
    const claimed = await Order.findOneAndUpdate(
        { _id: req.params.id, orderstatus: "processing", deletionInProgress: { $ne: true } },
        { $set: { deletionInProgress: true } },
        { new: true, runValidators: false },
    );
    if (!claimed) return next(new ErrorHandler("The order is being deleted or has changed; retry the operation.", 409));

    try {
        // Release each marker atomically. The claim remains until all product
        // updates finish, so a failed release can be retried safely.
        await releaseOrderStock(claimed);
        const deleted = await Order.deleteOne({ _id: req.params.id, orderstatus: "processing", deletionInProgress: true });
        if (deleted.deletedCount !== 1) throw new ErrorHandler("The order changed while it was being deleted.", 409);
    } catch (error) {
        await Order.updateOne(
            { _id: req.params.id, deletionInProgress: true },
            { $set: { deletionInProgress: false } },
        );
        return next(error);
    }

    res.status(200).json({ success: true, message: "Order deleted successfully." });
});

// ─── Get logged-in user's orders ──────────────────────────────────────────────
export const myOrders = catchAsyncErrors(async (req, res) => {
    const orders = await Order.find({ user: req.user.id });
    res.status(200).json({ success: true, orders });
});

// ─── Sales data grouped by date (Admin dashboard) ────────────────────────────
export const totalAmountByDate = catchAsyncErrors(async (req, res) => {
    const amounts = await Order.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                },
                totalAmount: { $sum: "$totalprice" },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    res.status(200).json({ success: true, amounts });
});
