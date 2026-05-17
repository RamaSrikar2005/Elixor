/**
 * src/config/db.js
 * MongoDB connection via Mongoose.
 * Handles connect, disconnect, and logs connection state.
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

// Graceful disconnect (used during shutdown)
export const disconnectDB = async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};

// Connection event listeners
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
