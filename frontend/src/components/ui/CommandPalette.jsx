import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Repeat, DollarSign, BarChart2,
  Zap, Target, Search, ArrowRight, Clock, Hash,
} from 'lucide-react';
import { useAppStore }  from '../../store/appStore.js';
import { useAuthStore } from '../../store/authStore.js';

const NAV_CMDS = [
  { id: 'nav-dash',     label: 'Dashboard',       icon: LayoutDashboard, path: '/dashboard', tag: 'page' },
  { id: 'nav-tasks',    label: 'Mission Queue',    icon: CheckSquare,     path: '/tasks',     tag: 'page' },
  { id: 'nav-habits',   label: 'Habit Matrix',     icon: Repeat,          path: '/habits',    tag: 'page' },
  { id: 'nav-finance',  label: 'Finance',          icon: DollarSign,      path: '/finance',   tag: 'page' },
  { id: 'nav-analytics',label: 'Analytics',        icon: BarChart2,       path: '/analytics', tag: 'page' },
  { id: 'nav-ai',       label: 'AI Core',          icon: Zap,             path: '/ai',        tag: 'page' },
  { id: 'nav-focus',    label: 'Focus Mode',       icon: Target,          path: '/focus',     tag: 'page' },
];

const SHORTCUTS = [
  { key: 'G then D', desc: 'Go to Dashboard' },
  { key: 'G then T', desc: 'Go to Tasks' },
  { key: 'G then F', desc: 'Go to Focus' },
  { key: '⌘K',       desc: 'Open Command Palette' },
];

const TAG_COLORS = {
  page:   'bg-[rgba(14,165,233,0.12)] text-[#0ea5e9]',
  task:   'bg-[rgba(16,185,129,0.12)] text-[#10b981]',
  action: 'bg-[rgba(124,58,237,0.12)] text-[#a78bfa]',
};

let RECENT = [];

export default function CommandPalette() {
  const [open,    setOpen]    = useState(false);
  const [query,   setQuery]   = useState('');
  const [cursor,  setCursor]  = useState(0);
  const inputRef = useRef(null);
  const listRef  = useRef(null);
  const navigate = useNavigate();
  const { tasks }  = useAppStore();
  const { user, logout } = useAuthStore();

  // Build full command list including live tasks
  const allCmds = [
    ...NAV_CMDS,
    ...tasks.slice(0, 8).map(t => ({
      id:    `task-${t._id}`,
      label: t.text,
      icon:  CheckSquare,
      path:  '/tasks',
      tag:   'task',
      meta:  t.priority,
    })),
    { id: 'action-logout', label: 'Sign Out', icon: Zap, action: 'logout', tag: 'action' },
  ];

  const filtered = query.trim()
    ? allCmds.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : [
        ...RECENT.map(id => allCmds.find(c => c.id === id)).filter(Boolean),
        ...allCmds,
      ].filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i).slice(0, 9);

  const execute = useCallback((cmd) => {
    if (!cmd) return;
    // Track recent
    RECENT = [cmd.id, ...RECENT.filter(id => id !== cmd.id)].slice(0, 4);
    setOpen(false);
    setQuery('');
    setCursor(0);
    if (cmd.path)   navigate(cmd.path);
    if (cmd.action === 'logout') logout().then(() => navigate('/auth'));
  }, [navigate, logout]);

  // Global Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setCursor(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Arrow key navigation
  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); execute(filtered[cursor]); }
  };

  // Auto-focus input
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh] px-4"
            style={{ background: 'rgba(1,2,3,0.75)', backdropFilter: 'blur(12px)' }}
            onClick={e => e.target === e.currentTarget && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: -8 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{ scale: 0.96,    opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[580px] overflow-hidden rounded-2xl border border-[rgba(14,165,233,0.2)]"
              style={{ background: 'rgba(8,14,26,0.97)', boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(14,165,233,0.08)' }}
            >
              {/* Search bar */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(14,165,233,0.08)]">
                <Search size={15} className="text-[rgba(14,165,233,0.5)] flex-shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setCursor(0); }}
                  onKeyDown={handleKey}
                  placeholder="Search pages, tasks, actions…"
                  className="flex-1 bg-transparent text-sm text-[#f0f9ff] outline-none placeholder-[rgba(186,230,253,0.25)]"
                  style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}
                />
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-[rgba(186,230,253,0.3)] border border-white/[0.08]">
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
                {filtered.length === 0 && (
                  <div className="text-center py-8 font-mono text-xs text-[rgba(186,230,253,0.25)]">
                    No results for "{query}"
                  </div>
                )}
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <div
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setCursor(i)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        i === cursor ? 'bg-[rgba(14,165,233,0.08)]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        i === cursor ? 'bg-[rgba(14,165,233,0.15)]' : 'bg-white/[0.05]'
                      }`}>
                        <Icon size={13} className={i === cursor ? 'text-[#0ea5e9]' : 'text-[rgba(186,230,253,0.4)]'} />
                      </div>
                      <span className={`text-sm flex-1 ${i === cursor ? 'text-[#f0f9ff]' : 'text-[rgba(186,230,253,0.65)]'}`}>
                        {cmd.label}
                      </span>
                      {cmd.meta && (
                        <span className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] capitalize">{cmd.meta}</span>
                      )}
                      <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full ${TAG_COLORS[cmd.tag] || TAG_COLORS.action}`}>
                        {cmd.tag}
                      </span>
                      {i === cursor && (
                        <ArrowRight size={12} className="text-[rgba(14,165,233,0.5)] flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer shortcuts */}
              <div className="flex items-center gap-5 px-4 py-2.5 border-t border-[rgba(14,165,233,0.06)]">
                {[
                  { key: '↑↓', desc: 'navigate' },
                  { key: '↵',  desc: 'select'   },
                  { key: 'esc', desc: 'close'    },
                ].map(s => (
                  <span key={s.key} className="flex items-center gap-1.5 font-mono text-[10px] text-[rgba(186,230,253,0.25)]">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">{s.key}</kbd>
                    {s.desc}
                  </span>
                ))}
                <span className="ml-auto font-mono text-[10px] text-[rgba(14,165,233,0.35)]">
                  {user?.name?.split(' ')[0]} · {filtered.length} results
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger hint in topbar — exposed via CSS class for AppLayout to pick up */}
      <div id="cmd-palette-trigger" style={{ display: 'none' }} onClick={() => setOpen(true)} />
    </>
  );
}
