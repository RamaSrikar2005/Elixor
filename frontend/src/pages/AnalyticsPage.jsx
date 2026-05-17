import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { useAppStore }  from '../store/appStore.js';
import StatCard          from '../components/ui/StatCard.jsx';
import ConsistencyGraph  from '../components/ui/ConsistencyGraph.jsx';
import LifeScoreRadar    from '../components/ui/LifeScoreRadar.jsx';
import { BadgeGallery }  from '../components/ui/AchievementSystem.jsx';

const tt = {
  contentStyle: { background: 'rgba(4,8,15,0.95)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 8, padding: '8px 12px' },
  itemStyle:    { fontFamily: 'JetBrains Mono', fontSize: 11 },
};

export default function AnalyticsPage() {
  const { dashboard, loadDashboard, loading } = useAppStore();
  useEffect(() => { loadDashboard(); }, []);

  const d     = dashboard;
  const trend = d?.trend || [];

  const lineData = trend.map(t => ({
    name: new Date(t.date).getDate() + '/' + (new Date(t.date).getMonth() + 1),
    prod: t.productivityScore || 0,
    xp:   t.xpEarned || 0,
  }));

  const weeks    = ['W1', 'W2', 'W3', 'W4'];
  const xpWeeks  = [0, 0, 0, 0];
  trend.forEach((t, i) => { xpWeeks[Math.min(Math.floor(i / 7), 3)] += t.xpEarned || 0; });

  // Heatmap: last 35 days
  const heatDays = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (34 - i));
    const ts = d.toISOString().split('T')[0];
    const snap = trend.find(t => t.date?.split?.('T')[0] === ts || (t.date && new Date(t.date).toISOString().split('T')[0] === ts));
    return { date: d, score: snap?.productivityScore || 0 };
  });

  const heatColor = (score) => {
    if (score === 0) return 'rgba(255,255,255,0.04)';
    if (score < 40)  return 'rgba(14,165,233,0.15)';
    if (score < 65)  return 'rgba(14,165,233,0.35)';
    if (score < 85)  return 'rgba(14,165,233,0.65)';
    return '#0ea5e9';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-5">

      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Analytics Core</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">Deep performance intelligence</p>
        </div>
        <div className="flex gap-2">
          <div className="chip chip-ion">30d</div>
          {loading.dashboard && (
            <div className="w-4 h-4 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin self-center" />
          )}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Productivity"  value={`${d?.scores?.productivity || '—'}/100`}  accent="ion"    icon="⚡" sub="This month" />
        <StatCard label="Habit Rate"    value={`${d?.scores?.habit || '—'}%`}             accent="bio"    icon="✅" sub="30-day average" />
        <StatCard label="Total XP"      value={d?.user?.xp?.toLocaleString('en-IN') || '—'} accent="plasma" icon="🎮" sub={`Lv.${d?.user?.level || 1}`} />
        <StatCard label="Savings Rate"  value={d?.finance?.savingsRate || '—'}            accent="solar"  icon="💰" sub="Monthly" />
      </div>

      {/* Consistency wave — full width */}
      <div className="card card-ion p-5">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="font-display font-bold text-base">Consistency Wave</div>
            <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">
              Productivity + XP · {trend.length || 7} days
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0ea5e9]" />Productivity</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]" />XP</span>
          </div>
        </div>
        <ConsistencyGraph data={trend} height={180} showXP />
      </div>

      {/* Activity heatmap */}
      <div className="card p-5">
        <div className="font-display font-bold text-base mb-1">Activity Heatmap</div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">Last 35 days — productivity score intensity</div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] text-center pb-1">{d}</div>
          ))}
          {heatDays.map((day, i) => (
            <div key={i} title={`${day.date.toLocaleDateString()} · ${day.score}/100`}
              className="aspect-square rounded-md transition-all hover:scale-110 cursor-pointer"
              style={{ background: heatColor(day.score) }} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 font-mono text-[9px] text-[rgba(186,230,253,0.3)]">
          <span>Less</span>
          {[0, 30, 55, 80, 95].map(s => (
            <div key={s} className="w-3 h-3 rounded-sm" style={{ background: heatColor(s) }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card card-ion p-5">
          <div className="font-display font-bold text-base mb-1">30-Day Trend</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">Productivity score over time</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={lineData.length ? lineData : [{ name: '—', prod: 0, xp: 0 }]}>
              <defs>
                <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip {...tt} />
              <Area type="monotone" dataKey="prod" name="Productivity" stroke="#0ea5e9" strokeWidth={2} fill="url(#aGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card card-plasma p-5">
          <div className="font-display font-bold text-base mb-1">Weekly XP</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">Gamification progress</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeks.map((w, i) => ({ name: w, xp: xpWeeks[i] || [820, 950, 760, 950][i] }))}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(186,230,253,0.3)', fontFamily: 'JetBrains Mono', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...tt} />
              <Bar dataKey="xp" fill="url(#barPurp)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barPurp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Focus + Finance breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card card-bio p-5">
          <div className="label mb-4">Focus Statistics</div>
          {[
            { l: 'Total Sessions', v: d?.focus?.totalSessions || 0,         c: 'text-[#10b981]' },
            { l: 'Total Hours',    v: `${d?.focus?.totalHours || 0}h`,       c: 'text-[#0ea5e9]' },
            { l: 'Avg per Day',    v: trend.length ? `${(parseFloat(d?.focus?.totalHours || 0) / trend.length).toFixed(1)}h` : '—', c: 'text-[#a78bfa]' },
            { l: 'Productivity Score', v: `${d?.scores?.productivity || 0}/100`, c: 'text-[#f59e0b]' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-[rgba(186,230,253,0.5)]">{s.l}</span>
              <span className={`font-mono text-sm font-semibold ${s.c}`}>{s.v}</span>
            </div>
          ))}
        </div>
        <div className="card card-solar p-5">
          <div className="label mb-4">Finance Summary</div>
          {[
            { l: 'Income',        v: `₹${Math.round(d?.finance?.income  || 0).toLocaleString('en-IN')}`, c: 'text-[#f59e0b]' },
            { l: 'Expenses',      v: `₹${Math.round(d?.finance?.expense || 0).toLocaleString('en-IN')}`, c: 'text-[#bae6fd]' },
            { l: 'Savings',       v: `₹${Math.round(d?.finance?.savings || 0).toLocaleString('en-IN')}`, c: 'text-[#10b981]' },
            { l: 'Savings Rate',  v: d?.finance?.savingsRate || '0%',                                     c: 'text-[#10b981]' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-[rgba(186,230,253,0.5)]">{s.l}</span>
              <span className={`font-mono text-sm font-semibold ${s.c}`}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Prediction card */}
      <div className="card p-5" style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.05),rgba(124,58,237,0.05))', borderColor: 'rgba(14,165,233,0.12)' }}>
        <div className="font-mono text-[10px] tracking-widest uppercase text-[rgba(14,165,233,0.6)] mb-3">AI Prediction Engine</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {[
            {
              label: 'This Week Forecast',
              value: d?.scores?.productivity
                ? `${Math.min(100, Math.round(d.scores.productivity * 1.05))}/100`
                : '—',
              detail: 'Based on current momentum',
              color: 'text-[#0ea5e9]',
            },
            {
              label: 'Habit Potential',
              value: d?.habits?.total > 0
                ? `${Math.min(100, Math.round((d.scores?.habit || 0) * 1.08))}%`
                : '—',
              detail: 'If you complete all habits daily',
              color: 'text-[#10b981]',
            },
            {
              label: 'XP Projection',
              value: d?.user?.xp != null
                ? `+${Math.round((d.user.xp || 0) * 0.15).toLocaleString('en-IN')}`
                : '—',
              detail: 'Estimated weekly gain',
              color: 'text-[#a78bfa]',
            },
          ].map(p => (
            <div key={p.label} className="flex flex-col gap-1">
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] uppercase tracking-wide">{p.label}</div>
              <div className={`font-display font-bold text-2xl ${p.color}`}>{p.value}</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)]">{p.detail}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Life Score Radar + Achievement Gallery */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card card-ion p-5">
          <div className="font-display font-bold text-base mb-1">Life Score</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">
            Composite across all domains · tasks, habits, focus, finance, streak
          </div>
          <LifeScoreRadar dashboard={d} height={220} />
        </div>

        <div className="card card-plasma p-5">
          <div className="font-display font-bold text-base mb-1">Achievement Gallery</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">
            {(()=>{ try { return JSON.parse(localStorage.getItem('elixor_badges')||'[]').length; } catch { return 0; }})()}/{16} badges earned
          </div>
          <BadgeGallery />
        </div>
      </div>
    </motion.div>
  );
}
