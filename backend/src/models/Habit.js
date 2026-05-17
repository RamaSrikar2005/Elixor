/**
 * src/models/Habit.js
 * Tracks habit definitions and their 30-day check-in log.
 */

import mongoose from 'mongoose';

const checkInSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const habitSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name:  { type: String, required: true, trim: true, maxlength: 80 },
    emoji: { type: String, default: '✅', maxlength: 4 },
    color: { type: String, default: '#0ea5e9' },
    active:{ type: Boolean, default: true },
    streak:{ type: Number, default: 0, min: 0 },
    bestStreak: { type: Number, default: 0, min: 0 },
    checkIns: [checkInSchema],
  },
  { timestamps: true }
);

habitSchema.index({ user: 1, active: 1 });

// Virtual: completion rate over last 30 days
habitSchema.virtual('completionRate').get(function () {
  const last30 = this.checkIns.slice(-30);
  if (!last30.length) return 0;
  return ((last30.filter((c) => c.done).length / last30.length) * 100).toFixed(1);
});

habitSchema.set('toJSON', { virtuals: true });
habitSchema.set('toObject', { virtuals: true });

const Habit = mongoose.model('Habit', habitSchema);
export default Habit;
