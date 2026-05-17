import { useState } from 'react';
import { Plus, Trash2, ChevronDown, Calendar, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { motion, AnimatePresence } from 'framer-motion';

const TAG_STYLES = {
  Work:     'text-[#0ea5e9] bg-[rgba(14,165,233,0.1)]  border-[rgba(14,165,233,0.2)]',
  Health:   'text-[#10b981] bg-[rgba(16,185,129,0.1)]  border-[rgba(16,185,129,0.2)]',
  Growth:   'text-[#a78bfa] bg-[rgba(124,58,237,0.1)]  border-[rgba(124,58,237,0.2)]',
  Finance:  'text-[#f59e0b] bg-[rgba(245,158,11,0.1)]  border-[rgba(245,158,11,0.2)]',
  Personal: 'text-[#f43f5e] bg-[rgba(244,63,94,0.1)]   border-[rgba(244,63,94,0.2)]',
  Custom:   'text-[#06e5d4] bg-[rgba(6,229,212,0.1)]   border-[rgba(6,229,212,0.2)]',
};

const PRIORITY_STYLES = {
  critical: { dot: 'bg-[#f43f5e]', label: '🔴', ring: 'ring-[rgba(244,63,94,0.2)]' },
  high:     { dot: 'bg-[#f59e0b]', label: '🟠', ring: 'ring-[rgba(245,158,11,0.2)]' },
  medium:   { dot: 'bg-[#0ea5e9]', label: '🔵', ring: 'ring-[rgba(14,165,233,0.2)]' },
  low:      { dot: 'bg-[rgba(186,230,253,0.2)]', label: '⚪', ring: '' },
};

function dueDateColor(date) {
  if (!date) return '';
  const diff = new Date(date) - new Date();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0)  return 'text-[#f43f5e]';
  if (days < 1)  return 'text-[#f59e0b]';
  if (days < 3)  return 'text-[#0ea5e9]';
  return 'text-[rgba(186,230,253,0.4)]';
}

function dueDateLabel(date) {
  if (!date) return null;
  const diff = new Date(date) - new Date();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

const EMPTY_FORM = { text: '', tag: 'Work', priority: 'medium', dueDate: '', notes: '' };

export default function TaskList({ compact = false }) {
  const { tasks, toggleTask, deleteTask, createTask, loading } = useAppStore();
  const [adding,    setAdding]    = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [showExtra, setShowExtra] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    await createTask({
      text:     form.text.trim(),
      tag:      form.tag,
      priority: form.priority,
      dueDate:  form.dueDate || null,
      notes:    form.notes || null,
    });
    setForm(EMPTY_FORM);
    setAdding(false);
    setShowExtra(false);
  };

  // Sort: undone first, then by priority, then by due date
  const PRIO_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pr = (PRIO_RANK[a.priority] || 2) - (PRIO_RANK[b.priority] || 2);
    if (pr !== 0) return pr;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  if (loading.tasks) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}</div>;
  }

  return (
    <div>
      <AnimatePresence>
        {sorted.map(t => {
          const ps = PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.medium;
          return (
            <motion.div key={t._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="task-row group"
            >
              {/* Priority dot */}
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />

              {/* Checkbox */}
              <button
                onClick={() => toggleTask(t._id, !t.done)}
                className={`task-check flex-shrink-0 ${t.done ? 'done' : ''}`}>
                {t.done && <span className="text-[#10b981] text-[10px] font-bold">✓</span>}
              </button>

              {/* Text + meta */}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium leading-snug ${
                  t.done ? 'line-through text-[rgba(186,230,253,0.3)]' : 'text-[#bae6fd]'
                }`}>
                  {t.text}
                </div>
                {!compact && t.dueDate && (
                  <div className={`font-mono text-[10px] mt-0.5 flex items-center gap-1 ${dueDateColor(t.dueDate)}`}>
                    <Calendar size={9} />
                    {dueDateLabel(t.dueDate)}
                  </div>
                )}
              </div>

              {/* Tag */}
              {!compact && (
                <span className={`chip text-[9px] px-1.5 py-0 ${TAG_STYLES[t.tag] || TAG_STYLES.Work}`}>
                  {t.tag}
                </span>
              )}

              {/* XP */}
              <span className="font-mono text-[10px] text-[#0ea5e9] opacity-60 flex-shrink-0">
                +{t.xp}xp
              </span>

              {/* Delete */}
              <button onClick={() => deleteTask(t._id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[rgba(244,63,94,0.4)] hover:text-[#f43f5e] flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Add mission form */}
      <AnimatePresence>
        {adding ? (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAdd}
            className="mt-4 space-y-3 overflow-hidden"
          >
            {/* Mission name */}
            <input autoFocus
              className="input-field py-2.5 text-sm"
              placeholder="Mission name…"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            />

            {/* Tag + Priority row */}
            <div className="flex gap-2">
              <select
                className="input-field py-2 text-sm flex-1"
                value={form.tag}
                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}>
                {['Work', 'Health', 'Growth', 'Finance', 'Personal', 'Custom'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                className="input-field py-2 text-sm flex-1"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {[
                  { v: 'critical', l: '🔴 Critical' },
                  { v: 'high',     l: '🟠 High' },
                  { v: 'medium',   l: '🔵 Medium' },
                  { v: 'low',      l: '⚪ Low' },
                ].map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>

            {/* Expand / collapse extra fields */}
            <button type="button"
              onClick={() => setShowExtra(x => !x)}
              className="flex items-center gap-1 font-mono text-[10px] text-[rgba(186,230,253,0.35)] hover:text-[rgba(186,230,253,0.6)] transition-colors">
              <ChevronDown size={12} className={`transition-transform ${showExtra ? 'rotate-180' : ''}`} />
              {showExtra ? 'Less options' : 'More options (due date, notes)'}
            </button>

            <AnimatePresence>
              {showExtra && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden">
                  <div>
                    <div className="label">Due Date</div>
                    <input type="date" className="input-field py-2 text-sm"
                      value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <div className="label">Notes</div>
                    <textarea className="input-field py-2 text-sm resize-none" rows={2}
                      placeholder="Optional notes…"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="btn-primary btn-sm flex-1 justify-center">
                Add Mission
              </button>
              <button type="button"
                onClick={() => { setAdding(false); setForm(EMPTY_FORM); setShowExtra(false); }}
                className="btn-ghost btn-sm px-3">
                <X size={14} />
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setAdding(true)}
            className="mt-3 flex items-center gap-2 text-[rgba(186,230,253,0.35)] hover:text-[#0ea5e9] text-sm transition-colors w-full py-1">
            <Plus size={14} /> Add mission
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
