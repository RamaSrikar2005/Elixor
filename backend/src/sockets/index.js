/**
 * src/sockets/index.js
 * Socket.IO server — handles realtime events:
 *   - auth handshake (JWT)
 *   - focus session sync
 *   - live dashboard push
 *   - AI streaming relay
 *   - notifications
 */

import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Map userId → Set of socket IDs for multi-tab support
const userSockets = new Map();

export const initSockets = (io) => {

  // ─── Auth middleware ─────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication error: no token'));

      const decoded = verifyAccessToken(token);
      const user    = await User.findById(decoded.id).select('-password');
      if (!user)    return next(new Error('Authentication error: user not found'));

      socket.userId   = user._id.toString();
      socket.userName = user.name;
      next();
    } catch (err) {
      next(new Error('Authentication error: invalid token'));
    }
  });

  // ─── Connection ──────────────────────────────────
  io.on('connection', (socket) => {
    const uid = socket.userId;
    logger.info(`Socket connected: ${uid} (${socket.id})`);

    // Track user sockets
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);

    // Join personal room
    socket.join(uid);

    // ── Focus sync ──────────────────────────────────
    socket.on('focus:start', (data) => {
      // Broadcast to all tabs of same user
      io.to(uid).emit('focus:started', data);
      logger.debug(`focus:start for ${uid}`);
    });

    socket.on('focus:tick', (data) => {
      io.to(uid).emit('focus:tick', data);
    });

    socket.on('focus:end', (data) => {
      io.to(uid).emit('focus:ended', data);
    });

    socket.on('focus:pause', (data) => {
      io.to(uid).emit('focus:paused', data);
    });

    // ── Dashboard refresh ────────────────────────────
    socket.on('dashboard:refresh', () => {
      io.to(uid).emit('dashboard:stale'); // signal frontend to re-fetch
    });

    // ── Notification ack ────────────────────────────
    socket.on('notification:ack', (id) => {
      logger.debug(`Notification ${id} ack'd by ${uid}`);
    });

    // ── Disconnect ──────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${uid} — ${reason}`);
      const sockets = userSockets.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(uid);
      }
    });
  });
};

/**
 * Push a notification to a specific user from any service.
 * Importable utility.
 */
export const notifyUser = (io, userId, type, payload) => {
  io.to(userId.toString()).emit('notification', { type, payload, timestamp: new Date() });
};

/**
 * Push dashboard-stale signal so frontend re-fetches.
 */
export const pushDashboardUpdate = (io, userId) => {
  io.to(userId.toString()).emit('dashboard:update');
};
