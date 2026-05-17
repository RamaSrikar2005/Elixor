/**
 * src/models/User.js
 * Core user document. Stores auth data, gamification stats, and preferences.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { RANKS, getLevelFromXP, getXPToNextLevel } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false,
    },

    // ─── Gamification ───────────────────────────
    xp: { type: Number, default: 0, min: 0 },
    streak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: Date, default: null },
    badges: [{ type: String }],

    // ─── Email verification ─────────────────────
    isVerified:  { type: Boolean, default: false },
    otp:         { type: String,  select: false, default: null },
    otpExpiry:   { type: Date,    select: false, default: null },
    otpAttempts: { type: Number,  default: 0 },
    otpLastSent: { type: Date,    default: null },

    // ─── Settings ───────────────────────────────
    preferences: {
      theme: { type: String, default: 'dark' },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      notifications: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });

// ─── Virtuals ───────────────────────────────────────
userSchema.virtual('level').get(function () {
  return getLevelFromXP(this.xp);
});
userSchema.virtual('xpToNextLevel').get(function () {
  return getXPToNextLevel(this.xp);
});
userSchema.virtual('rank').get(function () {
  const lvl = getLevelFromXP(this.xp);
  const idx = Math.min(Math.floor((lvl - 1) / 3), RANKS.length - 1);
  return RANKS[idx];
});

// ─── Hooks ──────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ─── Methods ────────────────────────────────────────
userSchema.methods.matchPassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.addXP = async function (amount) {
  this.xp += amount;
  return this.save();
};

userSchema.methods.updateStreak = async function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = this.lastActiveDate ? new Date(this.lastActiveDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  const diffDays = last ? (today - last) / (1000 * 60 * 60 * 24) : null;

  if (diffDays === 1) {
    this.streak += 1;
  } else if (diffDays !== 0) {
    this.streak = 1; // reset
  }
  this.lastActiveDate = today;
  return this.save();
};

const User = mongoose.model('User', userSchema);
export default User;
