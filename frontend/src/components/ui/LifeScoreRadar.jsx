/**
 * LifeScoreRadar — spider chart showing all life-domain scores.
 * Uses recharts RadarChart with custom styling.
 */
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

const CustomTick = ({ payload, x, y, textAnchor }) => (
  <text x={x} y={y} textAnchor={textAnchor} fill="rgba(186,230,253,0.5)"
    fontFamily="JetBrains Mono" fontSize={9}>
    {payload.value}
  </text>
);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { subject, A } = payload[0].payload;
  return (
    <div className="bg-[rgba(4,8,15,0.95)] border border-[rgba(14,165,233,0.2)] rounded-xl px-3 py-2 text-xs">
      <div className="font-mono text-[rgba(186,230,253,0.5)] mb-0.5">{subject}</div>
      <div className="font-display font-bold text-[#0ea5e9] text-base">{Math.round(A)}</div>
    </div>
  );
};

function clamp(v, max = 100) { return Math.min(Math.max(v, 0), max); }

export default function LifeScoreRadar({ dashboard, height = 220 }) {
  const d = dashboard;

  const taskScore    = clamp(d?.scores?.productivity ?? 0);
  const habitScore   = clamp(d?.scores?.habit ?? 0);
  const focusScore   = clamp(Math.min(parseFloat(d?.focus?.todayHours ?? 0) / 4 * 100, 100));
  const financeScore = clamp(parseFloat(d?.finance?.savingsRate ?? '0'));
  const streakScore  = clamp(Math.min((d?.user?.streak ?? 0) / 30 * 100, 100));

  const overall = Math.round((taskScore + habitScore + focusScore + financeScore + streakScore) / 5);

  const data = [
    { subject: 'Tasks',   A: taskScore   },
    { subject: 'Habits',  A: habitScore  },
    { subject: 'Focus',   A: focusScore  },
    { subject: 'Finance', A: financeScore },
    { subject: 'Streak',  A: streakScore },
  ];

  return (
    <div>
      {/* Overall Life Score */}
      <div className="flex items-baseline gap-2 mb-2">
        <div className="font-display font-bold text-4xl text-[#0ea5e9] leading-none">{overall}</div>
        <div className="font-mono text-xs text-[rgba(186,230,253,0.35)]">/100 · Life Score</div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="rgba(14,165,233,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={<CustomTick />} />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            dataKey="A"
            stroke="#0ea5e9"
            fill="rgba(14,165,233,0.12)"
            strokeWidth={1.5}
            dot={{ fill: '#0ea5e9', r: 2.5, strokeWidth: 0 }}
          />
          {/* Second radar for visual depth */}
          <Radar
            dataKey="A"
            stroke="rgba(124,58,237,0.4)"
            fill="rgba(124,58,237,0.05)"
            strokeWidth={0.5}
            strokeDasharray="3 3"
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Domain breakdown bars */}
      <div className="space-y-2 mt-2">
        {data.map(({ subject, A }) => (
          <div key={subject}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[rgba(186,230,253,0.5)]">{subject}</span>
              <span className="font-mono text-[rgba(186,230,253,0.6)]">{Math.round(A)}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{
                width: `${A}%`,
                background: A >= 80 ? '#10b981' : A >= 60 ? '#0ea5e9' : A >= 40 ? '#f59e0b' : '#f43f5e',
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
