import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Edit2, Zap } from 'lucide-react';
import { useAppStore } from '../store/appStore.js';
import { habitsApi }   from '../services/api.js';
import StatCard         from '../components/ui/StatCard.jsx';
import GrapeChart       from '../components/ui/GrapeChart.jsx';

const DAYS = 30;
const EMOJIS = ['✅','🏃','💧','📚','🧘','💪','✍️','🎯','🛌','🥗','🧠','🎸','💻','🌿','🔥'];
const COLORS  = ['#0ea5e9','#10b981','#f59e0b','#7c3aed','#f43f5e','#06e5d4'];
const AI_SUGGESTIONS = [
  { name: 'Cold Shower',   emoji: '🚿', reason: 'Boosts alertness +40% · best after workout' },
  { name: 'No-Screen 30m', emoji: '📵', reason: 'Adds 45 min effective sleep quality' },
  { name: 'Sunday Review', emoji: '📋', reason: '94% of top performers do weekly reviews' },
  { name: 'Gratitude Log', emoji: '🙏', reason: 'Reduces stress · improves focus baseline' },
];

function dateStr(d) { return d.toISOString().split('T')[0]; }
function last30Days() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (DAYS - 1 - i)); return d;
  });
}

const EMPTY_FORM = { name: '', emoji: '✅', color: '#0ea5e9' };

