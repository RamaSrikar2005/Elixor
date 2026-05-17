/**
 * src/services/authService.js
 * Business logic for authentication — including OTP email verification.
 *
 * OTP flow:
 *   1. register()  → creates unverified user, generates OTP, returns it
 *   2. sendOtp()   → (re)generate OTP for an email address
 *   3. verifyOtp() → checks OTP, marks user verified, issues tokens
 *   4. login()     → blocked if !isVerified
 *
 * EMAIL SENDING:
 *   In development the OTP is returned in the API response (never do this in prod).
 *   Set EMAIL_USER + EMAIL_PASS in .env to enable real nodemailer sending.
 *   Supported services: Gmail, SendGrid SMTP, Mailgun SMTP, etc.
 */

import crypto    from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/generateToken.js';
import logger from '../utils/logger.js';

/* ─── Constants ───────────────────────────────────────────────── */
const OTP_TTL_MS      = 10 * 60 * 1000;  // 10 minutes
const OTP_RESEND_COOL = 60 * 1000;        // 60-second resend cooldown
const OTP_MAX_ATTEMPTS = 5;               // max wrong guesses before lockout
const IS_DEV = process.env.NODE_ENV !== 'production';

/* ─── Email transport ─────────────────────────────────────────── */
let _transport = null;

function getTransport() {
  if (_transport) return _transport;
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    _transport = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  } else {
    // Dev fallback — logs OTP to console, no real email sent
    _transport = null;
  }
  return _transport;
}

async function sendOtpEmail(email, otp, name) {
  const transport = getTransport();
  if (!transport) {
    logger.info(`[DEV] OTP for ${email}: ${otp}`);
    return; // OTP is included in API response in dev mode
  }
  try {
    await transport.sendMail({
      from:    `"ELIXOR" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Your ELIXOR verification code',
      html: `
        <div style="background:#010203;color:#f0f9ff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px">
          <div style="font-size:28px;font-weight:900;background:linear-gradient(135deg,#0ea5e9,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">ELIXOR</div>
          <div style="color:rgba(186,230,253,0.5);font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:24px">Powered by AURA.AI</div>
          <p style="color:rgba(186,230,253,0.7);margin-bottom:20px">Hi ${name}, your verification code is:</p>
          <div style="background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.3);border-radius:8px;padding:20px;text-align:center;font-size:36px;font-weight:bold;letter-spacing:12px;color:#0ea5e9;margin-bottom:20px">${otp}</div>
          <p style="color:rgba(186,230,253,0.5);font-size:12px">Valid for 10 minutes. Do not share this code with anyone.</p>
        </div>
      `,
    });
  } catch (e) {
    logger.error('Email send failed: ' + e.message);
  }
}

/* ─── OTP helpers ─────────────────────────────────────────────── */
function generateOtp() {
  return String(Math.floor(100000 + crypto.randomInt(900000))).padStart(6, '0');
}

/* ─── Services ────────────────────────────────────────────────── */
export const registerUser = async ({ name, email, password }) => {
  const exists = await User.findOne({ email });
  if (exists && exists.isVerified) {
    const err = new Error('Email already registered');
    err.statusCode = 409; throw err;
  }
  // Allow re-registration if previous attempt was unverified
  let user;
  if (exists && !exists.isVerified) {
    user = exists;
    user.name     = name;
    user.password = password;
  } else {
    user = new User({ name, email, password, isVerified: false });
  }

  const otp = generateOtp();
  user.otp         = otp;
  user.otpExpiry   = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSent = new Date();
  await user.save();

  await sendOtpEmail(email, otp, name);

  return {
    pendingVerification: true,
    email,
    // Only include OTP in non-production for developer testing
    ...(IS_DEV ? { devOtp: otp } : {}),
  };
};

export const sendOtp = async (email) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiry +otpLastSent +otpAttempts');
  if (!user) { const e = new Error('Email not found'); e.statusCode = 404; throw e; }
  if (user.isVerified) { const e = new Error('Email already verified'); e.statusCode = 400; throw e; }

  // Resend cooldown
  if (user.otpLastSent && Date.now() - user.otpLastSent.getTime() < OTP_RESEND_COOL) {
    const wait = Math.ceil((OTP_RESEND_COOL - (Date.now() - user.otpLastSent.getTime())) / 1000);
    const e = new Error(`Please wait ${wait}s before requesting a new code`);
    e.statusCode = 429; throw e;
  }

  const otp = generateOtp();
  user.otp         = otp;
  user.otpExpiry   = new Date(Date.now() + OTP_TTL_MS);
  user.otpAttempts = 0;
  user.otpLastSent = new Date();
  await user.save({ validateBeforeSave: false });

  await sendOtpEmail(email, otp, user.name);

  return { message: 'Verification code sent', ...(IS_DEV ? { devOtp: otp } : {}) };
};

export const verifyOtp = async (email, otp) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiry +otpAttempts +refreshToken');
  if (!user) { const e = new Error('Email not found'); e.statusCode = 404; throw e; }
  if (user.isVerified) { const e = new Error('Already verified'); e.statusCode = 400; throw e; }

  // Attempt limit
  if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
    const e = new Error('Too many incorrect attempts. Request a new code.');
    e.statusCode = 429; throw e;
  }

  // Expiry check
  if (!user.otpExpiry || Date.now() > user.otpExpiry.getTime()) {
    const e = new Error('Verification code expired. Request a new one.');
    e.statusCode = 410; throw e;
  }

  // OTP check
  if (user.otp !== String(otp).trim()) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
    const e = new Error(`Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    e.statusCode = 401; throw e;
  }

  // ✅ Correct — mark verified, clear OTP
  user.isVerified  = true;
  user.otp         = null;
  user.otpExpiry   = null;
  user.otpAttempts = 0;
  await user.updateStreak();

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken  = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user: sanitize(user), accessToken, refreshToken };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +refreshToken +isVerified');
  if (!user || !(await user.matchPassword(password))) {
    const err = new Error('Invalid email or password'); err.statusCode = 401; throw err;
  }
  if (!user.isVerified) {
    const err = new Error('Email not verified. Please verify your account first.');
    err.statusCode = 403;
    err.pendingVerification = true;
    err.email = email;
    throw err;
  }
  await user.updateStreak();
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken  = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { user: sanitize(user), accessToken, refreshToken };
};

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const refreshAccessToken = async (token) => {
  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    const err = new Error('Invalid refresh token'); err.statusCode = 401; throw err;
  }
  const newAccess  = generateAccessToken(user._id);
  const newRefresh = generateRefreshToken(user._id);
  user.refreshToken = newRefresh;
  await user.save({ validateBeforeSave: false });
  return { accessToken: newAccess, refreshToken: newRefresh };
};

const sanitize = (user) => ({
  _id:          user._id,
  name:         user.name,
  email:        user.email,
  role:         user.role,
  xp:           user.xp,
  streak:       user.streak,
  level:        user.level,
  rank:         user.rank,
  xpToNextLevel: user.xpToNextLevel,
  badges:       user.badges,
  isVerified:   user.isVerified,
  preferences:  user.preferences,
  createdAt:    user.createdAt,
});
