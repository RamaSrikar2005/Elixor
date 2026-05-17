import asyncHandler from '../middleware/asyncHandler.js';
import { getDashboard } from '../services/analyticsService.js';
import { sendSuccess }  from '../utils/responseFormatter.js';

export const dashboard = asyncHandler(async (req, res) => {
  const data = await getDashboard(req.user._id);
  sendSuccess(res, 200, 'Dashboard data', data);
});
