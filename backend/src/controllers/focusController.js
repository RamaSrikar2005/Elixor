import asyncHandler from '../middleware/asyncHandler.js';
import * as focusService from '../services/focusService.js';
import { sendSuccess }   from '../utils/responseFormatter.js';

export const startSession = asyncHandler(async (req, res) => {
  const session = await focusService.startSession(req.user._id, req.body);
  sendSuccess(res, 201, 'Focus session started', session);
});

export const endSession = asyncHandler(async (req, res) => {
  const { session, xpAwarded } = await focusService.endSession(req.user._id, req.params.id, req.body);
  sendSuccess(res, 200, 'Focus session ended', { session, xpAwarded });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await focusService.getFocusStats(req.user._id);
  sendSuccess(res, 200, 'Focus stats', stats);
});
