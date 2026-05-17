import { create } from 'zustand';
import { analyticsApi, tasksApi, habitsApi, financeApi } from '../services/api.js';
import { fireAchievements } from '../components/ui/AchievementSystem.jsx';

/** Weighted productivity score from dashboard data */
function calcProductivity(d) {
  if (!d) return 0;
  const taskRate  = d.tasks?.total > 0 ? (d.tasks.done / d.tasks.total) : 0;
  const habitRate = d.habits?.total > 0 ? (d.habits.checkedToday / d.habits.total) : 0;
  const focusRate = Math.min((parseFloat(d.focus?.totalHours) || 0) / 4, 1);
  return Math.round(taskRate * 0.5 * 100 + habitRate * 0.3 * 100 + focusRate * 0.2 * 100);
}

export const useAppStore = create((set, get) => ({
  dashboard:    null,
  tasks:        [],
  habits:       [],
  transactions: [],
  finAnalytics: null,
  focusSession: null,
  notifications: [],
  loading: {
    dashboard: false,
    tasks:     false,
    habits:    false,
    finance:   false,
  },

  // ─── Dashboard ──────────────────────────────────
  loadDashboard: async () => {
    set(s => ({ loading: { ...s.loading, dashboard: true } }));
    try {
      const { data } = await analyticsApi.dashboard();
      const d = data.data;
      // Inject client-side productivity score if backend didn't compute one
      if (d && !d.scores?.productivity) {
        d.scores = { ...d.scores, productivity: calcProductivity(d) };
      }
      set({ dashboard: d });
      // Fire achievement checks after every dashboard load
      fireAchievements(d);
    } catch {
      // Keep existing dashboard data on failure
    } finally {
      set(s => ({ loading: { ...s.loading, dashboard: false } }));
    }
  },

  // ─── Tasks ──────────────────────────────────────
  loadTasks: async () => {
    set(s => ({ loading: { ...s.loading, tasks: true } }));
    try {
      const { data } = await tasksApi.list({ limit: 50 });
      set({ tasks: data.data });
    } finally {
      set(s => ({ loading: { ...s.loading, tasks: false } }));
    }
  },

  createTask: async (taskData) => {
    const { data } = await tasksApi.create(taskData);
    set(s => ({ tasks: [data.data, ...s.tasks] }));
    return data.data;
  },

  toggleTask: async (id, done) => {
    // Optimistic update
    set(s => ({ tasks: s.tasks.map(t => t._id === id ? { ...t, done } : t) }));
    try {
      const { data } = await tasksApi.update(id, { done });
      set(s => ({ tasks: s.tasks.map(t => t._id === id ? data.data.task : t) }));
      if (data.data.xpAwarded > 0) {
        get().addNotification('xp', `+${data.data.xpAwarded} XP 🔥`);
      }
      // Refresh dashboard score after task toggle
      get().loadDashboard();
    } catch {
      // Revert on failure
      set(s => ({ tasks: s.tasks.map(t => t._id === id ? { ...t, done: !done } : t) }));
    }
  },

  deleteTask: async (id) => {
    set(s => ({ tasks: s.tasks.filter(t => t._id !== id) }));
    try {
      await tasksApi.delete(id);
    } catch {
      // Re-fetch on failure
      get().loadTasks();
    }
  },

  // ─── Habits ─────────────────────────────────────
  loadHabits: async () => {
    set(s => ({ loading: { ...s.loading, habits: true } }));
    try {
      const { data } = await habitsApi.list();
      set({ habits: data.data });
    } finally {
      set(s => ({ loading: { ...s.loading, habits: false } }));
    }
  },

  trackHabit: async (id, date, done) => {
    // Optimistic update on checkIns
    set(s => ({
      habits: s.habits.map(h => {
        if (h._id !== id) return h;
        const existing = h.checkIns?.find(c => c.date?.split?.('T')[0] === date || new Date(c.date).toISOString().split('T')[0] === date);
        let checkIns;
        if (existing) {
          checkIns = h.checkIns.map(c =>
            new Date(c.date).toISOString().split('T')[0] === date ? { ...c, done } : c
          );
        } else {
          checkIns = [...(h.checkIns || []), { date, done }];
        }
        return { ...h, checkIns };
      }),
    }));
    try {
      const { data } = await habitsApi.track(id, { date, done });
      set(s => ({ habits: s.habits.map(h => h._id === id ? data.data.habit : h) }));
      if (data.data.xpAwarded > 0) {
        get().addNotification('xp', `+${data.data.xpAwarded} XP ✅`);
      }
      // Refresh dashboard after habit track
      get().loadDashboard();
    } catch (err) {
      console.error('Track habit failed:', err);
      get().loadHabits();
    }
  },

  // ─── Finance ────────────────────────────────────
  loadFinance: async () => {
    set(s => ({ loading: { ...s.loading, finance: true } }));
    try {
      const [txRes, analyticsRes] = await Promise.all([
        financeApi.list({ limit: 20 }),
        financeApi.analytics(),
      ]);
      set({ transactions: txRes.data.data, finAnalytics: analyticsRes.data.data });
    } finally {
      set(s => ({ loading: { ...s.loading, finance: false } }));
    }
  },

  // ─── Focus ──────────────────────────────────────
  setFocusSession: (session) => set({ focusSession: session }),

  // ─── Notifications ──────────────────────────────
  addNotification: (type, message) => {
    const notif = { id: Date.now(), type, message };
    set(s => ({ notifications: [notif, ...s.notifications].slice(0, 10) }));
    setTimeout(() => {
      set(s => ({ notifications: s.notifications.filter(n => n.id !== notif.id) }));
    }, 3500);
  },
}));
