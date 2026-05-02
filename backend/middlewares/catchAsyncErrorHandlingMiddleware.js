/**
 * Wraps an async Express route handler and forwards any rejected promise
 * to the next() error handler, avoiding try/catch boilerplate.
 *
 * @param {Function} fn - Async Express handler (req, res, next) => Promise
 * @returns {Function}  Standard Express middleware
 */
const catchAsyncErrors = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default catchAsyncErrors;
