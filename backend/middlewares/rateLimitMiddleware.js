import rateLimit from "express-rate-limit";

/**
 * Global rate limiter — applied to all routes.
 * 20 requests per 15 minutes per IP.
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
});

/**
 * Auth rate limiter — applied to login, register, forgot-password, verify email, resend verify email, diet recommender
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many auth attempts, please try again later." },
});