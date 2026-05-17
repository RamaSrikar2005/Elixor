import asyncHandler from '../middleware/asyncHandler.js';
import * as financeService from '../services/financeService.js';
import { sendSuccess, paginateMeta } from '../utils/responseFormatter.js';

export const getTransactions = asyncHandler(async (req, res) => {
  const { transactions, total } = await financeService.getTransactions(req.user._id, req.query);
  sendSuccess(res, 200, 'Transactions fetched', transactions, paginateMeta(req.query.page || 1, req.query.limit || 50, total));
});

export const createTransaction = asyncHandler(async (req, res) => {
  const tx = await financeService.createTransaction(req.user._id, req.body);
  sendSuccess(res, 201, 'Transaction created', tx);
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const analytics = await financeService.getFinanceAnalytics(req.user._id, req.query);
  sendSuccess(res, 200, 'Finance analytics', analytics);
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  await financeService.deleteTransaction(req.user._id, req.params.id);
  sendSuccess(res, 200, 'Transaction deleted');
});