export default function HabitsPage() {
  const { habits, loadHabits, trackHabit, loading } = useAppStore();
  const [showAdd,  setShowAdd]  = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showAI,   setShowAI]   = useState(false);
  const [view,     setView]     = useState('grape'); // 'grape' | 'grid'

  useEffect(() => { loadHabits(); }, []);

  const days     = last30Days();
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = dateStr(today);

  // Stats
  let total = 0, possible = 0;
  habits.forEach(h => {
    days.filter(d => d <= today).forEach(d => {
      possible++;
      const ci = h.checkIns?.find(c => new Date(c.date).toISOString().split('T')[0] === dateStr(d));
      if (ci?.done) total++;
    });
  });
  const rate      = possible > 0 ? ((total / possible) * 100).toFixed(1) + '%' : '—';
  const todayDone = habits.filter(h =>
    h.checkIns?.some(c => new Date(c.date).toISOString().split('T')[0] === todayStr && c.done)
  ).length;

  const openAdd = () => { setForm(EMPTY_FORM); setEditHabit(null); setShowAdd(true); };
  const openEdit = (h) => { setForm({ name: h.name, emoji: h.emoji || '✅', color: h.color || '#0ea5e9' }); setEditHabit(h); setShowAdd(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editHabit) {
        await habitsApi.update(editHabit._id, { name: form.name.trim(), emoji: form.emoji, color: form.color });
      } else {
        await habitsApi.create({ name: form.name.trim(), emoji: form.emoji, color: form.color });
      }
      await loadHabits();
      setShowAdd(false); setForm(EMPTY_FORM); setEditHabit(null);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try { await habitsApi.update(id, { active: false }); await loadHabits(); }
    catch { /* ignore */ }
    setDeleting(null);
  };

  const addAISuggestion = (s) => {
    setForm({ name: s.name, emoji: s.emoji, color: '#0ea5e9' });
    setEditHabit(null); setShowAI(false); setShowAdd(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Habit Matrix</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">
            {todayDone}/{habits.length} done today · 30-day tracking
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAI(true)} className="btn-ghost btn-sm flex items-center gap-2">
            <Zap size={13} /> AI Suggest
          </button>
          <button onClick={openAdd} className="btn-primary btn-sm flex items-center gap-2">
            <Plus size={13} /> New Habit
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Active Habits"   value={habits.length}                   accent="ion"    icon="🔄" />
        <StatCard label="Today Completed" value={`${todayDone}/${habits.length}`} accent="bio"    icon="✅" />
        <StatCard label="30-day Rate"     value={rate}                            accent="plasma" icon="📊" />
      </div>

      {/* View toggle */}
      {habits.length > 0 && (
        <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 w-fit">
          {[{ id: 'grape', l: '🍇 Cluster View' }, { id: 'grid', l: '📅 Grid View' }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v.id
                  ? 'bg-[rgba(14,165,233,0.15)] text-[#0ea5e9] border border-[rgba(14,165,233,0.25)]'
                  : 'text-[rgba(186,230,253,0.4)] hover:text-[rgba(186,230,253,0.7)]'
              }`}>
              {v.l}
            </button>
          ))}
        </div>
      )}

      {/* Grape Cluster View */}
      <AnimatePresence mode="wait">
        {view === 'grape' && habits.length > 0 && (
          <motion.div key="grape" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card card-ion p-5">
            <GrapeChart habits={habits} />
          </motion.div>
        )}

        {/* Grid View */}
        {view === 'grid' && (
          <motion.div key="grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="card card-ion p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold text-base">Monthly Grid</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.3)]">
                {new Date().toLocaleString('en', { month: 'long', year: 'numeric' })}
              </div>
            </div>

            {loading.habits ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-8"/>)}</div>
            ) : habits.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🌱</div>
                <p className="font-mono text-xs text-[rgba(186,230,253,0.3)]">No habits yet</p>
                <button onClick={openAdd} className="btn-primary btn-sm mt-4">Create your first habit</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="text-left font-mono text-[9px] text-[rgba(186,230,253,0.3)] pb-3 pr-4 min-w-[140px] sticky left-0 bg-[rgba(8,14,26,0.85)]">Habit</th>
                      {days.map(d => (
                        <th key={dateStr(d)} className={`font-mono text-[9px] pb-3 px-0.5 ${dateStr(d)===todayStr?'text-[#0ea5e9]':'text-[rgba(186,230,253,0.3)]'}`}>
                          {d.getDate()}
                        </th>
                      ))}
                      <th className="pb-3 pl-4 w-14" />
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map(h => (
                      <motion.tr key={h._id} layout className="group">
                        <td className="pr-4 py-1.5 sticky left-0 bg-[rgba(8,14,26,0.85)] z-10">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base flex-shrink-0">{h.emoji}</span>
                            <span className="font-medium text-[13px] text-[rgba(186,230,253,0.7)] truncate max-w-[90px]">{h.name}</span>
                            {h.streak > 0 && <span className="font-mono text-[9px] text-[#f59e0b] flex-shrink-0">🔥{h.streak}</span>}
                          </div>
                        </td>
                        {days.map(d => {
                          const dStr = dateStr(d);
                          const ci   = h.checkIns?.find(c => new Date(c.date).toISOString().split('T')[0] === dStr);
                          const done = ci?.done;
                          const fut  = d > today;
                          return (
                            <td key={dStr} className="px-0.5 py-1.5 text-center">
                              <div
                                className={`h-dot mx-auto ${done?'done':''} ${fut?'future':''} ${dStr===todayStr?'ring-1 ring-[rgba(14,165,233,0.4)]':''}`}
                                style={done && h.color ? { background: h.color+'30', borderColor: h.color+'60' } : undefined}
                                onClick={() => !fut && trackHabit(h._id, dStr, !done)}
                              />
                            </td>
                          );
                        })}
                        <td className="pl-4 py-1.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(h)} className="p-1 text-[rgba(186,230,253,0.3)] hover:text-[#0ea5e9] transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => handleDelete(h._id)} disabled={deleting===h._id} className="p-1 text-[rgba(244,63,94,0.4)] hover:text-[#f43f5e] transition-colors disabled:opacity-30">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion bars */}
      {habits.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="card card-bio p-5">
            <div className="font-display font-bold text-base mb-4">Completion Rates</div>
            <div className="space-y-3">
              {habits.map(h => {
                const done30 = days.filter(d => d <= today)
                  .filter(d => h.checkIns?.some(c => new Date(c.date).toISOString().split('T')[0] === dateStr(d) && c.done)).length;
                const pct = days.filter(d => d <= today).length > 0
                  ? Math.round((done30 / days.filter(d => d <= today).length) * 100) : 0;
                return (
                  <div key={h._id}>
                    <div className="flex justify-between mb-1.5 text-xs">
                      <span className="text-[rgba(186,230,253,0.6)]">{h.emoji} {h.name}</span>
                      <span className="font-mono text-[rgba(186,230,253,0.5)]">{pct}%</span>
                    </div>
                    <div className="prog-track">
                      <motion.div className="prog-fill" style={{ background: h.color || '#0ea5e9' }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card card-plasma p-5">
            <div className="font-display font-bold text-base mb-4">AI Habit Insights</div>
            <div className="space-y-3">
              {habits.length > 0 && (() => {
                const sorted = [...habits].sort((a, b) => {
                  const ra = days.filter(d=>d<=today).filter(d=>a.checkIns?.some(c=>new Date(c.date).toISOString().split('T')[0]===dateStr(d)&&c.done)).length;
                  const rb = days.filter(d=>d<=today).filter(d=>b.checkIns?.some(c=>new Date(c.date).toISOString().split('T')[0]===dateStr(d)&&c.done)).length;
                  return ra - rb;
                });
                const lowest = sorted[0];
                return (
                  <div className="p-3 rounded-xl bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.1)]">
                    <div className="text-xs font-semibold text-[#bae6fd] mb-1">{lowest.emoji} {lowest.name} needs attention</div>
                    <div className="text-xs text-[rgba(186,230,253,0.5)] leading-relaxed">
                      This habit has your lowest consistency. Try habit stacking — link it to an existing daily routine for a 67% adherence boost.
                    </div>
                  </div>
                );
              })()}
              <div className="text-xs text-[rgba(186,230,253,0.45)] leading-relaxed">
                Tracking <strong className="text-[#bae6fd]">{habits.length}</strong> habits with a 30-day average of <strong className="text-[#0ea5e9]">{rate}</strong>.
                {parseFloat(rate) >= 70 ? ' Excellent — you\'re in the top performance tier.' : ' Focus on consistency over perfection.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={e => e.target===e.currentTarget && setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <div className="font-display font-bold text-lg">{editHabit?'Edit Habit':'New Habit'}</div>
                <button onClick={()=>setShowAdd(false)} className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors"><X size={18}/></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <div className="label">Emoji</div>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => setForm(f=>({...f,emoji:e}))}
                        className={`w-9 h-9 rounded-lg text-lg transition-all ${form.emoji===e?'bg-[rgba(14,165,233,0.2)] ring-1 ring-[rgba(14,165,233,0.4)]':'bg-white/[0.04] hover:bg-white/[0.08]'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="label">Habit Name</div>
                  <input autoFocus className="input-field" placeholder="e.g. Morning Run"
                    value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
                </div>
                <div>
                  <div className="label">Color</div>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))}
                        className={`w-7 h-7 rounded-full transition-all ${form.color===c?'scale-125 ring-2 ring-white/30':''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving||!form.name.trim()} className="btn-primary flex-1 justify-center disabled:opacity-50">
                    {saving?'Saving…':editHabit?'Save Changes':'Create Habit'}
                  </button>
                  <button type="button" onClick={()=>setShowAdd(false)} className="btn-ghost">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI suggestions modal */}
      <AnimatePresence>
        {showAI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={e => e.target===e.currentTarget && setShowAI(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="font-display font-bold text-lg">AI Habit Suggestions</div>
                  <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">Based on your productivity profile</div>
                </div>
                <button onClick={()=>setShowAI(false)} className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors"><X size={18}/></button>
              </div>
              <div className="space-y-3">
                {AI_SUGGESTIONS.map(s => (
                  <button key={s.name} onClick={()=>addAISuggestion(s)}
                    className="w-full text-left p-4 rounded-xl border border-[rgba(14,165,233,0.1)] bg-[rgba(14,165,233,0.04)] hover:bg-[rgba(14,165,233,0.08)] hover:border-[rgba(14,165,233,0.25)] transition-all group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <div className="font-semibold text-sm text-[#bae6fd] group-hover:text-white transition-colors">{s.name}</div>
                        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.45)] mt-0.5">{s.reason}</div>
                      </div>
                      <Plus size={14} className="ml-auto text-[rgba(14,165,233,0.5)] group-hover:text-[#0ea5e9] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
