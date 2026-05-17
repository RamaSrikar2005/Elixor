import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// ─── Axios instance ──────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,         // sends HttpOnly refresh cookie
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ────────────────
api.interceptors.request.use(async (config) => {
  try {
    const { useAuthStore } = await import('../store/authStore.js');
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    // Store not ready yet, continue without token
  }
  return config;
});

// ─── Response interceptor: auto-refresh on 401 ───────────────
let _refreshing = false;
let _queue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      if (_refreshing) {
        return new Promise((resolve, reject) => {
          _queue.push({ resolve, reject });
        }).then(() => api(original)).catch((e) => Promise.reject(e));
      }

      original._retry = true;
      _refreshing = true;

      try {
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        // Dynamically import to avoid circular dep
        const { useAuthStore } = await import('../store/authStore.js');
        useAuthStore.getState().setToken(newToken);
        _queue.forEach((p) => p.resolve());
        _queue = [];
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        _queue.forEach((p) => p.reject(refreshErr));
        _queue = [];
        const { useAuthStore } = await import('../store/authStore.js');
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  register: (d)  => api.post('/auth/register', d),
  login:    (d)  => api.post('/auth/login', d),
  logout:   ()   => api.post('/auth/logout'),
  refresh:  ()   => api.post('/auth/refresh'),
  me:       ()   => api.get('/auth/me'),
};

// ─── Tasks ────────────────────────────────────────────────────
export const tasksApi = {
  list:   (p={}) => api.get('/tasks', { params: p }),
  create: (d)    => api.post('/tasks', d),
  update: (id,d) => api.put(`/tasks/${id}`, d),
  delete: (id)   => api.delete(`/tasks/${id}`),
};

// ─── Habits ───────────────────────────────────────────────────
export const habitsApi = {
  list:   ()         => api.get('/habits'),
  create: (d)        => api.post('/habits', d),
  update: (id,d)     => api.put(`/habits/${id}`, d),
  delete: (id)       => api.delete(`/habits/${id}`),
  track:  (id,d)     => api.post(`/habits/${id}/track`, d),
};

// ─── Finance ──────────────────────────────────────────────────
export const financeApi = {
  list:      (p={}) => api.get('/finance', { params: p }),
  create:    (d)    => api.post('/finance', d),
  analytics: (p={}) => api.get('/finance/analytics', { params: p }),
};

// ─── Focus ────────────────────────────────────────────────────
export const focusApi = {
  start: (d)    => api.post('/focus/start', d),
  end:   (id,d) => api.post(`/focus/${id}/end`, d),
  stats: ()     => api.get('/focus/stats'),
};

// ─── Analytics ────────────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
};

// ─── AI ───────────────────────────────────────────────────────
export const aiApi = {
  chat:    (message) => api.post('/ai/chat', { message }),
  history: (limit=50)=> api.get(`/ai/history?limit=${limit}`),
  clear:   ()        => api.delete('/ai/history'),

  /** Streaming — returns a ReadableStream reader */
  stream: async (message, token) => {
    const res = await fetch(`${BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    return res;
  },
};

// ─── Study ────────────────────────────────────────────────────
export const studyApi = {
  // Subjects
  listSubjects:   ()        => api.get('/study/subjects'),
  createSubject:  (d)       => api.post('/study/subjects', d),
  updateSubject:  (id, d)   => api.put(`/study/subjects/${id}`, d),
  deleteSubject:  (id)      => api.delete(`/study/subjects/${id}`),
  // Sessions
  startSession:   (d)       => api.post('/study/sessions/start', d),
  endSession:     (id, d)   => api.post(`/study/sessions/${id}/end`, d),
  getHistory:     (limit=20)=> api.get(`/study/sessions?limit=${limit}`),
  // Stats
  getStats:       ()        => api.get('/study/stats'),
};
