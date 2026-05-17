/**
 * src/middleware/requestLogger.js
 * HTTP request logging using morgan + winston.
 */

import morgan from 'morgan';
import logger from '../utils/logger.js';

// Pipe morgan output into winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip health-check and asset routes in production
const skip = () => process.env.NODE_ENV === 'production';

const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

export default requestLogger;
