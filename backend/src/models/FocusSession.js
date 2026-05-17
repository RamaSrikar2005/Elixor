/**
 * src/models/FocusSession.js
 */

import mongoose from 'mongoose';

const focusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    durationSeconds: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: ['work', 'break'],
      default: 'work',
    },
    completed: { type: Boolean, default: false },
    startedAt:  { type: Date, required: true },
    endedAt:    { type: Date, default: null },
    xpAwarded:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

focusSchema.index({ user: 1, startedAt: -1 });

// Virtual: actual elapsed time in seconds
focusSchema.virtual('elapsedSeconds').get(function () {
  if (!this.endedAt) return null;
  return Math.floor((this.endedAt - this.startedAt) / 1000);
});

focusSchema.set('toJSON', { virtuals: true });
focusSchema.set('toObject', { virtuals: true });

const FocusSession = mongoose.model('FocusSession', focusSchema);
export default FocusSession;
