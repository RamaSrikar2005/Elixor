import asyncHandler from '../middleware/asyncHandler.js';
import * as taskService from '../services/taskService.js';
import { sendSuccess, paginateMeta } from '../utils/responseFormatter.js';

export const getTasks = asyncHandler(async (req, res) => {
  const { tasks, total } = await taskService.getTasks(req.user._id, req.query);
  sendSuccess(res, 200, 'Tasks fetched', tasks, paginateMeta(req.query.page || 1, req.query.limit || 50, total));
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await taskService.createTask(req.user._id, req.body);
  sendSuccess(res, 201, 'Task created', task);
});

export const updateTask = asyncHandler(async (req, res) => {
  const { task, xpAwarded } = await taskService.updateTask(req.user._id, req.params.id, req.body);
  sendSuccess(res, 200, 'Task updated', { task, xpAwarded });
});

export const deleteTask = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user._id, req.params.id);
  sendSuccess(res, 200, 'Task deleted');
});
