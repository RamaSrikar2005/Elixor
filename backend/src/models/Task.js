/**
 * src/models/Task.js
 */

import mongoose from 'mongoose';
import { TASK_PRIORITIES, TASK_TAGS, XP_REWARDS } from '../utils/constants.js';

const taskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Task text is required'],
      trim: true,
      maxlength: 200,
    },
    tag: {
      type: String,
      enum: TASK_TAGS,
      default: 'Work',
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'medium',
    },
    xp: {
      type: Number,
      default: XP_REWARDS.TASK_COMPLETE,
      min: 0,
    },
    done: {
      type: Boolean,
      default: false,
    },
    completedAt: { type: Date, default: null },
    dueDate:     { type: Date, default: null },
    notes:       { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, done: 1 });
taskSchema.index({ user: 1, dueDate: 1 });

// Virtual: overdue check
taskSchema.virtual('isOverdue').get(function () {
  return !this.done && this.dueDate && this.dueDate < new Date();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
