/**
 * src/ai/groqClient.js
 * Groq API client — ultra-fast free LLM inference.
 * Get your free API key at: https://console.groq.com
 */

import Groq from 'groq-sdk';

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/** Available free Groq models — ordered by capability */
export const GROQ_MODELS = {
  fast:      'llama-3.1-8b-instant',       // Fastest, lightweight
  balanced:  'llama3-8b-8192',             // Good balance
  smart:     'llama-3.3-70b-versatile',    // Most capable
  deepseek:  'deepseek-r1-distill-llama-70b', // Reasoning
  mixtral:   'mixtral-8x7b-32768',         // Long context
  gemma:     'gemma2-9b-it',               // Google Gemma
};

export const DEFAULT_MODEL = process.env.GROQ_MODEL || GROQ_MODELS.smart;

export default groqClient;
