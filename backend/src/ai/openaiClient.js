/**
 * src/ai/openaiClient.js
 * Singleton OpenAI client.
 * Import this wherever OpenAI calls are needed.
 */

import OpenAI from 'openai';

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openaiClient;
