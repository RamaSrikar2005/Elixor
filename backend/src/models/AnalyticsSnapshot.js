/**
 * src/models/AnalyticsSnapshot.js
 * Daily snapshot of user metrics — used for trend charts.
 */

import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: { type: Date, required: true }, // normalized to midnight UTC

    // Tasks
    tasksTotal:    { type: Number, default: 0 },
    tasksDone:     { type: Number, default: 0 },

    // Habits
    habitsTotal:   { type: Number, default: 0 },
    habitsChecked: { type: Number, default: 0 },

    // Focus
    focusMinutes:  { type: Number, default: 0 },
    focusSessions: { type: Number, default: 0 },

    // Finance
    incomeToday:   { type: Number, default: 0 },
    expenseToday:  { type: Number, default: 0 },

    // Scores (0-100)
    productivityScore: { type: Number, default: 0 },
    habitScore:        { type: Number, default: 0 },

    // XP
    xpEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One snapshot per user per day
analyticsSchema.index({ user: 1, date: -1 });
analyticsSchema.index({ user: 1, date: 1 }, { unique: true });

const AnalyticsSnapshot = mongoose.model('AnalyticsSnapshot', analyticsSchema);
export default AnalyticsSnapshot;
