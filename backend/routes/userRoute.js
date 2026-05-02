import express from "express";
import { body } from "express-validator";
import {
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    resetPassword,
    getUserDetails,
    updateUserPassword,
    updateUserDetails,
    getAllUsers,
    getSpecificUser,
    updateUser,
    deleteUser,
      verifyEmail,
  resendVerificationEmail,
} from "../controllers/userController.js";
import { isAuthenticatedUser, authorizeRoles } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimitMiddleware.js";

const router = express.Router();

// ─── Validation rules ─────────────────────────────────────────────────────────
const registerValidation = [
  body("name").trim().isLength({ min: 3, max: 30 }).withMessage("Name must be 3–30 characters"),
  body("email").isEmail().trim().toLowerCase().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
];

const loginValidation = [
  body("email").isEmail().trim().toLowerCase().withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];
const resetPasswordValidation = [
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
];

const updatePasswordValidation = [
    body("oldPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
    body("confirmPassword").notEmpty().withMessage("Confirm password is required"),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User registered. JWT cookie is set.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 user: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", authLimiter, registerValidation, registerUser);

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Log in and receive a JWT cookie
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful. JWT stored in httpOnly cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", authLimiter, loginValidation, loginUser);

/**
 * @swagger
 * /logout:
 *   get:
 *     summary: Log out and clear the JWT cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router.get("/logout", isAuthenticatedUser, logoutUser);

/**
 * @swagger
 * /password/forgot:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: john@example.com }
 *     responses:
 *       200:
 *         description: Reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       404:
 *         description: Email not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/password/forgot", authLimiter, forgotPassword);

/**
 * @swagger
 * /password/reset/{token}:
 *   put:
 *     summary: Reset password using the emailed token
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Reset token received via email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmPassword]
 *             properties:
 *               password: { type: string, minLength: 8, example: newpass123 }
 *               confirmPassword: { type: string, example: newpass123 }
 *     responses:
 *       200:
 *         description: Password reset. JWT cookie is refreshed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Token invalid/expired or passwords don't match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put("/password/reset/:token", resetPasswordValidation, resetPassword);

/**
 * @swagger
 * /profile:
 *   get:
 *     summary: Get the authenticated user's profile
 *     tags: [User]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 user: { $ref: '#/components/schemas/User' }
 */
router.get("/profile", isAuthenticatedUser, getUserDetails);

/**
 * @swagger
 * /password/update:
 *   put:
 *     summary: Change the authenticated user's password
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword, confirmPassword]
 *             properties:
 *               oldPassword: { type: string, example: oldpass123 }
 *               newPassword: { type: string, minLength: 8, example: newpass456 }
 *               confirmPassword: { type: string, example: newpass456 }
 *     responses:
 *       200:
 *         description: Password updated. JWT cookie refreshed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router.put("/password/update", isAuthenticatedUser, updatePasswordValidation, updateUserPassword);

/**
 * @swagger
 * /profile/update:
 *   put:
 *     summary: Update name, email, or avatar
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               avatar: { type: string, description: Base64 image string }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router.put("/profile/update", isAuthenticatedUser, updateUserDetails);

/**
 * @swagger
 * /admin/userprofiles:
 *   get:
 *     summary: Get all users (Admin)
 *     tags: [Admin - Users]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count: { type: integer }
 *                 users:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 */
router.get("/admin/userprofiles", isAuthenticatedUser, authorizeRoles("admin", "master"), getAllUsers);

/**
 * @swagger
 * /admin/userprofile/{id}:
 *   get:
 *     summary: Get a specific user (Admin)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Update a user's role or details (Master only)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [user, admin, master] }
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *   delete:
 *     summary: Delete a user and their avatar (Master only)
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router
    .route("/admin/userprofile/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin", "master"), getSpecificUser)
    .put(isAuthenticatedUser, authorizeRoles("master"), updateUser)
    .delete(isAuthenticatedUser, authorizeRoles("master"), deleteUser);


router.get("/verify-email/:token", authLimiter, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerificationEmail);
export default router;
