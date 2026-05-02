import express from "express";
import { isAuthenticatedUser } from "../middlewares/authMiddleware.js";
import { processPayment, sendApiKey } from "../controllers/paymentController.js";

const router = express.Router();

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
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: integer
 *                 description: Amount in smallest currency unit (paisa for INR)
 *                 example: 14900
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
 *                   example: pi_3NxK...
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
