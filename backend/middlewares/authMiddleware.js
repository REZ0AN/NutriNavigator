import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "./catchAsyncErrorHandlingMiddleware.js";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/**
 * Middleware: verify the JWT from the httpOnly cookie.
 * Attaches the authenticated user to `req.user`.
 */
export const isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.cookies;

    if (!token) {
        return next(new ErrorHandler("Please log in to access this resource.", 401));
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return next(new ErrorHandler("Please log in to access this resource.", 401));
    }
    req.user = await User.findById(decoded.id);

    if (!req.user) {
        return next(new ErrorHandler("User belonging to this token no longer exists.", 401));
    }

    if ((decoded.tokenVersion ?? 0) !== (req.user.tokenVersion ?? 0)) {
        return next(new ErrorHandler("Please log in to access this resource.", 401));
    }

    next();
});

/**
 * Middleware factory: restrict access to specific roles.
 * Must be used after `isAuthenticatedUser`.
 *
 * @param {...string} roles - Allowed role names (e.g. "admin", "master")
 */
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ErrorHandler(
                    `Role '${req.user.role}' is not authorised to access this resource.`,
                    403  // 403 Forbidden (not 401 Unauthorized)
                )
            );
        }
        next();
    };
};
