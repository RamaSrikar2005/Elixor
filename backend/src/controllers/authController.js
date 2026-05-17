/**
 * src/controllers/authController.js
 */

import asyncHandler from '../middleware/asyncHandler.js';
import * as authService from '../services/authService.js';
import { sendSuccess } from '../utils/responseFormatter.js';
import { setRefreshCookie, clearRefreshCookie } from '../utils/generateToken.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  // Registration now returns pendingVerification — no cookie yet
  sendSuccess(res, 201, 'Verification code sent to your email', result);
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) { const e = new Error('Email required'); e.statusCode = 400; throw e; }
  const result = await authService.sendOtp(email);
  sendSuccess(res, 200, result.message, result);
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) { const e = new Error('Email and OTP required'); e.statusCode = 400; throw e; }
  const result = await authService.verifyOtp(email, otp);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, 200, 'Email verified — welcome to ELIXOR!', {
    user:        result.user,
    accessToken: result.accessToken,
  });
});

export const login = asyncHandler(async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);
    setRefreshCookie(res, result.refreshToken);
    sendSuccess(res, 200, 'Login successful', {
      user:        result.user,
      accessToken: result.accessToken,
    });
  } catch (err) {
    // Special case: unverified user trying to log in → tell frontend to show OTP screen
    if (err.pendingVerification) {
      res.status(403).json({
        success: false,
        message: err.message,
        pendingVerification: true,
        email: err.email,
      });
      return;
    }
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  clearRefreshCookie(res);
  sendSuccess(res, 200, 'Logged out successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) { const err = new Error('No refresh token'); err.statusCode = 401; throw err; }
  const result = await authService.refreshAccessToken(token);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, 200, 'Token refreshed', { accessToken: result.accessToken });
});

export const getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, 'User profile', req.user);
});
