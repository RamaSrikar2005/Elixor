import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#0ea5e9','#7c3aed','#f59e0b','#10b981','#f43f5e','#06b6d4','#a78bfa','#fb923c'];

const FALLBACK = [
  { category: 'Food',          total: 12450 },
  { category: 'Shopping',      total: 8200  },
  { category: 'Utilities',     total: 6800  },
  { category: 'Health',        total: 3200  },
  { category: 'Entertainment', total: 2800  },
  { category: 'Transport',     total: 1800  },
];

const RADIAN = Math.PI / 180;
const fmt    = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Custom label rendered outside each slice */
const renderLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.05) return null;
  const r  = outerRadius + 22;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="middle"
      fill="rgba(186,230,253,0.65)" fontFamily="JetBrains Mono" fontSize={9}>
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
};

/** Custom tooltip */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  const total = p.total ?? value;
  return (
    <div className="bg-[rgba(4,8,15,0.95)] border border-[rgba(14,165,233,0.2)] rounded-xl px-3 py-2 text-xs">
      <div className="font-semibold text-[#bae6fd] mb-1">{name}</div>
      <div className="font-mono text-[#0ea5e9]">{fmt(total)}</div>
      <div className="font-mono text-[rgba(186,230,253,0.4)]">{(p.pct * 100).toFixed(1)}%</div>
    </div>
  );
};

/** Compact legend row */
const CompactLegend = ({ data }) => (
  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
    {data.map((item, i) => (
      <div key={item.category} className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
        <span className="font-mono text-[9px] text-[rgba(186,230,253,0.5)] truncate">{item.category}</span>
        <span className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] ml-auto flex-shrink-0">
          {(item.pct * 100).toFixed(0)}%
        </span>
      </div>
    ))}
  </div>
);

export default function SpendDonut({ data, compact = false }) {
  const raw   = (data?.length ? data : FALLBACK).slice(0, 8);
  const grand = raw.reduce((s, r) => s + r.total, 0);
  const d     = raw.map(r => ({ ...r, pct: grand > 0 ? r.total / grand : 0 }));

  if (compact) {
    // Compact version for dashboard widget
    return (
      <div>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={d} dataKey="total" nameKey="category"
              cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2}>
              {d.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]}
                  stroke="rgba(4,8,15,0.5)" strokeWidth={1.5} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <CompactLegend data={d} />
      </div>
    );
  }

  // Full version for Finance page
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={d}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            labelLine={false}
            label={renderLabel}
          >
            {d.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]}
                stroke="rgba(4,8,15,0.5)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Category table */}
      <div className="mt-3 space-y-0">
        {d.map((item, i) => (
          <div key={item.category} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-[rgba(186,230,253,0.6)] flex-1">{item.category}</span>
            <span className="font-mono text-[10px]" style={{ color: COLORS[i % COLORS.length] }}>
              {(item.pct * 100).toFixed(1)}%
            </span>
            <span className="font-mono text-[10px] text-[rgba(186,230,253,0.45)] w-20 text-right">
              {fmt(item.total)}
            </span>
          </div>
        ))}
        {grand > 0 && (
          <div className="flex items-center justify-between pt-2 font-semibold text-xs">
            <span className="text-[rgba(186,230,253,0.5)]">Total</span>
            <span className="font-mono text-[#bae6fd]">{fmt(grand)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
