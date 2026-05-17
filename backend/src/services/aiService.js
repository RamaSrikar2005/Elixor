/**
 * src/services/aiService.js
 * AI chat using Groq API — free, ultra-fast LLM inference.
 * Supports streaming via async iteration (for-await).
 */

import groqClient, { DEFAULT_MODEL } from '../ai/groqClient.js';
import ChatMessage  from '../models/ChatMessage.js';
import User         from '../models/User.js';
import { getDashboard } from './analyticsService.js';
import logger from '../utils/logger.js';

const MAX_HIST    = 12;   // messages to include as context (reduced for speed)
const MAX_TOKENS  = parseInt(process.env.GROQ_MAX_TOKENS) || 1024;
const TIMEOUT_MS  = 60_000;  // 60-second hard timeout per request
const FALLBACK_MODEL = 'llama-3.1-8b-instant'; // fast fallback if primary fails

/** Wrap a Groq call with a hard timeout */
async function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Build a live-data system prompt for the user's current state */
const buildSystemPrompt = (user, dashboard) => `You are AURA.AI — the personal intelligence layer for ${user.name} inside ELIXOR, a futuristic AI productivity operating system.

Your personality: Sharp, motivating, concise, data-driven. You speak like a high-performance coach who knows the user's data intimately. You use **bold** for key numbers. Replies under 5 sentences unless detail is asked for. Never use markdown headers or code fences.

LIVE USER DATA RIGHT NOW:
- Name: ${user.name} | Level ${dashboard.user.level} | ${dashboard.user.xp} XP | ${dashboard.user.xpToNext} XP to next level
- Rank: ${dashboard.user.rank} | Streak: ${dashboard.user.streak} days
- Tasks: ${dashboard.tasks.done}/${dashboard.tasks.total} complete today (${dashboard.tasks.completion})
- Habits: ${dashboard.habits.checkedToday}/${dashboard.habits.total} checked today
- Focus: ${dashboard.focus.totalHours}h total | ${dashboard.focus.totalSessions} sessions completed
- Finance: ₹${dashboard.finance.income} income | ₹${dashboard.finance.expense} spent | ${dashboard.finance.savingsRate} savings rate
- Productivity Score: ${dashboard.scores.productivity}/100 | Habit Score: ${dashboard.scores.habit}/100

Use this data to give precise, personalized answers. Be encouraging but realistic.`;

/** Non-streaming chat — JSON response */
export const chat = async (userId, userMessage) => {
  const [user, dashboard] = await Promise.all([
    User.findById(userId),
    getDashboard(userId),
  ]);

  const history = await ChatMessage.find({ user: userId, role: { $ne: 'system' } })
    .sort({ createdAt: -1 })
    .limit(MAX_HIST)
    .then(msgs => msgs.reverse());

  const messages = [
    { role: 'system', content: buildSystemPrompt(user, dashboard) },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user',   content: userMessage },
  ];

  const completion = await groqClient.chat.completions.create({
    model:       DEFAULT_MODEL,
    messages,
    max_tokens:  MAX_TOKENS,
    temperature: 0.7,
  });

  const replyContent = completion.choices[0].message.content;
  const usage        = completion.usage;

  await ChatMessage.insertMany([
    { user: userId, role: 'user',      content: userMessage,  tokens: usage?.prompt_tokens },
    { user: userId, role: 'assistant', content: replyContent, tokens: usage?.completion_tokens },
  ]);

  return { reply: replyContent, usage, model: DEFAULT_MODEL };
};

/** Streaming chat — writes SSE events to res */
export const chatStream = async (userId, userMessage, res) => {
  // Set SSE headers before any async work that might throw
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullReply = '';

  try {
    const [user, dashboard] = await withTimeout(
      Promise.all([User.findById(userId), getDashboard(userId)]),
      10_000
    );

    if (!user) throw new Error('User not found');

    const history = await ChatMessage.find({ user: userId, role: { $ne: 'system' } })
      .sort({ createdAt: -1 })
      .limit(MAX_HIST)
      .then(msgs => msgs.reverse());

    const messages = [
      { role: 'system', content: buildSystemPrompt(user, dashboard) },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user',   content: userMessage },
    ];

    // Try primary model, fall back to fast model on failure
    let stream;
    let usedModel = DEFAULT_MODEL;
    try {
      stream = await withTimeout(
        groqClient.chat.completions.create({ model: DEFAULT_MODEL, messages, max_tokens: MAX_TOKENS, temperature: 0.7, stream: true }),
        TIMEOUT_MS
      );
    } catch (primaryErr) {
      logger.warn(`Primary model failed (${primaryErr.message}), trying fallback…`);
      usedModel = FALLBACK_MODEL;
      stream = await withTimeout(
        groqClient.chat.completions.create({ model: FALLBACK_MODEL, messages, max_tokens: MAX_TOKENS, temperature: 0.7, stream: true }),
        TIMEOUT_MS
      );
    }

    for await (const chunk of stream) {
      if (res.writableEnded) break;
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullReply += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ done: true, model: usedModel })}\n\n`);
      res.end();
    }

    // Persist only if we got a non-empty reply
    if (fullReply) {
      await ChatMessage.insertMany([
        { user: userId, role: 'user',      content: userMessage },
        { user: userId, role: 'assistant', content: fullReply  },
      ]).catch(() => {}); // non-fatal
    }

  } catch (err) {
    logger.error('Groq stream error: ' + err.message);
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: 'AI temporarily unavailable. Please try again.' })}\n\n`);
      res.end();
    }
  }
};

export const getChatHistory = async (userId, limit = 50) => {
  return ChatMessage.find({ user: userId, role: { $ne: 'system' } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then(msgs => msgs.reverse());
};

export const clearChatHistory = async (userId) => {
  await ChatMessage.deleteMany({ user: userId });
};
