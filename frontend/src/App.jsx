import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

// Pages (lazy loaded)
const AuthPage      = React.lazy(() => import('./pages/AuthPage.jsx'));
const AppLayout     = React.lazy(() => import('./components/layout/AppLayout.jsx'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.jsx'));
const TasksPage     = React.lazy(() => import('./pages/TasksPage.jsx'));
const HabitsPage    = React.lazy(() => import('./pages/HabitsPage.jsx'));
const FinancePage   = React.lazy(() => import('./pages/FinancePage.jsx'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage.jsx'));
const AiPage        = React.lazy(() => import('./pages/AiPage.jsx'));
const FocusPage     = React.lazy(() => import('./pages/FocusPage.jsx'));
const StudyPage     = React.lazy(() => import('./pages/StudyPage.jsx'));

function RequireAuth({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <FullScreenLoader />;
  if (!user)   return <Navigate to="/auth" replace />;
  return children;
}

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 bg-[#010203] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] flex items-center justify-center text-2xl font-display font-bold mx-auto mb-4 shadow-[0_0_30px_rgba(14,165,233,0.4)]">E</div>
        <div className="font-mono text-xs text-[rgba(14,165,233,0.6)] tracking-widest uppercase animate-pulse">Initializing…</div>
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);

  useEffect(() => { init(); }, []);

  return (
    <React.Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/" element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }>
          <Route index         element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks"     element={<TasksPage />} />
          <Route path="habits"    element={<HabitsPage />} />
          <Route path="finance"   element={<FinancePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="ai"        element={<AiPage />} />
          <Route path="focus"     element={<FocusPage />} />
          <Route path="study"     element={<StudyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </React.Suspense>
  );
}
