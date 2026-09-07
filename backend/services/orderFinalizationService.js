import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import PaymentReconciliation from "../models/paymentReconciliationModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import { verifyPaymentIntent } from "./stripeService.js";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const RECOVERY_METADATA_PREFIX = "reconciliation_recovery_";
const RECOVERY_METADATA_CHUNK_SIZE = 450;
const FINALIZATION_LEASE_MS = 5 * 60 * 1000;
const RECONCILIATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const encodeRecoveryPayload = (payload) => deflateRawSync(Buffer.from(JSON.stringify(payload))).toString("base64url");

const decodeRecoveryPayload = (metadata = {}) => {
  const chunks = Object.keys(metadata)
    .filter((key) => new RegExp(`^${RECOVERY_METADATA_PREFIX}\\d+$`).test(key))
    .sort((a, b) => Number(a.slice(RECOVERY_METADATA_PREFIX.length)) - Number(b.slice(RECOVERY_METADATA_PREFIX.length)))
    .map((key) => metadata[key]);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(inflateRawSync(Buffer.from(chunks.join(""), "base64url")).toString("utf8"));
  } catch {
    throw new ErrorHandler("The payment recovery data is invalid.", 400);
  }
};

// Stripe metadata values are limited in size. Chunking the compressed snapshot
// keeps the webhook self-sufficient without putting checkout data in a URL or
// trusting the browser to resend it after payment.
export const buildReconciliationRecoveryMetadata = ({ userId, shippinginfo, pricing }) => {
  const encoded = encodeRecoveryPayload({ userId: userId.toString(), shippinginfo, pricing });
  const metadata = { reconciliation_recovery_version: "1" };
  for (let offset = 0, index = 0; offset < encoded.length; offset += RECOVERY_METADATA_CHUNK_SIZE, index += 1) {
    metadata[`${RECOVERY_METADATA_PREFIX}${index}`] = encoded.slice(offset, offset + RECOVERY_METADATA_CHUNK_SIZE);
  }
  return metadata;
};

export const recoverReconciliationSnapshot = async (paymentIntent) => {
  const payload = decodeRecoveryPayload(paymentIntent.metadata);
  if (!payload?.userId || !payload.shippinginfo || !payload.pricing?.items?.length) return null;
  return createReconciliationSnapshot({
    paymentIntentId: paymentIntent.id,
    userId: payload.userId,
    shippinginfo: payload.shippinginfo,
    pricing: payload.pricing,
    paymentStatus: paymentIntent.status || "succeeded",
  });
};

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

// Cancellation gets its own atomic claim so it cannot release a reservation
// while an active success webhook is finalizing the same PaymentIntent.
export const terminalizeReconciliation = async (reconciliation, { status = "canceled", paymentStatus = status } = {}) => {
  const claimed = await PaymentReconciliation.findOneAndUpdate(
    {
      _id: reconciliation._id,
      $or: [
        { status: { $in: ["pending", "recovered", "canceling"] } },
        { status: "finalizing", finalizingAt: { $lt: new Date(Date.now() - FINALIZATION_LEASE_MS) } },
      ],
    },
    { $set: { status: "canceling", paymentStatus, finalizingAt: null } },
    { new: true },
  );
  if (!claimed) return false;

  await releaseReservationSnapshot(claimed);
  await PaymentReconciliation.updateOne(
    { _id: claimed._id, status: "canceling" },
    { $set: { status, paymentStatus, stockReserved: false, finalizingAt: null } },
  );
  return true;
};

// A scheduled job or maintenance endpoint can call this function to close
// checkouts abandoned before a terminal Stripe event was delivered.
export const expireStaleReconciliations = async ({ now = new Date(), maxAgeMs = RECONCILIATION_MAX_AGE_MS } = {}) => {
  const stale = await PaymentReconciliation.find({
    status: { $in: ["pending", "recovered"] },
    createdAt: { $lt: new Date(now.getTime() - maxAgeMs) },
  });
  let expired = 0;
  for (const reconciliation of stale) {
    if (await terminalizeReconciliation(reconciliation, { status: "expired", paymentStatus: "expired" })) expired += 1;
  }
  return expired;
};

// Claiming is the concurrency boundary. MongoDB atomically changes one
// pending reconciliation to finalizing, so duplicate webhooks/browser retries
// cannot both perform reservation and order side effects.
export const claimReconciliation = async (reconciliation) => PaymentReconciliation.findOneAndUpdate(
  {
    _id: reconciliation._id,
    $or: [
      { status: { $in: ["pending", "recovered"] } },
      { status: "finalizing", finalizingAt: { $lt: new Date(Date.now() - FINALIZATION_LEASE_MS) } },
    ],
  },
  { $set: { status: "finalizing", finalizingAt: new Date() } },
  { new: true },
);

const findExistingOrder = (reconciliation) => Order.findOne({
  "paymentinfo.id": reconciliation.paymentIntentId,
  user: reconciliation.user,
});

const waitForConcurrentFinalizer = async (reconciliation) => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const existingOrder = await findExistingOrder(reconciliation);
    if (existingOrder) return existingOrder;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new ErrorHandler("This payment is already being finalized; retry shortly.", 409);
};

export const finalizeReconciliation = async (reconciliation) => {
  const claimed = await claimReconciliation(reconciliation);
  if (!claimed) return waitForConcurrentFinalizer(reconciliation);

  // Use the database document returned by the claim, rather than the stale
  // document read before the competing webhook acquired the claim.
  reconciliation = claimed;
  let newlyReservedItems = [];
  try {
    const amount = Math.round(reconciliation.totalprice * 100);
    const paymentIntent = await verifyPaymentIntent(reconciliation.paymentIntentId, amount, "inr");
    const existingOrder = await findExistingOrder(reconciliation);
    if (existingOrder) {
      await PaymentReconciliation.deleteOne({ _id: reconciliation._id });
      return existingOrder;
    }

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
    await PaymentReconciliation.updateOne(
      { _id: reconciliation._id, status: "finalizing" },
      { $set: { stockReserved: false, status: "pending", finalizingAt: null } },
    );
    if (error?.code === 11000) {
      const duplicate = await Order.findOne({ "paymentinfo.id": reconciliation.paymentIntentId, user: reconciliation.user });
      if (duplicate) return duplicate;
    }
    throw error;
  }
};
