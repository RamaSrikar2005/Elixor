import { create } from 'zustand';
import { authApi } from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: true,
  error:   null,

  setToken: (token) => set({ token }),

  // Silent refresh on app mount
  init: async () => {
    try {
      const { data } = await authApi.refresh();
      const token = data.data.accessToken;
      set({ token });
      const me = await authApi.me();
      set({ user: me.data.data, loading: false });
      connectSocket(token);
    } catch {
      set({ user: null, token: null, loading: false });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const { data } = await authApi.login({ email, password });
    const { user, accessToken } = data.data;
    set({ user, token: accessToken });
    connectSocket(accessToken);
    return user;
  },

  register: async (name, email, password) => {
    set({ error: null });
    const { data } = await authApi.register({ name, email, password });
    const { user, accessToken } = data.data;
    set({ user, token: accessToken });
    connectSocket(accessToken);
    return user;
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    disconnectSocket();
    set({ user: null, token: null });
  },

  updateUser: (patch) => set((s) => ({ user: { ...s.user, ...patch } })),
}));
