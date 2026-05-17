import asyncHandler from '../middleware/asyncHandler.js';
import * as habitService from '../services/habitService.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const getHabits = asyncHandler(async (req, res) => {
  const habits = await habitService.getHabits(req.user._id);
  sendSuccess(res, 200, 'Habits fetched', habits);
});

export const createHabit = asyncHandler(async (req, res) => {
  const habit = await habitService.createHabit(req.user._id, req.body);
  sendSuccess(res, 201, 'Habit created', habit);
});

export const updateHabit = asyncHandler(async (req, res) => {
  const habit = await habitService.updateHabit(req.user._id, req.params.id, req.body);
  sendSuccess(res, 200, 'Habit updated', habit);
});

export const trackHabit = asyncHandler(async (req, res) => {
  const { habit, xpAwarded } = await habitService.trackHabit(req.user._id, req.params.id, req.body);
  sendSuccess(res, 200, 'Habit tracked', { habit, xpAwarded });
});
