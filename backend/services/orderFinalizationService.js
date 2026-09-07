import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import PaymentReconciliation from "../models/paymentReconciliationModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { verifyPaymentIntent } from "./stripeService.js";

const releaseStock = async (items, reservationId) => Promise.all(items.map((item) => Product.updateOne(
  { _id: item.product },
  { $inc: { stock: item.quantity }, $pull: { stockReservations: { reservationId } } }
)));

const reserveStock = async (items, reservationId) => {
  const newlyReserved = [];
  try {
    for (const item of items) {
      const existing = await Product.findOne({ _id: item.product, stockReservations: { $elemMatch: { reservationId } } });
      if (existing) {
        const reservation = existing.stockReservations.find(({ reservationId: id }) => id === reservationId);
        if (reservation.quantity !== item.quantity) throw new ErrorHandler("Payment reservation does not match this order.", 409);
        continue;
      }
      const product = await Product.findOneAndUpdate(
        { _id: item.product, stock: { $gte: item.quantity }, stockReservations: { $not: { $elemMatch: { reservationId } } } },
        { $inc: { stock: -item.quantity }, $push: { stockReservations: { reservationId, quantity: item.quantity } } },
        { new: true }
      );
      if (!product) throw new ErrorHandler(`Insufficient stock for ${item.name}.`, 409);
      newlyReserved.push(item);
    }
    return newlyReserved;
  } catch (error) {
    await releaseStock(newlyReserved, reservationId);
    throw error;
  }
};

export const createReconciliationSnapshot = async ({ paymentIntentId, userId, shippinginfo, pricing, paymentStatus = "requires_payment_method" }) =>
  PaymentReconciliation.findOneAndUpdate(
    { paymentIntentId },
    {
      $setOnInsert: {
        paymentIntentId,
        user: userId,
        shippinginfo,
        orderitems: pricing.items,
        itemsprice: pricing.itemsprice,
        tax: pricing.tax,
        shippingcost: pricing.shippingcost,
        totalprice: pricing.totalprice,
        paymentStatus,
        stockReserved: false,
        status: "pending",
      },
    },
    { upsert: true, new: true }
  );

export const releaseReservationSnapshot = async (snapshot) => {
  const reservationId = snapshot.paymentIntentId || snapshot.paymentinfo?.id;
  for (const item of snapshot.orderitems || []) {
    let result;
    try {
      result = await Product.updateOne(
        { _id: item.product, stockReservations: { $elemMatch: { reservationId, quantity: item.quantity } } },
        { $inc: { stock: item.quantity }, $pull: { stockReservations: { reservationId } } }
      );
    } catch (error) {
      throw new ErrorHandler("Unable to release all reserved inventory.", 503);
    }
    if ((result?.modifiedCount ?? result?.nModified ?? 0) > 0) continue;
    const product = await Product.findOne({ _id: item.product });
    if (product?.stockReservations?.some(({ reservationId: id }) => id === reservationId)) {
      throw new ErrorHandler("Unable to release all reserved inventory.", 503);
    }
  }
};

export const releaseOrderStock = releaseReservationSnapshot;

export const finalizeReconciliation = async (reconciliation) => {
  const amount = Math.round(reconciliation.totalprice * 100);
  const paymentIntent = await verifyPaymentIntent(reconciliation.paymentIntentId, amount, "inr");
  const existingOrder = await Order.findOne({ "paymentinfo.id": reconciliation.paymentIntentId, user: reconciliation.user });
  if (existingOrder) {
    await PaymentReconciliation.deleteOne({ _id: reconciliation._id });
    return existingOrder;
  }

  let newlyReservedItems = [];
  try {
    newlyReservedItems = await reserveStock(reconciliation.orderitems, reconciliation.paymentIntentId);
    await PaymentReconciliation.updateOne({ _id: reconciliation._id }, { $set: { stockReserved: true, paymentStatus: "succeeded" } });
    const order = await Order.create({
      shippinginfo: reconciliation.shippinginfo,
      orderitems: reconciliation.orderitems,
      paymentinfo: { id: paymentIntent.id, status: paymentIntent.status },
      itemsprice: reconciliation.itemsprice,
      tax: reconciliation.tax,
      shippingcost: reconciliation.shippingcost,
      totalprice: reconciliation.totalprice,
      paidat: Date.now(),
      user: reconciliation.user,
      stockReserved: true,
    });
    await PaymentReconciliation.deleteOne({ _id: reconciliation._id });
    return order;
  } catch (error) {
    if (newlyReservedItems.length > 0) await releaseStock(newlyReservedItems, reconciliation.paymentIntentId);
    await PaymentReconciliation.updateOne({ _id: reconciliation._id }, { $set: { stockReserved: false } });
    if (error?.code === 11000) {
      const duplicate = await Order.findOne({ "paymentinfo.id": reconciliation.paymentIntentId, user: reconciliation.user });
      if (duplicate) return duplicate;
    }
    throw error;
  }
};
