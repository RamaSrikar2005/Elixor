/**
 * LiveStreak — Animated, intensity-scaled streak badge.
 * Fire glow scales with streak length. Milestone bursts at 7/30/100.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const LEVELS = [
  { min: 0,   color: '#f59e0b', glow: 'rgba(245,158,11,0.4)',  label: 'Starting'  },
  { min: 3,   color: '#f97316', glow: 'rgba(249,115,22,0.5)',  label: 'Warming'   },
  { min: 7,   color: '#f43f5e', glow: 'rgba(244,63,94,0.6)',   label: 'On Fire'   },
  { min: 14,  color: '#ef4444', glow: 'rgba(239,68,68,0.65)',  label: 'Blazing'   },
  { min: 30,  color: '#dc2626', glow: 'rgba(220,38,38,0.75)',  label: 'Legendary' },
  { min: 100, color: '#7c3aed', glow: 'rgba(124,58,237,0.8)',  label: 'Mythic'    },
];

function getLevel(streak) {
  return [...LEVELS].reverse().find(l => streak >= l.min) || LEVELS[0];
}

const MILESTONES = [7, 14, 30, 50, 100, 150, 200, 365];

export default function LiveStreak({ streak = 0, size = 'md' }) {
  const [showMilestone, setMilestone] = useState(false);
  const level = getLevel(streak);
  const isMilestone = MILESTONES.includes(streak);

  useEffect(() => {
    if (isMilestone && streak > 0) {
      setMilestone(true);
      const t = setTimeout(() => setMilestone(false), 3500);
      return () => clearTimeout(t);
    }
  }, [streak]);

  const isLg = size === 'lg';
  const pulseScale = 1 + Math.min(streak / 200, 0.5);

  return (
    <div className="relative inline-flex items-center gap-2 select-none">
      {/* Milestone burst */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-bold text-sm px-3 py-1 rounded-full"
            style={{ background: level.glow.replace('0.', '0.9,').replace(',', ''), color: '#fff',
              boxShadow: `0 0 24px ${level.glow}` }}
          >
            🎉 {streak}d milestone!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fire emoji with layered animations */}
      <div className="relative flex-shrink-0" style={{ width: isLg ? 40 : 24, height: isLg ? 40 : 24 }}>
        {/* Outer glow pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ scale: [1, pulseScale, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ background: level.glow, filter: 'blur(4px)' }}
        />
        {/* Inner glow */}
        <motion.div
          className="absolute inset-1 rounded-full"
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          style={{ background: level.glow, filter: 'blur(2px)' }}
        />
        {/* Fire icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: isLg ? 24 : 14 }}
          animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          🔥
        </motion.div>
      </div>

      {/* Streak count */}
      <div>
        <motion.div
          className="font-display font-bold leading-none"
          style={{ color: level.color, fontSize: isLg ? 28 : 14,
            textShadow: `0 0 12px ${level.glow}` }}
          animate={{ textShadow: [`0 0 8px ${level.glow}`, `0 0 20px ${level.glow}`, `0 0 8px ${level.glow}`] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {streak}
          {isLg && <span className="text-sm font-normal opacity-60 ml-1">days</span>}
        </motion.div>
        {isLg && (
          <div className="font-mono text-[10px] mt-0.5" style={{ color: level.color + 'aa' }}>
            {level.label} streak
          </div>
        )}
      </div>
    </div>
  );
}
