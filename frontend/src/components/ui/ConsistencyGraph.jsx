import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[rgba(4,8,15,0.95)] border border-[rgba(14,165,233,0.2)] rounded-xl px-3 py-2 text-xs">
      <div className="font-mono text-[rgba(186,230,253,0.5)] mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2" style={{ color: p.color }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="font-mono">{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

export default function ConsistencyGraph({ data = [], height = 160, showXP = false }) {
  const chartData = data?.length
    ? data.slice(-14).map(t => ({
        name:  new Date(t.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric' }),
        prod:  t.productivityScore || 0,
        xp:    t.xpEarned || 0,
      }))
    : Array.from({ length: 7 }, (_, i) => ({
        name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
        prod: [72, 85, 68, 91, 78, 55, 40][i],
        xp:   [350, 480, 290, 620, 410, 180, 120][i],
      }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }}
          axisLine={false} tickLine={false} domain={[0, 100]}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone" dataKey="prod" name="Productivity"
          stroke="#0ea5e9" strokeWidth={2} fill="url(#prodGrad)"
          dot={{ fill: '#0ea5e9', r: 2, strokeWidth: 0 }}
          activeDot={{ r: 4, fill: '#0ea5e9', stroke: 'rgba(14,165,233,0.3)', strokeWidth: 4 }}
        />
        {showXP && (
          <Area
            type="monotone" dataKey="xp" name="XP"
            stroke="#7c3aed" strokeWidth={2} fill="url(#xpGrad)"
            dot={false}
            activeDot={{ r: 3, fill: '#7c3aed' }}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
