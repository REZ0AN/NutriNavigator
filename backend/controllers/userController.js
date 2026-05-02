import User from "../models/userModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import { sendToken } from "../utils/getJWTToken.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { validationResult } from "express-validator";
import {
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from "../utils/emailTemplates.js";
// ─── Helper ───────────────────────────────────────────────────────────────────
const handleValidationErrors = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new ErrorHandler(messages, 400));
  }
};

// ── Register — send verification email, don't log in yet ──────────────────────
export const registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, avatar } = req.body;

  // Check duplicate email
  const existing = await User.findOne({ email });
  if (existing) return next(new ErrorHandler("Email already registered", 400));

  // Upload avatar
  const myCloud = await cloudinary.uploader.upload(avatar, {
    folder: "avatars",
    width: 150,
    crop: "scale",
  });

  // Create user — NOT verified yet
  const user = await User.create({
    name,
    email,
    password,
    avatar: { public_id: myCloud.public_id, url: myCloud.secure_url },
    isVerified: false,
  });

  // Generate verification token
  const rawToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.FRONT_END_URI}/verify-email/${rawToken}`;

  await sendEmail({
    email: user.email,
    subject: "NutriNavigator — Verify your email",
    html: verificationEmailTemplate(user.name, verifyUrl),
  });

  res.status(201).json({
    success: true,
    message: `Verification email sent to ${user.email}. Please check your inbox.`,
  });
});

export const verifyEmail = catchAsyncErrors(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user)
    return next(
      new ErrorHandler("Verification link is invalid or has expired", 400),
    );

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  // Log them in automatically after verifying
  sendToken(user, 200, res);
});

export const resendVerificationEmail = catchAsyncErrors(
  async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user || user.isVerified) {
      // Don't reveal whether the email exists or is already verified
      return res.status(200).json({
        success: true,
        message:
          "If that email exists and is unverified, a new link has been sent.",
      });
    }

    const rawToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONT_END_URI}/verify-email/${rawToken}`;

    await sendEmail({
      email: user.email,
      subject: "NutriNavigator — Verify your email",
      html: verificationEmailTemplate(user.name, verifyUrl),
    });

    res
      .status(200)
      .json({ success: true, message: "Verification email resent." });
  },
);

export const loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new ErrorHandler("Please enter email and password", 400));

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ErrorHandler("Invalid email or password", 401));
  
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    return next(new ErrorHandler(`Account locked. Try again in ${minutesLeft} minutes.`, 423));
  } 

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000; // lock for 15 min
      user.failedLoginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // Block login if not verified
  if (!user.isVerified) {
    return next(
      new ErrorHandler(
        "Please verify your email before logging in. Check your inbox or request a new verification email.",
        403,
      ),
    );
  }
  // Reset on successful login
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });

  sendToken(user, 200, res);
});

// ─── Logout ───────────────────────────────────────────────────────────────────
export const logoutUser = catchAsyncErrors(async (req, res) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });

  res.status(200).json({ success: true, message: "Logged out successfully." });
});

// ── Forgot password — use hashed token ───────────────────────────────────────
export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new ErrorHandler("No account found with that email", 404));

  const rawToken = user.getResetPasswordToken(); // stores hashed, returns raw
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONT_END_URI}/password/reset/${rawToken}`;

  await sendEmail({
    email: user.email,
    subject: "NutriNavigator — Password Reset",
    html: passwordResetEmailTemplate(user.name, resetUrl),
  });

  res
    .status(200)
    .json({ success: true, message: `Reset email sent to ${user.email}` });
});

// ── Reset password — compare against hashed token ────────────────────────────
export const resetPassword = catchAsyncErrors(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user)
    return next(new ErrorHandler("Reset link is invalid or has expired", 400));

  if (req.body.password !== req.body.confirmPassword)
    return next(new ErrorHandler("Passwords do not match", 400));

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  sendToken(user, 200, res);
});

// ─── Get own profile ──────────────────────────────────────────────────────────
export const getUserDetails = catchAsyncErrors(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, user });
});

// ─── Update own password ──────────────────────────────────────────────────────
export const updateUserPassword = catchAsyncErrors(async (req, res, next) => {
  if (handleValidationErrors(req, next)) return;

  const user = await User.findById(req.user.id).select("+password");

  const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Current password is incorrect.", 401));
  }

  if (req.body.newPassword !== req.body.confirmPassword) {
    return next(new ErrorHandler("New passwords do not match.", 400));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendToken(user, 200, res);
});

// ─── Update own profile ───────────────────────────────────────────────────────
export const updateUserDetails = catchAsyncErrors(async (req, res, next) => {
  const { name, email, avatar } = req.body;

  const updatedData = { name, email };

  if (avatar && avatar !== "") {
    const existingUser = await User.findById(req.user.id);
    await cloudinary.uploader.destroy(existingUser.avatar.public_id);

    const myCloud = await cloudinary.uploader.upload(avatar, {
      folder: "avatars",
      width: 250,
      crop: "scale",
    });

    updatedData.avatar = {
      // Fixed: was "avtar"
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  }

  await User.findByIdAndUpdate(req.user.id, updatedData, {
    new: true,
    runValidators: true,
  });

  res
    .status(200)
    .json({ success: true, message: "Profile updated successfully." });
});

// ─── Admin: get all users ─────────────────────────────────────────────────────
export const getAllUsers = catchAsyncErrors(async (req, res) => {
  const users = await User.find();
  res.status(200).json({ success: true, count: users.length, users });
});

// ─── Admin: get single user ───────────────────────────────────────────────────
export const getSpecificUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with id: ${req.params.id}`, 404),
    );
  }
  res.status(200).json({ success: true, user });
});

// ─── Admin: update user role ──────────────────────────────────────────────────
export const updateUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with id: ${req.params.id}`, 404),
    );
  }

  const updatedData = {
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
  };

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updatedData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, user: updatedUser });
});

// ─── Admin: delete user ───────────────────────────────────────────────────────
export const deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(
      new ErrorHandler(`No user found with id: ${req.params.id}`, 404),
    );
  }

  await cloudinary.uploader.destroy(user.avatar.public_id); // Fixed: was "avtar"
  await User.deleteOne({ _id: req.params.id });

  res
    .status(200)
    .json({ success: true, message: "User deleted successfully." });
});
