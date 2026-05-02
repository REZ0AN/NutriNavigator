/**
 * verifyEnv.js
 * ------------
 * Run this ONCE before starting the server to verify all third-party
 * API keys and service connections are working.
 *
 * Usage:
 *   node backend/scripts/verifyEnv.js
 *
 * Exits with code 0 if everything passes, code 1 if anything fails.
 */

import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import Stripe from "stripe";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

let allPassed = true;

function result(label, passed, detail = "") {
    if (!passed) allPassed = false;
    const icon = passed ? "  ✅ PASS" : "  ❌ FAIL";
    console.log(`${icon}  ${label}${detail ? `  →  ${detail}` : ""}`);
}

function section(title) {
    console.log(`\n─── ${title} ${"─".repeat(Math.max(0, 50 - title.length))}`);
}

// ─── 1. Required env vars ──────────────────────────────────────────────────────

section("Environment Variables");

const required = [
    "PORT", "NODE_ENV",
    "MONGODB_URI",
    "JWT_SECRET", "JWT_EXPIRE", "COOKIE_EXPIRE", "SALT",
    "CLOUDINARY_NAME", "CLOUDINARY_API", "CLOUDINARY_API_SECRET",
    "STRIPE_API_KEY", "STRIPE_SECRET_KEY",
    "SMTP_HOST", "SMTP_PORT", "SMTP_MAIL", "SMTP_PASS",
    "FRONT_END_URI",
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
    result("Required vars", false, `Missing: ${missing.join(", ")}`);
    console.log("\n  Cannot continue — fix missing variables in config.env first.\n");
    process.exit(1);
}

result("All required vars present", true);

if (process.env.JWT_SECRET.length < 32) {
    console.log(`  ℹ️  INFO  JWT_SECRET is only ${process.env.JWT_SECRET.length} chars — use at least 32 random characters.`);
}

// ─── 2. MongoDB ────────────────────────────────────────────────────────────────

section("MongoDB");

try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    result("MongoDB connection", true, mongoose.connection.host);
    await mongoose.disconnect();
} catch (err) {
    result("MongoDB connection", false, err.message);
}

// ─── 3. Cloudinary ────────────────────────────────────────────────────────────

section("Cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

try {
    const ping = await cloudinary.api.ping();
    result("Cloudinary credentials", ping.status === "ok", `cloud: ${process.env.CLOUDINARY_NAME}`);
} catch (err) {
    result("Cloudinary credentials", false, err.message);
}

// ─── 4. Stripe ────────────────────────────────────────────────────────────────

section("Stripe");

try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.account.retrieve();
    result("Stripe secret key", true, `account: ${account.id}`);
} catch (err) {
    result("Stripe secret key", false, err.message);
}

const pk = process.env.STRIPE_API_KEY;
const pkValid = pk.startsWith("pk_test_") || pk.startsWith("pk_live_");
result(
    "Stripe publishable key format",
    pkValid,
    pkValid ? pk.substring(0, 12) + "..." : "Must start with pk_test_ or pk_live_"
);

const skIsTest = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
const pkIsTest = pk.startsWith("pk_test_");
if (skIsTest !== pkIsTest) {
    console.log(`  ℹ️  INFO  Stripe key mismatch — secret is ${skIsTest ? "TEST" : "LIVE"} but publishable is ${pkIsTest ? "TEST" : "LIVE"}.`);
}

// ─── 5. SMTP ──────────────────────────────────────────────────────────────────

section("SMTP (Email)");

try {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASS,
        },
    });
    await transporter.verify();
    result("SMTP connection", true, `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
} catch (err) {
    result("SMTP connection", false, err.message);
    if (process.env.SMTP_HOST === "smtp.gmail.com") {
        console.log("  ℹ️  INFO  Gmail requires an App Password, not your account password.");
        console.log("           Generate one at: https://myaccount.google.com/apppasswords");
    }
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n" + "═".repeat(55));
if (allPassed) {
    console.log("  🎉  All checks passed. You're good to start the server.");
} else {
    console.log("  ⚠️   Some checks failed. Fix the issues above before starting.");
}
console.log("═".repeat(55) + "\n");

process.exit(allPassed ? 0 : 1);