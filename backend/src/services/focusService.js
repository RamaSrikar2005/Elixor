/**
 * src/services/focusService.js
 */

import FocusSession from '../models/FocusSession.js';
import User         from '../models/User.js';
import { XP_REWARDS, FOCUS_WORK_DURATION } from '../utils/constants.js';

export const startSession = async (userId, { durationSeconds, type = 'work', taskId }) => {
  // Close any lingering open sessions
  await FocusSession.updateMany(
    { user: userId, endedAt: null },
    { endedAt: new Date(), completed: false }
  );

  const session = await FocusSession.create({
    user:            userId,
    task:            taskId || null,
    durationSeconds: durationSeconds || FOCUS_WORK_DURATION,
    type,
    startedAt:       new Date(),
  });

  return session;
};

export const endSession = async (userId, sessionId, { completed }) => {
  const session = await FocusSession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    const err = new Error('Session not found');
    err.statusCode = 404;
    throw err;
  }

  session.endedAt   = new Date();
  session.completed = completed ?? true;

  // Award XP for completed work sessions
  let xpAwarded = 0;
  if (session.completed && session.type === 'work') {
    const pomodorosCompleted = Math.floor(session.durationSeconds / FOCUS_WORK_DURATION);
    xpAwarded = Math.max(1, pomodorosCompleted) * XP_REWARDS.FOCUS_SESSION;
    session.xpAwarded = xpAwarded;
    await User.findByIdAndUpdate(userId, { $inc: { xp: xpAwarded } });
  }

  await session.save();
  return { session, xpAwarded };
};

export const getFocusStats = async (userId) => {
  const [stats] = await FocusSession.aggregate([
    { $match: { user: userId, completed: true, type: 'work' } },
    {
      $group: {
        _id: null,
        totalSessions:  { $sum: 1 },
        totalSeconds:   { $sum: '$durationSeconds' },
        totalXP:        { $sum: '$xpAwarded' },
      },
    },
  ]);
  return {
    totalSessions: stats?.totalSessions || 0,
    totalHours:    ((stats?.totalSeconds || 0) / 3600).toFixed(1),
    totalXP:       stats?.totalXP || 0,
  };
};
