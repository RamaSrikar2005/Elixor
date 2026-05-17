/**
 * DailyBrief — AI-powered morning modal shown once per calendar day.
 * Appears automatically on first page load of each new day.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, CheckSquare, Repeat, Target, TrendingUp } from 'lucide-react';
import { useAppStore }  from '../../store/appStore.js';
import { useAuthStore } from '../../store/authStore.js';

const STORAGE_KEY  = 'elixor_brief_date';
const todayKey     = () => new Date().toISOString().split('T')[0];
const wasShownToday = () => localStorage.getItem(STORAGE_KEY) === todayKey();
const markShown    = () => localStorage.setItem(STORAGE_KEY, todayKey());

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return '🌙 Good night,';
  if (h < 12) return '🌅 Good morning,';
  if (h < 17) return '☀️ Good afternoon,';
  if (h < 21) return '🌆 Good evening,';
  return '🌙 Good night,';
}

function getMotivation(score) {
  if (score >= 80) return "You're in peak form — protect this momentum.";
  if (score >= 60) return "Solid foundation. One focus session can push you above 80.";
  if (score >= 40) return "A fresh day, a fresh start. Small wins build momentum.";
  return "Every legendary streak started from zero. Today is day one.";
}

function getPriorityTip(tasks) {
  const critical = tasks?.filter(t => !t.done && t.priority === 'critical');
  const high     = tasks?.filter(t => !t.done && t.priority === 'high');
  if (critical?.length) return `🔴 ${critical.length} critical mission${critical.length>1?'s':''} demand your first attention.`;
  if (high?.length)     return `🟠 ${high.length} high-priority mission${high.length>1?'s':''} should be tackled before noon.`;
  return '✅ No critical blockers — execute in priority order.';
}

export default function DailyBrief() {
  const [visible, setVisible] = useState(false);
  const { dashboard, tasks }  = useAppStore();
  const { user }              = useAuthStore();

  useEffect(() => {
    // Show 1.5s after load to let the app settle
    if (!wasShownToday()) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    markShown();
    setVisible(false);
  };

  const d     = dashboard;
  const score = d?.scores?.productivity ?? 0;
  const name  = d?.user?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Explorer';

  const stats = [
    { icon: <CheckSquare size={13} />, label: 'Pending missions', value: (d?.tasks?.total ?? 0) - (d?.tasks?.done ?? 0), color: 'text-[#0ea5e9]' },
    { icon: <Repeat size={13} />,      label: 'Habits to check',  value: (d?.habits?.total ?? 0) - (d?.habits?.checkedToday ?? 0), color: 'text-[#10b981]' },
    { icon: <Target size={13} />,      label: 'Focus goal',       value: '4h', color: 'text-[#a78bfa]' },
    { icon: <TrendingUp size={13} />,  label: 'Productivity',     value: `${score}/100`, color: 'text-[#f59e0b]' },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-6"
          style={{ background: 'rgba(1,2,3,0.82)', backdropFilter: 'blur(16px)' }}
          onClick={e => e.target === e.currentTarget && dismiss()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1,   opacity: 1, y: 0  }}
            exit={{ scale: 0.9,    opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            className="w-full max-w-lg card overflow-hidden"
            style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(14,165,233,0.06)' }}
          >
            {/* Gradient header */}
            <div className="px-6 pt-7 pb-5 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(124,58,237,0.06))' }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9 40%, #7c3aed 60%, transparent)' }} />

              <button onClick={dismiss}
                className="absolute top-4 right-4 text-[rgba(186,230,253,0.3)] hover:text-white transition-colors">
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', boxShadow: '0 0 20px rgba(14,165,233,0.4)' }}>
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-mono text-[10px] text-[rgba(14,165,233,0.7)] uppercase tracking-widest">Daily Intelligence Brief</div>
                  <div className="font-mono text-[10px] text-[rgba(186,230,253,0.3)]">
                    {new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              <div className="font-display font-bold text-2xl tracking-tight mb-1">
                {getGreeting()} {name}
              </div>
              <div className="text-sm text-[rgba(186,230,253,0.55)] leading-relaxed">
                {getMotivation(score)}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-b border-white/[0.04]">
              {stats.map(s => (
                <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.03]">
                  <span className={`flex-shrink-0 ${s.color}`}>{s.icon}</span>
                  <div>
                    <div className={`font-display font-bold text-xl leading-none ${s.color}`}>{s.value}</div>
                    <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] mt-0.5">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI priority tip */}
            <div className="px-6 py-4">
              <div className="font-mono text-[10px] text-[rgba(14,165,233,0.6)] uppercase tracking-widest mb-2">
                AI Priority Signal
              </div>
              <div className="text-sm text-[rgba(186,230,253,0.6)] leading-relaxed">
                {getPriorityTip(tasks)}
              </div>
              {d?.user?.streak > 0 && (
                <div className="mt-2 text-sm text-[#f59e0b]">
                  🔥 {d.user.streak}-day streak — don't break it today.
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={dismiss} className="btn-primary flex-1 justify-center py-2.5">
                Start My Day →
              </button>
              <button onClick={dismiss} className="btn-ghost px-4 py-2.5 text-xs">
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
