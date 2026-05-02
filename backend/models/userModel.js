import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please enter your name"],
            trim: true,
            maxlength: [30, "Name cannot exceed 30 characters"],
            minlength: [3, "Name must be at least 3 characters"],
        },
        email: {
            type: String,
            required: [true, "Please enter your email"],
            unique: true,
            lowercase: true,
            validate: [validator.isEmail, "Please enter a valid email address"],
        },
        password: {
            type: String,
            required: [true, "Please enter a password"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false, // Never returned in queries by default
        },
        avatar: {               // Fixed: was "avtar" (typo)
            public_id: { type: String, required: true },
            url: { type: String, required: true },
        },
        role: {
            type: String,
            enum: ["user", "admin", "master"],
            default: "user",
        },
        // ── Email verification ──
        isVerified: { type: Boolean, default: false },
        emailVerificationToken:   String,
        emailVerificationExpires: Date,

        // ── Password reset ──
        resetPasswordToken:   String,  // stored HASHED
        resetPasswordExpires: Date,

        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date },
    },
    { timestamps: true }
);

// ─── Hash password before saving ──────────────────────────────────────────────
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, Number(process.env.SALT) || 10);
    next();
});

// ─── Instance methods ─────────────────────────────────────────────────────────

/** Generate a signed JWT for this user. */
userSchema.methods.getJWT = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

/** Compare a plain-text password against the stored hash. */
userSchema.methods.comparePassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

/** Generate a password-reset token, hash it, and set a 15-minute expiry. */
userSchema.methods.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");

    this.resetPasswordToken   = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    return resetToken; // Return the plain token (sent to user via email)
};

// Generate email verification token
userSchema.methods.getEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken   = crypto.createHash("sha256").update(token).digest("hex");
  this.emailVerificationExpires = Date.now() +  60 * 60 * 500; // 30 min
  return token; // return raw
};

const User = mongoose.model("users", userSchema);

export default User;
