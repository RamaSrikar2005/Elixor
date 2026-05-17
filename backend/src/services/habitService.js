/**
 * src/services/habitService.js
 */

import Habit from '../models/Habit.js';
import User  from '../models/User.js';
import { XP_REWARDS } from '../utils/constants.js';

export const getHabits = async (userId) => {
  return Habit.find({ user: userId, active: true }).sort({ createdAt: 1 });
};

export const createHabit = async (userId, data) => {
  return Habit.create({ user: userId, ...data });
};

export const updateHabit = async (userId, habitId, data) => {
  const habit = await Habit.findOne({ _id: habitId, user: userId });
  if (!habit) {
    const err = new Error('Habit not found');
    err.statusCode = 404;
    throw err;
  }
  Object.assign(habit, data);
  return habit.save();
};

export const trackHabit = async (userId, habitId, { date, done }) => {
  const habit = await Habit.findOne({ _id: habitId, user: userId });
  if (!habit) {
    const err = new Error('Habit not found');
    err.statusCode = 404;
    throw err;
  }

  // Normalize date to midnight UTC
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);

  const existingIdx = habit.checkIns.findIndex(
    (c) => c.date.toISOString().split('T')[0] === d.toISOString().split('T')[0]
  );

  if (existingIdx >= 0) {
    habit.checkIns[existingIdx].done = done;
  } else {
    habit.checkIns.push({ date: d, done });
  }

  // Recalculate streak
  habit.streak = _calculateStreak(habit.checkIns);
  if (habit.streak > habit.bestStreak) habit.bestStreak = habit.streak;

  await habit.save();

  // Award XP if checking in today
  let xpAwarded = 0;
  const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  if (done && isToday) {
    await User.findByIdAndUpdate(userId, { $inc: { xp: XP_REWARDS.HABIT_CHECK } });
    xpAwarded = XP_REWARDS.HABIT_CHECK;
  }

  return { habit, xpAwarded };
};

function _calculateStreak(checkIns) {
  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  let prev = null;
  for (const ci of sorted) {
    if (!ci.done) break;
    if (prev === null) {
      streak = 1;
    } else {
      const diffDays = (new Date(prev) - new Date(ci.date)) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    prev = ci.date;
  }
  return streak;
}
