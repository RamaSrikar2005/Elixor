/**
 * src/models/FinanceTransaction.js
 */

import mongoose from 'mongoose';
import { FINANCE_CATEGORIES } from '../utils/constants.js';

const financeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be positive'],
    },
    category: {
      type: String,
      enum: FINANCE_CATEGORIES,
      default: 'Other',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    emoji: { type: String, default: '💸', maxlength: 4 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

financeSchema.index({ user: 1, date: -1 });
financeSchema.index({ user: 1, type: 1 });
financeSchema.index({ user: 1, category: 1 });

const FinanceTransaction = mongoose.model('FinanceTransaction', financeSchema);
export default FinanceTransaction;
