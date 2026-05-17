import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tt = {
  contentStyle: { background: 'rgba(4,8,15,0.95)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, padding: '8px 12px' },
  labelStyle:   { color: 'rgba(186,230,253,0.6)', fontFamily: 'JetBrains Mono', fontSize: 10 },
  itemStyle:    { color: '#0ea5e9', fontFamily: 'JetBrains Mono', fontSize: 11 },
};

export default function MiniChart({ data }) {
  const chartData = data?.length
    ? data.slice(-7).map(t => ({
        name: new Date(t.date).toLocaleDateString('en', { weekday: 'short' }),
        score: t.productivityScore || 0,
      }))
    : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((n, i) => ({ name: n, score: [8,6,10,7,9,4,3][i] }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
        <Tooltip {...tt} />
        <Bar dataKey="score" radius={[4,4,0,0]}
          fill="url(#barGrad)" />
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0ea5e9" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.1} />
          </linearGradient>
        </defs>
      </BarChart>
    </ResponsiveContainer>
  );
}
