/**
 * src/services/taskService.js
 */

import Task from '../models/Task.js';
import User from '../models/User.js';
import { XP_REWARDS } from '../utils/constants.js';

export const getTasks = async (userId, { done, tag, priority, page = 1, limit = 50 }) => {
  const query = { user: userId };
  if (done !== undefined) query.done = done === 'true';
  if (tag)      query.tag      = tag;
  if (priority) query.priority = priority;

  const skip  = (page - 1) * limit;
  const total = await Task.countDocuments(query);
  const tasks = await Task.find(query)
    .sort({ dueDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  return { tasks, total };
};

export const createTask = async (userId, data) => {
  return Task.create({ user: userId, ...data });
};

export const updateTask = async (userId, taskId, data) => {
  const task = await Task.findOne({ _id: taskId, user: userId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }

  // Award XP when marking as done for the first time
  let xpAwarded = 0;
  if (data.done === true && !task.done) {
    task.completedAt = new Date();
    await User.findByIdAndUpdate(userId, { $inc: { xp: task.xp } });
    xpAwarded = task.xp;
  }
  // Revoke XP if unchecking
  if (data.done === false && task.done) {
    await User.findByIdAndUpdate(userId, { $inc: { xp: -task.xp } });
    task.completedAt = null;
  }

  Object.assign(task, data);
  await task.save();
  return { task, xpAwarded };
};

export const deleteTask = async (userId, taskId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, user: userId });
  if (!task) {
    const err = new Error('Task not found');
    err.statusCode = 404;
    throw err;
  }
  return task;
};
