/**
 * studyService.js — Business logic for study sessions and subject management.
 * XP rewards: study=20/hr, revision=15/hr, practice=25/hr, mock_test=40/session
 */
import Subject      from '../models/Subject.js';
import StudySession from '../models/StudySession.js';
import User         from '../models/User.js';

const XP_PER_STUDY_MIN = { study: 0.33, revision: 0.25, practice: 0.42, mock_test: 40 };

// ─── Subjects ────────────────────────────────────────────────────────────────
export const getSubjects = (userId) =>
  Subject.find({ user: userId, active: true }).sort({ priority: -1, createdAt: -1 });

export const createSubject = (userId, data) =>
  Subject.create({ user: userId, ...data });

export const updateSubject = async (userId, subjectId, data) => {
  const sub = await Subject.findOne({ _id: subjectId, user: userId });
  if (!sub) { const e = new Error('Subject not found'); e.statusCode = 404; throw e; }
  Object.assign(sub, data);
  return sub.save();
};

export const deleteSubject = async (userId, subjectId) => {
  const sub = await Subject.findOneAndUpdate(
    { _id: subjectId, user: userId },
    { active: false },
    { new: true }
  );
  if (!sub) { const e = new Error('Subject not found'); e.statusCode = 404; throw e; }
  return sub;
};

// ─── Sessions ────────────────────────────────────────────────────────────────
export const startSession = async (userId, { subjectId, type = 'study', difficulty = 'medium', notes }) => {
  const sub = await Subject.findOne({ _id: subjectId, user: userId });
  if (!sub) { const e = new Error('Subject not found'); e.statusCode = 404; throw e; }

  // Close any lingering open sessions
  await StudySession.updateMany(
    { user: userId, endedAt: null },
    { endedAt: new Date(), completed: false }
  );

  return StudySession.create({
    user: userId, subject: subjectId,
    subjectName: sub.name, type, difficulty, notes: notes || null,
    startedAt: new Date(),
  });
};

export const endSession = async (userId, sessionId, { score, notes } = {}) => {
  const session = await StudySession.findOne({ _id: sessionId, user: userId });
  if (!session) { const e = new Error('Session not found'); e.statusCode = 404; throw e; }

  const endedAt  = new Date();
  const duration = Math.max(1, Math.round((endedAt - session.startedAt) / 60000)); // minutes
  const xpRate   = XP_PER_STUDY_MIN[session.type] || 0.33;
  const xp       = session.type === 'mock_test' ? 40 : Math.round(duration * xpRate);

  session.endedAt   = endedAt;
  session.duration  = duration;
  session.completed = true;
  session.xpAwarded = xp;
  if (score  != null) session.score = score;
  if (notes)          session.notes = notes;
  await session.save();

  // Update subject studied hours and mastery
  const hoursAdded = duration / 60;
  await Subject.findByIdAndUpdate(session.subject, {
    $inc: { studiedHours: hoursAdded },
  });

  // Update mastery based on score if test, else small increment
  if (score != null) {
    await Subject.findByIdAndUpdate(session.subject, { mastery: score });
  }

  // Award XP
  await User.findByIdAndUpdate(userId, { $inc: { xp } });

  return { session, xpAwarded: xp, duration };
};

// ─── Stats ───────────────────────────────────────────────────────────────────
export const getStats = async (userId) => {
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today); weekStart.setDate(weekStart.getDate() - 6);

  const [todayStats]  = await StudySession.aggregate([
    { $match: { user: userId, completed: true, startedAt: { $gte: today } } },
    { $group: { _id: null, totalMin: { $sum: '$duration' }, sessions: { $sum: 1 }, totalXP: { $sum: '$xpAwarded' } } },
  ]);

  const [weekStats] = await StudySession.aggregate([
    { $match: { user: userId, completed: true, startedAt: { $gte: weekStart } } },
    { $group: { _id: null, totalMin: { $sum: '$duration' }, sessions: { $sum: 1 } } },
  ]);

  const subjectBreakdown = await StudySession.aggregate([
    { $match: { user: userId, completed: true, startedAt: { $gte: weekStart } } },
    { $group: { _id: '$subjectName', totalMin: { $sum: '$duration' }, sessions: { $sum: 1 } } },
    { $sort: { totalMin: -1 } },
    { $limit: 8 },
  ]);

  const dailyTrend = await StudySession.aggregate([
    { $match: { user: userId, completed: true, startedAt: { $gte: weekStart } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$startedAt' } },
      totalMin: { $sum: '$duration' },
    }},
    { $sort: { _id: 1 } },
  ]);

  const subjects   = await Subject.find({ user: userId, active: true });
  const recentSessions = await StudySession.find({ user: userId, completed: true })
    .sort({ startedAt: -1 }).limit(10);

  return {
    today:    { minutes: todayStats?.totalMin || 0, sessions: todayStats?.sessions || 0, xp: todayStats?.totalXP || 0 },
    week:     { minutes: weekStats?.totalMin  || 0, sessions: weekStats?.sessions   || 0 },
    subjects: subjectBreakdown,
    dailyTrend,
    subjectList: subjects,
    recentSessions,
    totalSubjects: subjects.length,
  };
};

export const getRecentSessions = (userId, limit = 20) =>
  StudySession.find({ user: userId, completed: true })
    .sort({ startedAt: -1 }).limit(limit).populate('subject', 'name emoji color');
