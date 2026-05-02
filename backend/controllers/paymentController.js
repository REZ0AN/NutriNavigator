
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";

import Stripe from "stripe";

// Defer initialization to first request — guarantees env is loaded
let stripe;
const getStripe = () => {
    if (!stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("STRIPE_SECRET_KEY is not set in environment");
        }
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
};

export const processPayment = catchAsyncErrors(async (req, res, next) => {
    const myPayment = await getStripe().paymentIntents.create({
        amount: req.body.amount,
        currency: "inr",
        metadata: { company: "NutriNavigator" },
    });
    res.status(200).json({
        success: true,
        client_secret: myPayment.client_secret,
    });
});

export const sendApiKey = catchAsyncErrors(async (req, res, next) => {
    res.status(200).json({
        success: true,
        stripeApiKey: process.env.STRIPE_API_KEY,
    });
});