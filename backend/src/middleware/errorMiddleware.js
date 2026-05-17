/**
 * src/middleware/errorMiddleware.js
 * Global Express error handler.
 * Must be registered LAST in server.js (after all routes).
 */

import logger from '../utils/logger.js';

// 404 handler — registered before the error handler
export const notFound = (req, _res, next) => {
  const err = new Error(`Route not found: ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

// Centralized error handler
export const errorHandler = (err, req, res, next) => {
  // If headers already sent (e.g. SSE stream started), delegate to Express default
  if (res.headersSent) {
    return next(err);
  }
  // Normalize status code
  let statusCode = err.statusCode || err.status || 500;

  // Mongoose validation error → 400
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(statusCode).json({ success: false, message: 'Validation failed', errors });
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    return res.status(statusCode).json({ success: false, message: `${field} already exists` });
  }

  // JWT errors → 401
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    return res.status(statusCode).json({ success: false, message: 'Invalid or expired token' });
  }

  // Cast error (bad ObjectId) → 400
  if (err.name === 'CastError') {
    statusCode = 400;
    return res.status(statusCode).json({ success: false, message: `Invalid id: ${err.value}` });
  }

  // Log unexpected server errors
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path} — ${err.message}`, { stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
