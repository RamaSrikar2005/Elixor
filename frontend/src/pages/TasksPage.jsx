import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore.js';
import TaskList from '../components/ui/TaskList.jsx';

const FILTERS = [
  { label: 'All',       value: 'all' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Done',      value: 'done' },
  { label: 'Critical',  value: 'critical' },
  { label: 'High',      value: 'high' },
];

const PRIO_COLORS = {
  critical: 'text-[#f43f5e]',
  high:     'text-[#f59e0b]',
  medium:   'text-[#0ea5e9]',
  low:      'text-[rgba(186,230,253,0.4)]',
};

export default function TasksPage() {
  const { tasks, loadTasks } = useAppStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTasks(); }, []);

  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const overdue = tasks.filter(t => !t.done && t.dueDate && new Date(t.dueDate) < new Date()).length;
  const critical = tasks.filter(t => !t.done && t.priority === 'critical').length;

  // Priority breakdown
  const byPriority = ['critical', 'high', 'medium', 'low'].map(p => ({
    label: p,
    count: tasks.filter(t => !t.done && t.priority === p).length,
  })).filter(x => x.count > 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Mission Queue</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">
            {done}/{total} complete · {pct}% done
            {overdue > 0 && <span className="text-[#f43f5e] ml-2">· {overdue} overdue</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {critical > 0 && (
            <div className="chip chip-coral">🔴 {critical} critical</div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between font-mono text-[10px] text-[rgba(186,230,253,0.3)] mb-1.5">
          <span>Overall progress</span>
          <span>{pct}%</span>
        </div>
        <div className="prog-track h-2 rounded-full">
          <div className="prog-fill bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] rounded-full"
            style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Priority breakdown chips */}
      {byPriority.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byPriority.map(({ label, count }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] font-mono text-xs">
              <span className={`font-semibold ${PRIO_COLORS[label]}`}>{count}</span>
              <span className="text-[rgba(186,230,253,0.4)] capitalize">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f.value
                ? 'bg-[rgba(14,165,233,0.15)] text-[#0ea5e9] border border-[rgba(14,165,233,0.25)]'
                : 'text-[rgba(186,230,253,0.4)] hover:text-[rgba(186,230,253,0.7)]'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Mission cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
        {/* Task list */}
        <div className="card card-ion p-6">
          <FilteredTaskList filter={filter} tasks={tasks} />
        </div>

        {/* Sidebar stats */}
        <div className="flex flex-col gap-4">
          {/* Today's completion */}
          <div className="card card-plasma p-5">
            <div className="label mb-4">Today's Stats</div>
            <div className="space-y-3">
              {[
                { label: 'Completed',  value: done,           color: 'text-[#10b981]' },
                { label: 'Remaining',  value: total - done,   color: 'text-[#0ea5e9]' },
                { label: 'Overdue',    value: overdue,        color: overdue > 0 ? 'text-[#f43f5e]' : 'text-[rgba(186,230,253,0.35)]' },
                { label: 'Total XP',   value: `${tasks.filter(t => t.done).reduce((s, t) => s + (t.xp || 0), 0)} xp`, color: 'text-[#f59e0b]' },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center text-sm">
                  <span className="text-[rgba(186,230,253,0.45)]">{s.label}</span>
                  <span className={`font-mono font-semibold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="card card-bio p-5">
            <div className="label mb-4">By Category</div>
            {['Work', 'Study', 'Health', 'Fitness', 'Growth', 'Finance', 'Personal', 'Custom']
              .map(tag => ({ tag, count: tasks.filter(t => t.tag === tag && !t.done).length }))
              .filter(x => x.count > 0)
              .map(({ tag, count }) => (
                <div key={tag} className="flex justify-between text-xs py-1.5 border-b border-white/[0.04] last:border-0">
                  <span className="text-[rgba(186,230,253,0.5)]">{tag}</span>
                  <span className="font-mono font-semibold text-[rgba(186,230,253,0.7)]">{count}</span>
                </div>
              ))
            }
            {tasks.filter(t => !t.done).length === 0 && (
              <div className="text-xs text-[rgba(186,230,253,0.25)] text-center py-2">All done! 🎉</div>
            )}
          </div>

          {/* AI tip */}
          <div className="card p-5" style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.05),rgba(124,58,237,0.05))', borderColor: 'rgba(14,165,233,0.12)' }}>
            <div className="label mb-2">AI Mission Tip</div>
            <p className="text-xs text-[rgba(186,230,253,0.55)] leading-relaxed">
              {critical > 0
                ? `You have ${critical} critical mission${critical > 1 ? 's' : ''} pending. Tackle these first — they carry the highest XP reward and deadline risk.`
                : overdue > 0
                ? `${overdue} mission${overdue > 1 ? 's are' : ' is'} overdue. Completing them now prevents productivity score deductions.`
                : total - done > 0
                ? `${total - done} missions remaining. Focus on high-priority items during your peak hours (morning) for maximum efficiency.`
                : 'All missions complete! Outstanding work. Add new goals to maintain your streak momentum.'
              }
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FilteredTaskList({ filter, tasks }) {
  const { loading } = useAppStore();

  const filtered = tasks.filter(t => {
    if (filter === 'pending')  return !t.done;
    if (filter === 'done')     return t.done;
    if (filter === 'critical') return !t.done && t.priority === 'critical';
    if (filter === 'high')     return !t.done && t.priority === 'high';
    return true;
  });

  if (loading.tasks) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>;
  }

  if (filtered.length === 0 && filter !== 'all') {
    return (
      <div className="text-center py-8 text-[rgba(186,230,253,0.25)] font-mono text-xs">
        No {filter} missions
      </div>
    );
  }

  return <TaskList />;
}
