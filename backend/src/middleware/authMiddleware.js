/**
 * src/middleware/authMiddleware.js
 * Verifies JWT access token from Authorization header.
 * Attaches req.user for downstream handlers.
 */

import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';
import asyncHandler from './asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    const err = new Error('Not authorized — no token');
    err.statusCode = 401;
    return next(err);
  }

  const decoded = verifyAccessToken(token); // throws if invalid/expired
  const user = await User.findById(decoded.id).select('-password -refreshToken');

  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 401;
    return next(err);
  }

  req.user = user;
  next();
});

/**
 * Restrict route to specific roles.
 * Usage: router.get('/admin', protect, restrictTo('admin'))
 */
export const restrictTo = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      const err = new Error('Access denied — insufficient permissions');
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
