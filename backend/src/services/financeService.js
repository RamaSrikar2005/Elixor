/**
 * src/services/financeService.js
 */

import FinanceTransaction from '../models/FinanceTransaction.js';

export const getTransactions = async (userId, { page = 1, limit = 50, type, category, month }) => {
  const query = { user: userId };
  if (type)     query.type     = type;
  if (category) query.category = category;
  if (month) {
    const start = new Date(month + '-01');
    const end   = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    query.date  = { $gte: start, $lte: end };
  }
  const skip  = (page - 1) * limit;
  const total = await FinanceTransaction.countDocuments(query);
  const transactions = await FinanceTransaction.find(query)
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));
  return { transactions, total };
};

export const createTransaction = async (userId, data) => {
  return FinanceTransaction.create({ user: userId, ...data });
};

export const deleteTransaction = async (userId, txId) => {
  const tx = await FinanceTransaction.findOneAndDelete({ _id: txId, user: userId });
  if (!tx) { const e = new Error('Transaction not found'); e.statusCode = 404; throw e; }
  return tx;
};

export const getFinanceAnalytics = async (userId, { month }) => {
  const start = month
    ? new Date(month + '-01')
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

  const [summary] = await FinanceTransaction.aggregate([
    { $match: { user: userId, date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: null,
        totalIncome:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
        totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        count: { $sum: 1 },
      },
    },
  ]);

  const byCategory = await FinanceTransaction.aggregate([
    { $match: { user: userId, type: 'expense', date: { $gte: start, $lte: end } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort:  { total: -1 } },
  ]);

  const income  = summary?.totalIncome  || 0;
  const expense = summary?.totalExpense || 0;
  return {
    period: { start, end },
    income,
    expense,
    savings: income - expense,
    savingsRate: income > 0 ? (((income - expense) / income) * 100).toFixed(1) : 0,
    byCategory: byCategory.map((c) => ({ category: c._id, total: c.total })),
  };
};
