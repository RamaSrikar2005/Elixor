/**
 * src/utils/constants.js
 * Application-wide constants.
 */

export const XP_REWARDS = {
  TASK_COMPLETE:  50,
  HABIT_CHECK:    20,
  FOCUS_SESSION:  30,   // per 25-min pomodoro
  STREAK_BONUS:   10,   // per active streak day
  DAILY_LOGIN:     5,
};

export const LEVELS = [
  { level: 1,  xpRequired: 0    },
  { level: 2,  xpRequired: 200  },
  { level: 3,  xpRequired: 500  },
  { level: 4,  xpRequired: 1000 },
  { level: 5,  xpRequired: 1800 },
  { level: 6,  xpRequired: 2800 },
  { level: 7,  xpRequired: 4000 },
  { level: 8,  xpRequired: 5500 },
  { level: 9,  xpRequired: 7200 },
  { level: 10, xpRequired: 9200 },
  { level: 11, xpRequired: 11500},
  { level: 12, xpRequired: 14200},
  { level: 13, xpRequired: 17000},
  { level: 14, xpRequired: 20500},
  { level: 15, xpRequired: 25000},
];

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const TASK_TAGS       = ['Work', 'Study', 'Health', 'Fitness', 'Growth', 'Finance', 'Personal', 'Custom'];
export const FINANCE_CATEGORIES = [
  'Food', 'Shopping', 'Utilities', 'Transport', 'Health',
  'Education', 'Entertainment', 'Rent', 'Medical',
  'Investment', 'Income', 'Other',
];
export const FOCUS_WORK_DURATION  = 25 * 60; // seconds
export const FOCUS_BREAK_DURATION =  5 * 60;

export const RANKS = ['Novice', 'Explorer', 'Achiever', 'Voyager', 'Oracle', 'Titan'];

export function getLevelFromXP(xp) {
  const entry = [...LEVELS].reverse().find(l => xp >= l.xpRequired);
  return entry?.level ?? 1;
}

export function getXPToNextLevel(xp) {
  const currentLevel = getLevelFromXP(xp);
  const next = LEVELS.find(l => l.level === currentLevel + 1);
  return next ? next.xpRequired - xp : 0;
}
