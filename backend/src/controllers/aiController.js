/**
 * src/controllers/aiController.js
 * Handles both regular and streaming AI chat.
 */

import asyncHandler from '../middleware/asyncHandler.js';
import * as aiService from '../services/aiService.js';
import { sendSuccess } from '../utils/responseFormatter.js';

// POST /api/ai/chat — standard JSON response
export const chatJSON = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    const err = new Error('Message is required');
    err.statusCode = 400;
    throw err;
  }
  const { reply, usage } = await aiService.chat(req.user._id, message);
  sendSuccess(res, 200, 'AI response', { reply, usage });
});

// POST /api/ai/chat/stream — SSE streaming response
// NOTE: do NOT use asyncHandler here — chatStream owns its own error path once
// SSE headers are flushed.  Throwing after headers are sent crashes Express.
export const chatStreamHandler = async (req, res, next) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return next(Object.assign(new Error('Message is required'), { statusCode: 400 }));
  }
  // chatStream handles all errors internally and never throws after flushHeaders
  await aiService.chatStream(req.user._id, message, res);
};

// GET /api/ai/history
export const getHistory = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const messages = await aiService.getChatHistory(req.user._id, limit);
  sendSuccess(res, 200, 'Chat history', messages);
});

// DELETE /api/ai/history
export const clearHistory = asyncHandler(async (req, res) => {
  await aiService.clearChatHistory(req.user._id);
  sendSuccess(res, 200, 'Chat history cleared');
});
