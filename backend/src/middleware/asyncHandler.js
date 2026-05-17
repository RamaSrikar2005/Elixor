/**
 * src/middleware/asyncHandler.js
 * Wraps async route handlers so we never need try/catch in controllers.
 * Any thrown error is forwarded to the global error handler.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
