/**
 * AchievementSystem — badge definitions + toast notifications.
 * Checks conditions client-side after every dashboard load.
 * Earned badges are stored in localStorage.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const BADGES = [
  // Streak
  { id: 'streak_1',   name: 'First Flame',     emoji: '🔥', rarity: 'common',    desc: 'Kept your streak for 1 day',          check: d => d?.user?.streak >= 1   },
  { id: 'streak_7',   name: 'Week Warrior',    emoji: '⚡', rarity: 'rare',      desc: '7-day streak achieved',               check: d => d?.user?.streak >= 7   },
  { id: 'streak_30',  name: 'Iron Will',       emoji: '🏆', rarity: 'epic',      desc: '30-day unbroken streak',              check: d => d?.user?.streak >= 30  },
  // Tasks
  { id: 'task_first', name: 'Mission Start',   emoji: '🎯', rarity: 'common',    desc: 'Completed your first mission',        check: d => (d?.tasks?.done ?? 0) >= 1   },
  { id: 'task_10',    name: 'Mission Control', emoji: '🚀', rarity: 'rare',      desc: '10 missions completed',               check: d => (d?.tasks?.done ?? 0) >= 10  },
  { id: 'task_50',    name: 'Executor',        emoji: '💎', rarity: 'epic',      desc: '50 missions completed',               check: d => (d?.tasks?.done ?? 0) >= 50  },
  // Focus
  { id: 'focus_1',    name: 'Deep Diver',      emoji: '🎧', rarity: 'common',    desc: 'Completed your first focus session',  check: d => (d?.focus?.totalSessions ?? 0) >= 1  },
  { id: 'focus_10',   name: 'Flow Master',     emoji: '🌊', rarity: 'rare',      desc: '10 focus sessions completed',         check: d => (d?.focus?.totalSessions ?? 0) >= 10 },
  { id: 'focus_20h',  name: 'Time Lord',       emoji: '⏳', rarity: 'epic',      desc: '20 hours of total focus time',        check: d => parseFloat(d?.focus?.totalHours ?? 0) >= 20 },
  // Habits
  { id: 'habit_rate', name: 'Consistent',      emoji: '✅', rarity: 'rare',      desc: '80%+ habit completion rate',          check: d => (d?.scores?.habit ?? 0) >= 80  },
  // Finance
  { id: 'saver_50',   name: 'Half Saver',      emoji: '💰', rarity: 'common',    desc: 'Saved 50% of monthly income',         check: d => parseFloat(d?.finance?.savingsRate ?? '0') >= 50 },
  { id: 'saver_70',   name: 'Wealth Builder',  emoji: '💎', rarity: 'rare',      desc: 'Saved 70% of monthly income',         check: d => parseFloat(d?.finance?.savingsRate ?? '0') >= 70 },
  // Productivity
  { id: 'prod_80',    name: 'Peak Performer',  emoji: '🧠', rarity: 'rare',      desc: 'Productivity score above 80',         check: d => (d?.scores?.productivity ?? 0) >= 80  },
  { id: 'prod_100',   name: 'ELIXOR Elite',    emoji: '👑', rarity: 'legendary', desc: 'Perfect 100 productivity score',      check: d => (d?.scores?.productivity ?? 0) >= 100 },
  // XP
  { id: 'xp_1000',   name: 'XP Grinder',      emoji: '🎮', rarity: 'common',    desc: '1,000 XP earned',                    check: d => (d?.user?.xp ?? 0) >= 1000  },
  { id: 'xp_5000',   name: 'Level Up Hero',   emoji: '⭐', rarity: 'rare',      desc: '5,000 XP earned',                    check: d => (d?.user?.xp ?? 0) >= 5000  },
];

const RARITY_STYLE = {
  common:    { border: 'rgba(186,230,253,0.2)', glow: 'rgba(186,230,253,0.1)', label: 'Common'    },
  rare:      { border: 'rgba(14,165,233,0.5)',  glow: 'rgba(14,165,233,0.2)', label: 'Rare'      },
  epic:      { border: 'rgba(124,58,237,0.5)',  glow: 'rgba(124,58,237,0.2)', label: 'Epic'      },
  legendary: { border: 'rgba(245,158,11,0.6)',  glow: 'rgba(245,158,11,0.3)', label: 'Legendary' },
};

const STORAGE_KEY = 'elixor_badges';
export const getEarned = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveEarned = (ids) => localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));

/** Check dashboard data against badge conditions, return newly earned */
export function checkNewBadges(dashboard) {
  if (!dashboard) return [];
  const earned = getEarned();
  const newly  = BADGES.filter(b => !earned.includes(b.id) && b.check(dashboard));
  if (newly.length) saveEarned([...earned, ...newly.map(b => b.id)]);
  return newly;
}

