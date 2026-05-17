import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore }  from '../store/appStore.js';
import { financeApi }   from '../services/api.js';
import StatCard         from '../components/ui/StatCard.jsx';
import SpendDonut       from '../components/charts/SpendDonut.jsx';
import { Trash2, Plus, X, Download, TrendingUp, TrendingDown } from 'lucide-react';

/* ─── config ─────────────────────────────────────────────────── */
const fmt = (n) => n != null ? `₹${Math.round(n).toLocaleString('en-IN')}` : '₹—';

const CATEGORIES = [
  { v:'Food',          e:'🍔' },
  { v:'Shopping',      e:'🛍️' },
  { v:'Utilities',     e:'⚡' },
  { v:'Transport',     e:'🚌' },
  { v:'Health',        e:'🏥' },
  { v:'Education',     e:'📚' },
  { v:'Entertainment', e:'📱' },
  { v:'Rent',          e:'🏠' },
  { v:'Medical',       e:'💊' },
  { v:'Investment',    e:'📈' },
  { v:'Income',        e:'💼' },
  { v:'Other',         e:'💸' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.v, c.e]));

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: 'Food',
  description: '',
  date: new Date().toISOString().split('T')[0],
};

/* ─── CSV export ──────────────────────────────────────────────── */
function exportCSV(transactions) {
  const header = 'Date,Type,Category,Description,Amount\n';
  const rows = transactions.map(t =>
    `${new Date(t.date).toLocaleDateString('en-IN')},${t.type},${t.category},"${t.description || ''}",${t.amount}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `elixor-finance-${new Date().toISOString().slice(0,7)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/* ─── Add-transaction modal ───────────────────────────────────── */
function AddModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handle = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setErr('Enter a valid amount'); return;
    }
    setSaving(true);
    try {
      await financeApi.create({ ...form, amount: parseFloat(form.amount) });
      onSaved();
      onClose();
    } catch { setErr('Failed to save. Check backend.'); }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-lg">Add Transaction</div>
          <button onClick={onClose} className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors">
            <X size={18}/>
          </button>
        </div>

        {err && <div className="mb-3 p-2.5 rounded-xl bg-[rgba(244,63,94,0.08)] text-[#f43f5e] text-xs font-mono border border-[rgba(244,63,94,0.2)]">{err}</div>}

        <form onSubmit={handle} className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {['expense','income'].map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category: t === 'income' ? 'Income' : 'Food' }))}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm border transition-all capitalize"
                style={{
                  borderColor: form.type===t ? (t==='expense'?'rgba(244,63,94,0.4)':'rgba(16,185,129,0.4)') : 'rgba(255,255,255,0.06)',
                  background:  form.type===t ? (t==='expense'?'rgba(244,63,94,0.1)':'rgba(16,185,129,0.1)') : 'transparent',
                  color:       form.type===t ? (t==='expense'?'#f43f5e':'#10b981') : 'rgba(186,230,253,0.4)',
                }}>
                {t === 'expense' ? '💸 Expense' : '💰 Income'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <div className="label mb-1.5">Amount (₹)</div>
            <input type="number" step="0.01" min="0.01" className="input-field py-2.5 text-base"
              placeholder="0.00" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} autoFocus required/>
          </div>

          {/* Category */}
          <div>
            <div className="label mb-1.5">Category</div>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.filter(c => form.type === 'income' ? c.v === 'Income' : c.v !== 'Income').map(c => (
                <button key={c.v} type="button" onClick={() => setForm(f => ({ ...f, category: c.v }))}
                  className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border text-[10px] font-semibold transition-all"
                  style={{
                    borderColor: form.category===c.v ? '#0ea5e9' : 'rgba(255,255,255,0.06)',
                    background:  form.category===c.v ? 'rgba(14,165,233,0.12)' : 'transparent',
                    color:       form.category===c.v ? '#0ea5e9' : 'rgba(186,230,253,0.4)',
                  }}>
                  <span className="text-base">{c.e}</span>
                  {c.v.slice(0,6)}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="label mb-1.5">Description</div>
            <input className="input-field py-2.5 text-sm" placeholder="What was this for?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
          </div>

          {/* Date */}
          <div>
            <div className="label mb-1.5">Date</div>
            <input type="date" className="input-field py-2.5 text-sm"
              value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}/>
          </div>

          <button type="submit" disabled={saving}
            className="btn-primary w-full justify-center py-3 font-bold disabled:opacity-50">
            {saving ? 'Saving…' : `Add ${form.type === 'income' ? 'Income' : 'Expense'}`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function FinancePage() {
  const { transactions, finAnalytics, loadFinance, deleteTransaction, loading } = useAppStore();
  const [adding,   setAdding]   = useState(false);
  const [filter,   setFilter]   = useState('all');   // all | income | expense
  const [catFilter,setCatFilter]= useState('');
  const [deleting, setDeleting] = useState(null);    // tx _id being deleted

  useEffect(() => { loadFinance(); }, []);

  const a = finAnalytics;

  const savingsPct = a?.income > 0 ? Math.round(((a.income - a.expense) / a.income) * 100) : 0;
  const healthColor = savingsPct >= 30 ? '#10b981' : savingsPct >= 10 ? '#f59e0b' : '#f43f5e';

  const filtered = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => !catFilter || t.category === catFilter);

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteTransaction(id);
    setDeleting(null);
  };

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
      className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Finance Intelligence</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">AI-powered money OS · {new Date().toLocaleString('en',{month:'long',year:'numeric'})}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(transactions)}
            className="btn-ghost btn-sm flex items-center gap-1.5">
            <Download size={13}/> CSV
          </button>
          <button onClick={() => setAdding(true)} className="btn-primary btn-sm flex items-center gap-1.5">
            <Plus size={13}/> Transaction
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monthly Income"  value={fmt(a?.income)}  accent="bio"   icon="💼" sub="this month"/>
        <StatCard label="Total Spent"     value={fmt(a?.expense)} accent="coral" icon="💳" sub={`${filtered.filter(t=>t.type==='expense').length} transactions`}/>
        <StatCard label="Net Savings"     value={fmt(a?.savings)} accent="solar" icon="🏦"
          sub={<span style={{color:healthColor}}>{savingsPct >= 0 ? `+${savingsPct}%` : `${savingsPct}%`} saved</span>}/>
        <StatCard label="Health Score"
          value={<span style={{color:healthColor}}>{savingsPct >= 30 ? 'Healthy' : savingsPct >= 10 ? 'Caution' : 'At Risk'}</span>}
          accent={savingsPct >= 30 ? 'bio' : savingsPct >= 10 ? 'solar' : 'coral'}
          icon={savingsPct >= 30 ? '✅' : savingsPct >= 10 ? '⚠️' : '🚨'}
          sub={`Target: 30%+ savings`}/>
      </div>

      {/* Savings progress bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)] uppercase tracking-widest flex items-center gap-1.5">
            {savingsPct >= 0 ? <TrendingUp size={11} className="text-[#10b981]"/> : <TrendingDown size={11} className="text-[#f43f5e]"/>}
            Savings Rate
          </div>
          <div className="font-display font-bold text-lg" style={{color:healthColor}}>
            {savingsPct}%
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{background:`linear-gradient(90deg,${healthColor}90,${healthColor})`}}
            initial={{width:0}} animate={{width:`${Math.max(0,Math.min(savingsPct,100))}%`}}
            transition={{duration:1,ease:'easeOut'}}/>
        </div>
        <div className="flex justify-between font-mono text-[9px] text-[rgba(186,230,253,0.3)] mt-1.5">
          <span>0%</span><span className="text-[#f59e0b]">10% caution</span><span className="text-[#10b981]">30% healthy</span><span>100%</span>
        </div>
      </div>

      {/* Charts + transactions grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-5">

        {/* Expenditure donut */}
        <div className="card card-solar p-5">
          <div className="font-display font-bold text-base mb-1">Expenditure Map</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">
            Category breakdown · click to filter
          </div>
          {(a?.byCategory?.length ?? 0) > 0 ? (
            <>
              <SpendDonut data={a.byCategory} compact={false}/>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.byCategory.slice(0,6).map(c => (
                  <button key={c.category} onClick={() => setCatFilter(f => f===c.category ? '' : c.category)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all"
                    style={{
                      borderColor: catFilter===c.category ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      background:  catFilter===c.category ? 'rgba(245,158,11,0.12)' : 'transparent',
                      color:       catFilter===c.category ? '#f59e0b' : 'rgba(186,230,253,0.4)',
                    }}>
                    {CAT_MAP[c.category]||'💸'} {c.category}
                  </button>
                ))}
                {catFilter && <button onClick={()=>setCatFilter('')} className="text-[10px] font-mono text-[rgba(186,230,253,0.3)] hover:text-white transition-colors px-2 py-1">✕ Clear</button>}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="text-4xl">💳</div>
              <div className="font-mono text-xs text-[rgba(186,230,253,0.2)]">No expense data yet</div>
            </div>
          )}
        </div>

        {/* Transactions list */}
        <div className="card card-ion p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display font-bold text-base">Transactions</div>
            <div className="flex gap-1">
              {['all','income','expense'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize border transition-all"
                  style={{
                    borderColor: filter===f ? '#0ea5e9' : 'rgba(255,255,255,0.06)',
                    background:  filter===f ? 'rgba(14,165,233,0.12)' : 'transparent',
                    color:       filter===f ? '#0ea5e9' : 'rgba(186,230,253,0.4)',
                  }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading.finance ? (
            <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-12"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="text-4xl">📭</div>
              <div className="font-mono text-xs text-[rgba(186,230,253,0.2)]">No transactions yet</div>
              <button onClick={() => setAdding(true)} className="btn-primary btn-sm">+ Add First Transaction</button>
            </div>
          ) : (
            <div className="space-y-0 max-h-[480px] overflow-y-auto -mx-1 px-1">
              <AnimatePresence>
                {filtered.map(t => (
                  <motion.div key={t._id}
                    initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,height:0}}
                    className="task-row group">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-white/[0.04] flex-shrink-0">
                      {CAT_MAP[t.category] || '💸'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">{t.description || t.category}</div>
                      <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)]">
                        {t.category} · {new Date(t.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}
                      </div>
                    </div>
                    <div className={`font-display font-bold text-sm flex-shrink-0 ${t.type==='income'?'text-[#10b981]':'text-[#f87171]'}`}>
                      {t.type==='income'?'+':'-'}{fmt(t.amount)}
                    </div>
                    <button
                      onClick={() => handleDelete(t._id)}
                      disabled={deleting === t._id}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-[rgba(244,63,94,0.4)] hover:text-[#f43f5e] flex-shrink-0 disabled:opacity-30">
                      <Trash2 size={12}/>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* AI Finance Insight strip */}
      {a && (
        <div className="card p-5" style={{background:'linear-gradient(135deg,rgba(16,185,129,0.04),rgba(14,165,233,0.04))',borderColor:'rgba(16,185,129,0.1)'}}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[rgba(16,185,129,0.6)] mb-3">AI Finance Intelligence</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon:'💰', bg:'rgba(16,185,129,0.08)',
                title:'Savings',
                body: savingsPct >= 30
                  ? `Excellent! You're saving ${savingsPct}% this month — well above the 30% target.`
                  : savingsPct >= 10
                  ? `You're saving ${savingsPct}%. Cut one non-essential category to reach the 30% target.`
                  : `Saving only ${savingsPct}%. Pause all non-essential spending and review your top expense category.`,
              },
              {
                icon:'📊', bg:'rgba(14,165,233,0.08)',
                title:'Top Expense',
                body: a.byCategory?.[0]
                  ? `${a.byCategory[0].category} is your largest expense at ${fmt(a.byCategory[0].total)}. ${a.byCategory[0].total > a.income * 0.3 ? 'Consider reducing this by 20%.' : 'This looks manageable.'}`
                  : 'Add expense transactions to get category analysis.',
              },
              {
                icon:'🎯', bg:'rgba(167,139,250,0.08)',
                title:'Goal',
                body: a.income > 0
                  ? `To reach 30% savings: spend under ${fmt(a.income * 0.7)} per month. You've spent ${fmt(a.expense)} so far.`
                  : 'Add your income transaction to activate budget intelligence.',
              },
            ].map(ins=>(
              <div key={ins.title} className="flex gap-3 p-3 rounded-xl" style={{background:ins.bg}}>
                <div className="text-xl flex-shrink-0">{ins.icon}</div>
                <div>
                  <div className="text-xs font-bold text-[#bae6fd] mb-0.5">{ins.title}</div>
                  <div className="text-xs text-[rgba(186,230,253,0.55)] leading-relaxed">{ins.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {adding && <AddModal onClose={() => setAdding(false)} onSaved={loadFinance}/>}
      </AnimatePresence>
    </motion.div>
  );
}
