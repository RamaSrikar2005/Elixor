import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * GrapeChart — renders a 30-day habit completion history
 * as a diamond/grape-cluster of circles.
 * Layout: rows of [3,4,5,6,5,4,3] = 30 nodes.
 */

const ROWS = [3, 4, 5, 6, 5, 4, 3];
const DOT  = 13;   // circle diameter px
const GAP  = 4;    // gap between circles
const STEP = DOT + GAP;

function dateStr(d) { return d.toISOString().split('T')[0]; }

function last30() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (29 - i)); return d;
  });
}

const ACCENT = {
  '#0ea5e9': { fill: 'rgba(14,165,233,0.85)',   glow: '0 0 8px rgba(14,165,233,0.6)' },
  '#10b981': { fill: 'rgba(16,185,129,0.85)',   glow: '0 0 8px rgba(16,185,129,0.6)' },
  '#f59e0b': { fill: 'rgba(245,158,11,0.85)',   glow: '0 0 8px rgba(245,158,11,0.6)' },
  '#7c3aed': { fill: 'rgba(124,58,237,0.85)',   glow: '0 0 8px rgba(124,58,237,0.6)' },
  '#f43f5e': { fill: 'rgba(244,63,94,0.85)',    glow: '0 0 8px rgba(244,63,94,0.6)'  },
  '#06e5d4': { fill: 'rgba(6,229,212,0.85)',    glow: '0 0 8px rgba(6,229,212,0.6)'  },
};

function getAccent(color) {
  return ACCENT[color] || ACCENT['#0ea5e9'];
}

function GrapeBunch({ habit, days, todayStr }) {
  const [hovered, setHovered] = useState(null);

  const dayMap = new Map(
    days.map(d => {
      const ds = dateStr(d);
      const ci = habit.checkIns?.find(c => new Date(c.date).toISOString().split('T')[0] === ds);
      return [ds, { date: d, done: ci?.done || false }];
    })
  );

  const dayList = days; // 30 items
  const color   = habit.color || '#0ea5e9';
  const { fill, glow } = getAccent(color);

  // Completion rate
  const done30 = days.filter(d => dayMap.get(dateStr(d))?.done).length;
  const pct    = Math.round((done30 / 30) * 100);

  // Max row width in px
  const maxCols  = 6;
  const svgW     = maxCols * STEP + DOT;
  const svgH     = ROWS.length * STEP + DOT;

  let idx = 0;
  const nodes = [];

  ROWS.forEach((count, rowI) => {
    const offsetX = ((maxCols - count) / 2) * STEP;
    for (let colI = 0; colI < count; colI++) {
      const day = dayList[idx++];
      if (!day) return;
      const ds  = dateStr(day);
      const rec = dayMap.get(ds) || { done: false };
      const cx  = offsetX + colI * STEP + DOT / 2 + STEP / 2;
      const cy  = rowI * STEP + DOT / 2 + STEP / 2;
      const isToday = ds === todayStr;
      nodes.push({ cx, cy, done: rec.done, ds, isToday, idx: idx - 1 });
    }
  });

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] transition-all">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">{habit.emoji}</span>
          <span className="text-xs font-semibold text-[rgba(186,230,253,0.7)] truncate max-w-[80px]">{habit.name}</span>
        </div>
        <div className="font-mono text-[10px] font-bold" style={{ color }}>
          {pct}%
        </div>
      </div>

      {/* Grape cluster SVG */}
      <svg width={svgW} height={svgH} style={{ overflow: 'visible' }}>
        {nodes.map((n, i) => (
          <motion.circle
            key={n.ds}
            cx={n.cx}
            cy={n.cy}
            r={DOT / 2}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.012, type: 'spring', stiffness: 200 }}
            fill={n.done ? fill : 'rgba(255,255,255,0.05)'}
            stroke={n.isToday ? color : n.done ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}
            strokeWidth={n.isToday ? 1.5 : 0.8}
            style={{
              filter: n.done ? `drop-shadow(${glow})` : undefined,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="text-[10px] font-mono px-2 py-1 rounded-lg bg-[rgba(4,8,15,0.9)] border border-[rgba(14,165,233,0.2)] text-center pointer-events-none">
          <span className={hovered.done ? 'text-[#10b981]' : 'text-[rgba(186,230,253,0.4)]'}>
            {new Date(hovered.ds).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            {' · '}{hovered.done ? '✓ Done' : '○ Missed'}
          </span>
        </div>
      )}

      {/* Mini progress bar */}
      <div className="w-full h-0.5 rounded-full bg-white/[0.05]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Streak badge */}
      {habit.streak > 0 && (
        <div className="font-mono text-[9px] text-[#f59e0b]">🔥 {habit.streak}d streak</div>
      )}
    </div>
  );
}

export default function GrapeChart({ habits }) {
  const days     = last30();
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = dateStr(today);

  if (!habits?.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-display font-bold text-base">Habit Clusters</div>
        <div className="flex items-center gap-3 font-mono text-[9px] text-[rgba(186,230,253,0.3)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0ea5e9] inline-block" />Completed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/10 inline-block" />Missed
          </span>
          <span className="text-[rgba(186,230,253,0.2)]">· last 30 days</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {habits.map(h => (
          <GrapeBunch key={h._id} habit={h} days={days} todayStr={todayStr} />
        ))}
      </div>
    </div>
  );
}
