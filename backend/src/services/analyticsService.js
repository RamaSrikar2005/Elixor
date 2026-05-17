/**
 * src/services/analyticsService.js
 * Aggregates cross-domain data with a weighted productivity engine.
 *
 * Productivity Score (0-100) weighted formula:
 *   Task completion rate    → 35%
 *   Habit completion rate   → 30%
 *   Focus time (vs 4h goal) → 20%
 *   Streak bonus            → 10%
 *   Penalty for overdue     →  -5 per overdue task (capped at -20)
 */

import Task               from '../models/Task.js';
import Habit              from '../models/Habit.js';
import FocusSession       from '../models/FocusSession.js';
import FinanceTransaction from '../models/FinanceTransaction.js';
import AnalyticsSnapshot  from '../models/AnalyticsSnapshot.js';
import User               from '../models/User.js';
import { getLevelFromXP, getXPToNextLevel } from '../utils/constants.js';

/** Weighted productivity score — realistic, penalizes missed tasks/habits */
function calcProductivityScore({ tasksDone, tasksTotal, habitsChecked, habitsTotal, focusSeconds, streak, overdueCount }) {
  const taskRate  = tasksTotal  > 0 ? tasksDone   / tasksTotal  : 0;
  const habitRate = habitsTotal > 0 ? habitsChecked / habitsTotal : 0;
  const focusRate = Math.min(focusSeconds / (4 * 3600), 1); // 4h = 100%
  const streakBonus = Math.min(streak / 30, 1);             // 30-day streak = 100%

  const raw = (
    taskRate   * 35 +
    habitRate  * 30 +
    focusRate  * 20 +
    streakBonus * 10
  );

  // Overdue penalty: -5 per overdue task, max -20
  const penalty = Math.min(overdueCount * 5, 20);

  return Math.max(0, Math.min(100, Math.round(raw - penalty)));
}

