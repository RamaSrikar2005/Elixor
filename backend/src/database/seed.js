/**
 * src/database/seed.js
 * Seeds the database with a demo user and sample data.
 * Run: npm run seed
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Habit from '../models/Habit.js';
import FinanceTransaction from '../models/FinanceTransaction.js';
import logger from '../utils/logger.js';

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB for seeding');

  // Clear existing demo data
  await Promise.all([
    User.deleteMany({ email: 'arjun@elixor.dev' }),
  ]);

  // ─── Demo User ───────────────────────────────────
  const user = await User.create({
    name:     'Arjun Kulkarni',
    email:    'arjun@elixor.dev',
    password: 'password123',
    xp:       3480,
    streak:   24,
    lastActiveDate: new Date(),
    badges:   ['Morning Pro', 'Deep Worker', 'Budget Hawk', 'Streak Master'],
  });
  logger.info(`Created user: ${user.email} (${user._id})`);

  // ─── Tasks ───────────────────────────────────────
  await Task.insertMany([
    { user: user._id, text: 'Review Q2 analytics report',    tag: 'Work',    priority: 'high',   xp: 50, done: true,  completedAt: new Date() },
    { user: user._id, text: 'Morning run — 5km',             tag: 'Health',  priority: 'medium', xp: 30, done: true,  completedAt: new Date() },
    { user: user._id, text: 'Read 30 mins — Atomic Habits',  tag: 'Growth',  priority: 'low',    xp: 20, done: true,  completedAt: new Date() },
    { user: user._id, text: 'Meditate for 15 mins',          tag: 'Health',  priority: 'low',    xp: 15, done: true,  completedAt: new Date() },
    { user: user._id, text: 'Call with design team @ 3pm',   tag: 'Work',    priority: 'high',   xp: 40, done: false },
    { user: user._id, text: 'Grocery shopping (≤₹2000)',     tag: 'Finance', priority: 'medium', xp: 10, done: false },
    { user: user._id, text: 'Write daily journal entry',     tag: 'Growth',  priority: 'low',    xp: 20, done: false },
    { user: user._id, text: 'Update project roadmap',        tag: 'Work',    priority: 'high',   xp: 35, done: false },
  ]);
  logger.info('Seeded tasks');

  // ─── Habits ──────────────────────────────────────
  const habitsData = [
    { name: '🏃 Morning Run',   emoji: '🏃', color: '#10b981' },
    { name: '💧 Drink 3L Water', emoji: '💧', color: '#0ea5e9' },
    { name: '📚 Read 30min',    emoji: '📚', color: '#7c3aed' },
    { name: '🧘 Meditate',      emoji: '🧘', color: '#f59e0b' },
    { name: '🏋️ Workout',       emoji: '🏋️', color: '#f43f5e' },
    { name: '✍️ Journal',       emoji: '✍️', color: '#06e5d4' },
  ];

  for (const h of habitsData) {
    const checkIns = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      d.setUTCHours(0, 0, 0, 0);
      checkIns.push({ date: d, done: Math.random() > 0.25 });
    }
    await Habit.create({ user: user._id, ...h, streak: 5, checkIns });
  }
  logger.info('Seeded habits');

  // ─── Finance ─────────────────────────────────────
  await FinanceTransaction.insertMany([
    { user: user._id, type: 'expense', amount: 680,   category: 'Food',          description: 'Zomato Order',      emoji: '🍔', date: new Date() },
    { user: user._id, type: 'expense', amount: 2400,  category: 'Utilities',     description: 'Electricity Bill',  emoji: '⚡', date: new Date(Date.now() - 86400000) },
    { user: user._id, type: 'expense', amount: 3200,  category: 'Shopping',      description: 'BigBasket Grocery', emoji: '🛒', date: new Date(Date.now() - 2*86400000) },
    { user: user._id, type: 'expense', amount: 649,   category: 'Entertainment', description: 'Netflix Premium',   emoji: '📱', date: new Date(Date.now() - 3*86400000) },
    { user: user._id, type: 'income',  amount: 200000,category: 'Income',        description: 'Monthly Salary',    emoji: '💼', date: new Date(Date.now() - 5*86400000) },
    { user: user._id, type: 'expense', amount: 450,   category: 'Health',        description: 'Pharmacy',          emoji: '🏥', date: new Date(Date.now() - 6*86400000) },
  ]);
  logger.info('Seeded finance transactions');

  logger.info('\n✅ Seed complete!');
  logger.info('   Email:    arjun@elixor.dev');
  logger.info('   Password: password123');

  await mongoose.disconnect();
};

seed().catch((err) => {
  logger.error('Seed failed: ' + err.message);
  process.exit(1);
});
