import express from "express";
import { isAuthenticatedUser } from "../middlewares/authMiddleware.js";
import { processPayment, sendApiKey } from "../controllers/paymentController.js";

const router = express.Router();

/**
 * @swagger
 * /payment/webhook:
 *   post:
 *     summary: Receive signed Stripe payment events
 *     tags: [Payment]
 *     description: Public Stripe callback. The request is authenticated with the Stripe-Signature header, not a user JWT.
 *     parameters:
 *       - in: header
 *         name: Stripe-Signature
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event received
 *       400:
 *         description: Invalid Stripe signature
 */

/**
 * @swagger
 * /payment/process:
 *   post:
 *     summary: Create a Stripe PaymentIntent
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentProcessInput'
 *     responses:
 *       200:
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 client_secret:
 *                   type: string
 *                   description: Stripe client secret used by the frontend to confirm payment
 *                   example: pi_3NxK..._secret_abc123
 *                 pricing:
 *                   $ref: '#/components/schemas/CalculatedPricing'
 */
router.post("/payment/process", isAuthenticatedUser, processPayment);

/**
 * @swagger
 * /stripeapikey:
 *   get:
 *     summary: Get the Stripe publishable (public) API key
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Stripe publishable key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 apiKey:
 *                   type: string
 *                   description: Stripe publishable key (safe to expose to clients)
 *                   example: pk_test_51NxK...
 */
router.get("/stripeapikey", isAuthenticatedUser, sendApiKey);

export default router;
