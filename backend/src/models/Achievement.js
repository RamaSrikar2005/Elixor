/**
 * src/models/Achievement.js
 * Unlocked badges / achievements per user.
 */

import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key:   { type: String, required: true }, // e.g. 'streak_7'
    title: { type: String, required: true },
    emoji: { type: String, default: '🏅' },
    description: { type: String },
    xpBonus: { type: Number, default: 0 },
    unlockedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, key: 1 }, { unique: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
export default Achievement;
