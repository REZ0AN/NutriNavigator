import Stripe from "stripe";
import { createHash } from "node:crypto";
import ErrorHandler from "../utils/errorHandler.js";

let stripe;
export const getStripe = () => {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set in environment");
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};

export const getScopedIdempotencyKey = (userId, clientKey) => createHash("sha256")
  .update(`${userId}:${clientKey}`)
  .digest("hex");

export const verifyPaymentIntent = async (paymentId, amount, currency) => {
  if (!paymentId) throw new ErrorHandler("A Stripe PaymentIntent is required.", 400);
  let paymentIntent;
  try {
    paymentIntent = await getStripe().paymentIntents.retrieve(paymentId);
  } catch (error) {
    throw new ErrorHandler("Unable to verify the Stripe payment.", 400);
  }
  if (paymentIntent.status !== "succeeded" || paymentIntent.amount !== amount || paymentIntent.currency !== currency) {
    throw new ErrorHandler("The Stripe payment does not match this order.", 400);
  }
  return paymentIntent;
};

export const refundPaymentIntent = async (paymentId, idempotencyKey) => {
  if (!paymentId) throw new ErrorHandler("A Stripe PaymentIntent is required for a refund.", 400);
  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: paymentId },
      { idempotencyKey },
    );
    if (refund.status !== "succeeded") {
      throw new ErrorHandler("The Stripe refund has not completed.", 503);
    }
    return refund;
  } catch (error) {
    if (error instanceof ErrorHandler) throw error;
    throw new ErrorHandler("Unable to refund the Stripe payment.", 503);
  }
};
