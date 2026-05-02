/**
 * Custom application error class.
 * Extends the native Error with an HTTP status code.
 */
class ErrorHandler extends Error {
    /**
     * @param {string} message - Human-readable error description
     * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
     */
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ErrorHandler;
