import ErrorHandler from "../utils/errorHandler.js";

/**
 * Global Express error-handling middleware.
 * Normalises common Mongoose and JWT errors into clean HTTP responses.
 * In production, the stack trace is omitted from the response.
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message    = err.message    || "Internal Server Error";

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};

export default errorHandler;
