import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect',       () => console.info('[Socket] Connected:', socket.id));
  socket.on('connect_error', (e) => console.warn('[Socket] Error:', e.message));
  socket.on('disconnect',    (r) => console.info('[Socket] Disconnected:', r));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() { return socket; }

export function onEvent(event, cb) {
  socket?.on(event, cb);
  return () => socket?.off(event, cb);
}

export const emit = (event, data) => socket?.emit(event, data);
