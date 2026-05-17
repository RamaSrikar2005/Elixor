import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useAppStore }  from '../store/appStore.js';
import { useAuthStore } from '../store/authStore.js';
import StatCard          from '../components/ui/StatCard.jsx';
import TaskList          from '../components/ui/TaskList.jsx';
import NBABar            from '../components/ui/NBABar.jsx';
import ConsistencyGraph  from '../components/ui/ConsistencyGraph.jsx';
import SpendDonut        from '../components/charts/SpendDonut.jsx';
import { FocusScoreCard }  from '../components/ui/FocusScoreLogo.jsx';
import StudyDashWidget    from '../components/ui/StudyDashWidget.jsx';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { ease: [0.16,1,0.3,1], duration: 0.45 } } };
const fmt = (n) => n != null ? Math.round(n).toLocaleString('en-IN') : '—';

export default function DashboardPage() {
  const { user }   = useAuthStore();
  const { dashboard, loadDashboard, loadTasks, loading } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadDashboard(); loadTasks(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadTasks()]);
    setRefreshing(false);
  };

  const d        = dashboard;
  const xp       = d?.user?.xp || user?.xp || 0;
  const lvl      = d?.user?.level || user?.level || 1;
  const xpToNext = d?.user?.xpToNext || 1000;
  const xpPct    = Math.min(((xp % 5000) / Math.max(xpToNext + (xp % 5000), 1)) * 100, 100);

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      className="space-y-5 max-w-screen-xl mx-auto">

      {/* NBA bar */}
      <motion.div variants={item}><NBABar dashboard={d} /></motion.div>

      {/* Hero XP card */}
      <motion.div variants={item}>
        <div className="card card-ion p-5" style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.05),rgba(124,58,237,0.05))' }}>
          <div className="flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-5">
              <XPRing level={lvl} xpPct={xpPct} />
              <div>
                <div className="font-mono text-[9px] tracking-widest uppercase text-[rgba(186,230,253,0.35)] mb-1.5">
                  {d?.user?.rank || user?.rank || 'Explorer'} · Intelligence Layer
                </div>
                <div className="font-display font-bold text-2xl tracking-tight mb-2.5">
                  {d?.user?.name || user?.name || 'ELIXOR'}
                </div>
                <div className="xp-track w-60 mb-1.5">
                  <div className="xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)]">
                  {fmt(xp)} XP · {fmt(xpToNext)} to next rank
                </div>
              </div>
            </div>
            <div className="flex gap-6 flex-wrap items-center">
              <StatPill icon="🔥" value={d?.user?.streak ?? user?.streak ?? 0} label="Day Streak"  color="text-[#f59e0b]" />
              <StatPill icon="✅" value={`${fmt(d?.tasks?.done)}/${fmt(d?.tasks?.total)}`} label="Done" color="text-[#10b981]" />
              <StatPill icon="🧠" value={`${d?.habits?.checkedToday??0}/${d?.habits?.total??0}`} label="Habits" color="text-[#a78bfa]" />
              {/* Focus Score Logo */}
              <div className="flex flex-col items-center gap-1">
                <FocusScoreCard
                  score={d?.scores?.productivity ?? 0}
                  hours={d?.focus?.todayHours || '0'}
                  sessions={d?.focus?.totalSessions || 0}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.3)] uppercase tracking-widest">Live Stats</div>
          <button onClick={refresh} disabled={refreshing}
            className="flex items-center gap-1.5 font-mono text-[10px] text-[rgba(186,230,253,0.35)] hover:text-[#0ea5e9] transition-colors disabled:opacity-40">
            <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Daily Completion"
            value={d?.tasks?.completion || '0%'}
            sub={`${fmt(d?.tasks?.done)} of ${fmt(d?.tasks?.total)} tasks`}
            accent="ion" icon="✅" />
          <StatCard label="Focus Score"
            value={`${d?.scores?.productivity ?? '—'}/100`}
            sub={`${d?.focus?.todayHours || 0}h today`}
            accent="plasma" icon="💻" />
          <StatCard label="Budget Used"
            value={`₹${fmt(d?.finance?.expense)}`}
            sub={`₹${fmt(d?.finance?.savings)} saved · ${d?.finance?.savingsRate || '0%'}`}
            accent="solar" icon="💰" />
          <StatCard label="Habit Score"
            value={`${d?.scores?.habit ?? 0}%`}
            sub={`${d?.habits?.checkedToday ?? 0}/${d?.habits?.total ?? 0} done today`}
            accent="bio" icon="⚡" />
        </div>
      </motion.div>

      {/* Mission Queue + Expenditure + Study widget */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px_260px] gap-5">
          {/* Mission Queue */}
          <div className="card card-ion p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-bold text-base">Mission Queue</div>
                <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">
                  {d?.tasks?.completion || '0%'} complete
                  {d?.tasks?.overdue > 0 && <span className="text-[#f43f5e] ml-1">· {d.tasks.overdue} overdue</span>}
                </div>
              </div>
              {loading.tasks && <div className="w-3 h-3 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />}
            </div>
            <TaskList compact />
          </div>

          {/* Expenditure Map */}
          <div className="card card-solar p-5">
            <div className="font-display font-bold text-sm mb-0.5">Expenditure Map</div>
            <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-1">
              {new Date().toLocaleString('en',{month:'short',year:'numeric'})} · {d?.finance?.topCategory || '—'} is top
            </div>
            {d?.finance?.byCategory?.length ? (
              <SpendDonut data={d.finance.byCategory} compact />
            ) : (
              <div className="flex items-center justify-center h-32 font-mono text-xs text-[rgba(186,230,253,0.2)]">
                No transactions yet
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between text-xs">
              <span className="text-[rgba(186,230,253,0.4)]">Total spent</span>
              <span className="font-mono font-semibold text-[#f59e0b]">₹{fmt(d?.finance?.expense)}</span>
            </div>
          </div>

          {/* Study Engine widget */}
          <StudyDashWidget />
        </div>
      </motion.div>

      {/* Productivity Wave */}
      <motion.div variants={item}>
        <div className="card card-ion p-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="font-display font-bold text-base">Productivity Wave</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">
                Weighted score: tasks 35% · habits 30% · focus 20% · streak 10%
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0ea5e9]"/>Productivity</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#7c3aed]"/>XP</span>
            </div>
          </div>
          <ConsistencyGraph data={d?.trend || []} height={150} showXP />
        </div>
      </motion.div>

      {/* AI insights strip */}
      {d && (
        <motion.div variants={item}>
          <div className="card p-5" style={{ background:'linear-gradient(135deg,rgba(14,165,233,0.04),rgba(124,58,237,0.04))', borderColor:'rgba(14,165,233,0.1)' }}>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[rgba(14,165,233,0.6)] mb-3">AI Intelligence Feed</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  icon: '⚡', bg: 'rgba(14,165,233,0.08)',
                  title: 'Productivity',
                  body: d.scores?.productivity >= 80
                    ? `Outstanding! Score at ${d.scores.productivity}/100 — you're in the top performance tier.`
                    : d.scores?.productivity >= 50
                    ? `Score at ${d.scores.productivity}/100. Complete pending tasks to push past 80.`
                    : `Score at ${d.scores?.productivity||0}/100. Start a focus session to boost this significantly.`,
                },
                {
                  icon: '🔥', bg: 'rgba(245,158,11,0.08)',
                  title: 'Streak',
                  body: d.user?.streak > 0
                    ? `${d.user.streak}-day streak active. ${d.habits?.checkedToday < d.habits?.total ? `Check ${d.habits.total - d.habits.checkedToday} more habit${d.habits.total - d.habits.checkedToday > 1?'s':''} to protect it.` : 'All habits done today — streak safe!'}`
                    : 'Start your streak today — even one completed habit counts toward it.',
                },
                {
                  icon: '💰', bg: 'rgba(16,185,129,0.08)',
                  title: 'Finance',
                  body: d.finance?.savingsRate
                    ? `Saving at ${d.finance.savingsRate} this month. ${d.finance.topCategory ? `${d.finance.topCategory} is your largest category.` : ''} ${parseFloat(d.finance.savingsRate) >= 70 ? 'Exceptional discipline.' : 'Target 70%+ for financial freedom.'}`
                    : 'Add your first transaction to activate finance intelligence.',
                },
              ].map(ins => (
                <div key={ins.title} className="flex gap-3 p-3 rounded-xl" style={{ background: ins.bg }}>
                  <div className="text-xl flex-shrink-0">{ins.icon}</div>
                  <div>
                    <div className="text-xs font-bold text-[#bae6fd] mb-0.5">{ins.title}</div>
                    <div className="text-xs text-[rgba(186,230,253,0.55)] leading-relaxed">{ins.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function XPRing({ level, xpPct }) {
  const r = 37, circ = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0">
      <svg width="86" height="86" viewBox="0 0 86 86" style={{ transform:'rotate(-90deg)' }}>
        <circle cx="43" cy="43" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
        <circle cx="43" cy="43" r={r} fill="none" stroke="url(#lvlGrad)" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={circ - (xpPct/100)*circ} strokeLinecap="round"
          style={{ transition:'stroke-dashoffset 1.2s ease' }} />
        <defs>
          <linearGradient id="lvlGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold text-xl leading-none">{level}</span>
        <span className="font-mono text-[8px] text-[rgba(186,230,253,0.4)]">LVL</span>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label, color }) {
  return (
    <div className="text-center min-w-[52px]">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={`font-display font-bold text-2xl leading-none ${color}`}>{value}</div>
      <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-1">{label}</div>
    </div>
  );
}
