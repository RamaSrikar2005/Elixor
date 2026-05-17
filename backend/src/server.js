/**
 * src/server.js
 * Application entry point.
 * Boots Express, Socket.IO, MongoDB, and all middleware/routes.
 */

import 'dotenv/config';
import express          from 'express';
import http             from 'http';
import { Server }       from 'socket.io';
import helmet           from 'helmet';
import cors             from 'cors';
import compression      from 'compression';
import cookieParser     from 'cookie-parser';

import { connectDB }            from './config/db.js';
import requestLogger            from './middleware/requestLogger.js';
import { apiLimiter }           from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { initSockets }          from './sockets/index.js';
import logger                   from './utils/logger.js';

// Routes
import authRoutes      from './routes/authRoutes.js';
import taskRoutes      from './routes/taskRoutes.js';
import habitRoutes     from './routes/habitRoutes.js';
import financeRoutes   from './routes/financeRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes        from './routes/aiRoutes.js';
import focusRoutes     from './routes/focusRoutes.js';
import studyRoutes     from './routes/studyRoutes.js';

// ─── App + HTTP server ────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods:     ['GET', 'POST'],
  },
  pingTimeout:  30000,
  pingInterval: 10000,
});
initSockets(io);

// Make io accessible in controllers via req.io
app.use((req, _res, next) => { req.io = io; next(); });

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General middleware ───────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser());
app.use(requestLogger);

// ─── Global rate limiter ──────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, ts: new Date() })
);

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/habits',    habitRoutes);
app.use('/api/finance',   financeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/focus',     focusRoutes);
app.use('/api/study',     studyRoutes);

// ─── Error handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const boot = async () => {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`⚡ ELIXOR backend running on port ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`   API:    http://localhost:${PORT}/api`);
    logger.info(`   Health: http://localhost:${PORT}/health`);
  });
};

boot();

// ─── Graceful shutdown ────────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    const { disconnectDB } = await import('./config/db.js');
    await disconnectDB();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection: ' + reason);
  process.exit(1);
});
