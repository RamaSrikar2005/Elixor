import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore.js';
import { useAppStore }  from '../../store/appStore.js';
import { useSocket }    from '../../hooks/useSocket.js';
import ElixorLogo         from '../ui/ElixorLogo.jsx';
import FloatingAI         from '../ui/FloatingAI.jsx';
import CommandPalette     from '../ui/CommandPalette.jsx';
import AmbientPlayer      from '../ui/AmbientPlayer.jsx';
import DailyBrief         from '../ui/DailyBrief.jsx';
import LiveStreak         from '../ui/LiveStreak.jsx';
import FinancialWarning   from '../ui/FinancialWarning.jsx';
import WellnessWidget     from '../ui/WellnessWidget.jsx';
import { AchievementToastHost } from '../ui/AchievementSystem.jsx';
import {
  LayoutDashboard, CheckSquare, Repeat, DollarSign,
  BarChart2, Zap, Target, LogOut, Command, BookOpen,
} from 'lucide-react';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/study',     icon: BookOpen,        label: 'Study',    badge: '⭐' },
  { to: '/focus',     icon: Target,          label: 'Focus'     },
  { to: '/tasks',     icon: CheckSquare,     label: 'Missions'  },
  { to: '/habits',    icon: Repeat,          label: 'Habits'    },
  { to: '/finance',   icon: DollarSign,      label: 'Finance'   },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/ai',        icon: Zap,             label: 'AI Core', badge: 'On' },
];

export default function AppLayout() {
  const { user, logout }   = useAuthStore();
  const { notifications }  = useAppStore();
  const [expanded, setExp] = useState(false);
  const navigate           = useNavigate();

  useSocket();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#010203]">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="ambient-mesh w-[700px] h-[700px] -top-72 -left-48 opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 60%)' }} />
        <div className="ambient-mesh w-[500px] h-[500px] -bottom-48 -right-24 opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #7c3aed, transparent 60%)', animationDuration: '30s' }} />
        <div className="ambient-mesh w-[350px] h-[350px] top-1/2 left-1/2 opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #06e5d4, transparent 60%)', animationDuration: '22s', animationDelay: '-4s' }} />
        {/* Neural grid */}
        <div className="fixed inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }} />
      </div>

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExp(true)}
        onMouseLeave={() => setExp(false)}
        className="relative z-10 flex flex-col bg-[rgba(4,8,15,0.97)] border-r border-[rgba(14,165,233,0.06)] transition-all duration-300 flex-shrink-0"
        style={{ width: expanded ? 220 : 68 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(14,165,233,0.06)] overflow-hidden">
          <ElixorLogo size={36} showName={false} />
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                className="overflow-hidden whitespace-nowrap">
                <div className="font-display font-bold text-base tracking-tight leading-none bg-gradient-to-r from-[#f0f9ff] to-[#7dd3fc] bg-clip-text text-transparent">
                  ELIXOR OS
                </div>
                <div className="font-mono text-[9px] text-[rgba(14,165,233,0.5)] mt-0.5">v2.0 · Intelligence Layer</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} className="flex-shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {expanded && badge && (
                <span className="chip chip-bio text-[9px] px-1.5 py-0 ml-auto">{badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User zone */}
        <div className="border-t border-[rgba(14,165,233,0.06)] p-2">
          <button onClick={handleLogout}
            className="nav-item text-[rgba(244,63,94,0.6)] hover:text-[#f43f5e] hover:bg-[rgba(244,63,94,0.06)] w-full">
            <LogOut size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <div className="flex items-center gap-3 px-2 py-2 mt-1 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[rgba(14,165,233,0.2)] to-[rgba(124,58,237,0.2)] border border-[rgba(14,165,233,0.35)] flex items-center justify-center font-display font-bold text-sm text-[#0ea5e9] flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="overflow-hidden whitespace-nowrap">
                  <div className="text-sm font-semibold text-[#bae6fd] leading-tight truncate max-w-[120px]">
                    {user?.name}
                  </div>
                  <div className="font-mono text-[10px] text-[#0ea5e9]">
                    Lv.{user?.level || 1} · {user?.rank?.split(' ')[0] || 'Novice'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 min-w-0">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 h-14 bg-[rgba(1,2,3,0.8)] backdrop-blur-2xl border-b border-[rgba(14,165,233,0.06)] flex-shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs text-[rgba(186,230,253,0.4)]">
            <span className="text-[rgba(186,230,253,0.25)]">Elixor OS</span>
            <span className="text-[rgba(186,230,253,0.2)]">›</span>
            <span className="text-[rgba(186,230,253,0.7)] font-semibold capitalize">
              {location.pathname.slice(1) || 'Dashboard'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Cmd+K trigger */}
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(14,165,233,0.1)] bg-[rgba(8,14,26,0.85)] font-mono text-[11px] text-[rgba(186,230,253,0.3)] hover:text-[rgba(186,230,253,0.6)] hover:border-[rgba(14,165,233,0.2)] transition-all"
              title="Open command palette">
              <Command size={11} />
              <span>Search…</span>
              <kbd className="px-1 py-0.5 rounded bg-white/[0.06] text-[9px]">⌘K</kbd>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(14,165,233,0.12)] bg-[rgba(8,14,26,0.85)] font-mono text-[11px] text-[rgba(186,230,253,0.5)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              AI Online
            </div>
            {user?.streak > 0 && <LiveStreak streak={user.streak} />}
            {user && (
              <div className="font-mono text-[11px] text-[rgba(186,230,253,0.4)]">
                ⚡ {user.xp?.toLocaleString('en-IN') || 0} XP
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Floating AI assistant */}
      <FloatingAI />

      {/* Ambient sound player */}
      <AmbientPlayer />

      {/* Wellness reminders (water · eye · stretch) */}
      <WellnessWidget />

      {/* Global command palette (⌘K) */}
      <CommandPalette />

      {/* Achievement badge toasts */}
      <AchievementToastHost />

      {/* Daily brief modal — shown once per day */}
      <DailyBrief />

      {/* Real-time financial warning banner */}
      <FinancialWarning />

      {/* Toast notifications */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div key={n.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="xp-toast">
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
