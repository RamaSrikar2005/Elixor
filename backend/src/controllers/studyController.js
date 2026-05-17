import asyncHandler from '../middleware/asyncHandler.js';
import * as svc from '../services/studyService.js';
import { sendSuccess } from '../utils/responseFormatter.js';

export const listSubjects   = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Subjects', await svc.getSubjects(req.user._id)));
export const createSubject  = asyncHandler(async (req, res) => sendSuccess(res, 201, 'Subject created', await svc.createSubject(req.user._id, req.body)));
export const updateSubject  = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Subject updated', await svc.updateSubject(req.user._id, req.params.id, req.body)));
export const deleteSubject  = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Subject removed', await svc.deleteSubject(req.user._id, req.params.id)));

export const startSession   = asyncHandler(async (req, res) => sendSuccess(res, 201, 'Session started', await svc.startSession(req.user._id, req.body)));
export const endSession     = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Session ended', await svc.endSession(req.user._id, req.params.id, req.body)));

export const getStats       = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Study stats', await svc.getStats(req.user._id)));
export const getHistory     = asyncHandler(async (req, res) => sendSuccess(res, 200, 'History', await svc.getRecentSessions(req.user._id, parseInt(req.query.limit) || 20)));
