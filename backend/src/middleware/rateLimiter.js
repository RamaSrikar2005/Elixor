/**
 * src/middleware/rateLimiter.js
 * express-rate-limit configurations.
 * Applied per-route or globally in server.js.
 */

import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 min

/** General API limiter */
export const apiLimiter = rateLimit({
  windowMs,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later' },
});

/** Strict auth limiter (login / register) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts — please wait 15 minutes' },
});

/** AI chat limiter */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min window
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI rate limit exceeded — slow down' },
});