/** Badge toast — displayed for a few seconds per badge */
function BadgeToast({ badge, onDone }) {
  const style = RARITY_STYLE[badge.rarity] || RARITY_STYLE.common;
  useEffect(() => { const t = setTimeout(onDone, 4500); return () => clearTimeout(t); }, []);
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer select-none"
      onClick={onDone}
      style={{
        background: 'rgba(8,14,26,0.96)',
        borderColor: style.border,
        boxShadow: `0 0 32px ${style.glow}, 0 8px 32px rgba(0,0,0,0.6)`,
        minWidth: 240,
      }}
    >
      {/* Particle burst */}
      <div className="relative flex-shrink-0">
        <motion.span
          className="text-3xl"
          animate={{ scale: [0.5, 1.2, 1], rotate: [0, 15, 0] }}
          transition={{ duration: 0.5, ease: 'backOut' }}
        >{badge.emoji}</motion.span>
        {[...Array(6)].map((_, i) => (
          <motion.span key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full"
            style={{ background: style.border.replace('0.5','0.9').replace('0.2','0.9').replace('0.6','0.9') }}
            initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            animate={{ opacity: 0, x: (Math.cos(i*60*Math.PI/180)*28), y: (Math.sin(i*60*Math.PI/180)*28), scale: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          />
        ))}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: style.border.replace('0.5','1').replace('0.2','1').replace('0.6','1') }}>
            {style.label} Achievement
          </span>
        </div>
        <div className="font-display font-bold text-sm text-[#f0f9ff]">{badge.name}</div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.5)] mt-0.5">{badge.desc}</div>
      </div>
    </motion.div>
  );
}

/** Mount once in AppLayout — listens to window event 'achievement:new' */
export function AchievementToastHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const badge = e.detail;
      setQueue(q => [...q, { ...badge, uid: Date.now() + Math.random() }]);
    };
    window.addEventListener('achievement:new', handler);
    return () => window.removeEventListener('achievement:new', handler);
  }, []);

  const dismiss = (uid) => setQueue(q => q.filter(b => b.uid !== uid));

  return (
    <div className="fixed top-20 right-5 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {queue.map(badge => (
          <div key={badge.uid} className="pointer-events-auto">
            <BadgeToast badge={badge} onDone={() => dismiss(badge.uid)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Call this after any dashboard load to fire achievement events */
export function fireAchievements(dashboard) {
  const newly = checkNewBadges(dashboard);
  newly.forEach(badge => {
    window.dispatchEvent(new CustomEvent('achievement:new', { detail: badge }));
  });
  return newly;
}

/** Compact badge gallery for a profile/settings panel */
export function BadgeGallery() {
  const earned = getEarned();
  return (
    <div className="grid grid-cols-4 gap-2">
      {BADGES.map(b => {
        const isEarned = earned.includes(b.id);
        const style    = RARITY_STYLE[b.rarity];
        return (
          <div key={b.id} title={`${b.name}: ${b.desc}`}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
              isEarned
                ? 'cursor-default'
                : 'opacity-30 grayscale cursor-not-allowed'
            }`}
            style={{ borderColor: isEarned ? style.border : 'rgba(255,255,255,0.05)' }}>
            <span className="text-xl">{b.emoji}</span>
            <span className="font-mono text-[8px] text-center text-[rgba(186,230,253,0.5)] leading-tight">{b.name}</span>
          </div>
        );
      })}
    </div>
  );
}
