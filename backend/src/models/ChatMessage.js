/**
 * src/models/ChatMessage.js
 * Persists AI chat history per user.
 */

import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 8000,
    },
    tokens: { type: Number, default: 0 }, // usage tokens from OpenAI
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: -1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