export const getDashboard = async (userId) => {
  const user       = await User.findById(userId);
  const today      = _todayMidnight();
  const day14Ago   = new Date(today); day14Ago.setDate(day14Ago.getDate() - 14);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayStr   = today.toISOString().split('T')[0];

  // ─── Tasks ───────────────────────────────────────────────────
  const [taskStats] = await Task.aggregate([
    { $match: { user: userId } },
    { $group: {
      _id:      null,
      total:    { $sum: 1 },
      done:     { $sum: { $cond: ['$done', 1, 0] } },
      overdue:  { $sum: {
        $cond: [
          { $and: [
            { $eq: ['$done', false] },
            { $lt: ['$dueDate', new Date()] },
            { $ne: ['$dueDate', null] },
          ]},
          1, 0,
        ],
      }},
    }},
  ]);

  // ─── Habits ──────────────────────────────────────────────────
  const habits = await Habit.find({ user: userId, active: true });
  const habitsCheckedToday = habits.filter(h =>
    h.checkIns.some(c => c.date.toISOString().split('T')[0] === todayStr && c.done)
  ).length;

  // ─── Focus (today only for score, all-time for stats) ────────
  const [focusToday] = await FocusSession.aggregate([
    { $match: { user: userId, type: 'work', completed: true, startedAt: { $gte: today } } },
    { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' }, sessions: { $sum: 1 } } },
  ]);
  const [focusAllTime] = await FocusSession.aggregate([
    { $match: { user: userId, type: 'work', completed: true } },
    { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' }, sessions: { $sum: 1 } } },
  ]);

  // ─── Finance (this month) ────────────────────────────────────
  const [finStats] = await FinanceTransaction.aggregate([
    { $match: { user: userId, date: { $gte: monthStart } } },
    { $group: {
      _id:     null,
      income:  { $sum: { $cond: [{ $eq: ['$type', 'income']  }, '$amount', 0] } },
      expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
    }},
  ]);

  // ─── Finance by category ─────────────────────────────────────
  const finByCategory = await FinanceTransaction.aggregate([
    { $match: { user: userId, type: 'expense', date: { $gte: monthStart } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort:  { total: -1 } },
    { $project: { category: '$_id', total: 1, _id: 0 } },
  ]);

  // ─── Weighted productivity score ─────────────────────────────
  const productivityScore = calcProductivityScore({
    tasksDone:     taskStats?.done     || 0,
    tasksTotal:    taskStats?.total    || 0,
    habitsChecked: habitsCheckedToday,
    habitsTotal:   habits.length,
    focusSeconds:  focusToday?.totalSeconds || 0,
    streak:        user.streak || 0,
    overdueCount:  taskStats?.overdue  || 0,
  });

  // ─── 14-day trend (from snapshots) ───────────────────────────
  const snapshots = await AnalyticsSnapshot.find({
    user: userId,
    date: { $gte: day14Ago },
  }).sort({ date: 1 });

  // Append today's live score so the graph always has a current point
  const trendData = snapshots.map(s => ({
    date:              s.date,
    productivityScore: s.productivityScore,
    xpEarned:          s.xpEarned || 0,
    habitScore:        s.habitScore || 0,
  }));
  // Upsert today's live snapshot
  const todayInTrend = trendData.find(t => t.date.toISOString().split('T')[0] === todayStr);
  if (!todayInTrend) {
    trendData.push({
      date:              today,
      productivityScore,
      xpEarned:          0,
      habitScore:        habits.length > 0 ? Math.round((habitsCheckedToday / habits.length) * 100) : 0,
    });
  }

  return {
    user: {
      name:    user.name,
      level:   getLevelFromXP(user.xp),
      xp:      user.xp,
      xpToNext: getXPToNextLevel(user.xp),
      streak:  user.streak,
      rank:    user.rank,
    },
    tasks: {
      total:      taskStats?.total || 0,
      done:       taskStats?.done  || 0,
      overdue:    taskStats?.overdue || 0,
      completion: taskStats?.total > 0 ? `${Math.round((taskStats.done / taskStats.total) * 100)}%` : '0%',
    },
    habits: {
      total:        habits.length,
      checkedToday: habitsCheckedToday,
      avgStreak:    habits.reduce((s, h) => s + h.streak, 0) / (habits.length || 1),
    },
    focus: {
      totalHours:    ((focusAllTime?.totalSeconds || 0) / 3600).toFixed(1),
      totalSessions: focusAllTime?.sessions || 0,
      todayHours:    ((focusToday?.totalSeconds  || 0) / 3600).toFixed(1),
    },
    finance: {
      income:      finStats?.income  || 0,
      expense:     finStats?.expense || 0,
      savings:     (finStats?.income || 0) - (finStats?.expense || 0),
      savingsRate: finStats?.income > 0
        ? `${(((finStats.income - finStats.expense) / finStats.income) * 100).toFixed(1)}%`
        : '0%',
      byCategory:  finByCategory,
      topCategory: finByCategory[0]?.category || null,
    },
    scores: {
      productivity: productivityScore,
      habit: habits.length > 0 ? Math.round((habitsCheckedToday / habits.length) * 100) : 0,
    },
    trend: trendData,
  };
};

/** Write today's snapshot — call this after any productivity-affecting action */
export const writeSnapshot = async (userId) => {
  const today  = _todayMidnight();
  const todayStr = today.toISOString().split('T')[0];

  const [taskStats] = await Task.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, total: { $sum: 1 }, done: { $sum: { $cond: ['$done', 1, 0] } },
      overdue: { $sum: { $cond: [{ $and: [{ $eq: ['$done', false] }, { $lt: ['$dueDate', new Date()] }, { $ne: ['$dueDate', null] }] }, 1, 0] } }
    }},
  ]);

  const habits = await Habit.find({ user: userId, active: true });
  const habitsChecked = habits.filter(h =>
    h.checkIns.some(c => c.date.toISOString().split('T')[0] === todayStr && c.done)
  ).length;

  const [focusToday] = await FocusSession.aggregate([
    { $match: { user: userId, type: 'work', completed: true, startedAt: { $gte: today } } },
    { $group: { _id: null, totalSeconds: { $sum: '$durationSeconds' } } },
  ]);

  const user  = await User.findById(userId, 'streak');
  const score = calcProductivityScore({
    tasksDone:     taskStats?.done    || 0,
    tasksTotal:    taskStats?.total   || 0,
    habitsChecked,
    habitsTotal:   habits.length,
    focusSeconds:  focusToday?.totalSeconds || 0,
    streak:        user?.streak || 0,
    overdueCount:  taskStats?.overdue || 0,
  });

  await AnalyticsSnapshot.findOneAndUpdate(
    { user: userId, date: today },
    {
      tasksTotal:        taskStats?.total || 0,
      tasksDone:         taskStats?.done  || 0,
      habitsTotal:       habits.length,
      habitsChecked,
      productivityScore: score,
      habitScore:        habits.length > 0 ? Math.round((habitsChecked / habits.length) * 100) : 0,
    },
    { upsert: true, new: true }
  );
};

const _todayMidnight = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};
