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
