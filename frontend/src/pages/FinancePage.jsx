import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore.js';
import StatCard    from '../components/ui/StatCard.jsx';
import SpendDonut  from '../components/charts/SpendDonut.jsx';
import { financeApi } from '../services/api.js';

const fmt = (n) => n != null ? `₹${Math.round(n).toLocaleString('en-IN')}` : '₹—';
const EMOJI_MAP = { Food:'🍔', Shopping:'🛒', Utilities:'⚡', Transport:'🚌', Health:'🏥', Entertainment:'📱', Income:'💼', Other:'💸' };

export default function FinancePage() {
  const { transactions, finAnalytics, loadFinance, loading } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ type:'expense', amount:'', category:'Food', description:'' });

  useEffect(() => { loadFinance(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    await financeApi.create({ ...form, amount: parseFloat(form.amount) });
    setAdding(false);
    setForm({ type:'expense', amount:'', category:'Food', description:'' });
    loadFinance();
  };

  const a = finAnalytics;

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }} className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Finance Intelligence</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">AI-powered money OS</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-primary btn-sm">+ Transaction</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Monthly Income"  value={fmt(a?.income)}       accent="solar" icon="💼" />
        <StatCard label="Total Spent"     value={fmt(a?.expense)}      accent="coral" icon="💳" />
        <StatCard label="Savings"         value={fmt(a?.savings)}      sub={`${a?.savingsRate || 0}% saved 🎯`} accent="bio" icon="🏦" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card card-solar p-5">
          <div className="font-display font-bold text-base mb-1">Expenditure Map</div>
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-4">Category breakdown</div>
          <SpendDonut data={a?.byCategory || []} compact={false} />
        </div>

        <div className="card card-ion p-5">
          <div className="font-display font-bold text-base mb-4">Recent Transactions</div>
          {loading.finance ? (
            <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="skeleton h-12"/>)}</div>
          ) : (
            <div className="space-y-0">
              {transactions.map(t => (
                <div key={t._id} className="task-row">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base bg-white/[0.04] flex-shrink-0">
                    {t.emoji || EMOJI_MAP[t.category] || '💸'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{t.description || t.category}</div>
                    <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)]">{t.category} · {new Date(t.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</div>
                  </div>
                  <div className={`font-display font-bold text-sm flex-shrink-0 ${t.type==='income'?'text-[#10b981]':'text-[#bae6fd]'}`}>
                    {t.type==='income'?'+':'-'}{fmt(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Transaction Modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="card p-6 w-full max-w-md">
            <div className="font-display font-bold text-lg mb-5">Add Transaction</div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <div className="label">Type</div>
                <div className="flex gap-2">
                  {['expense','income'].map(t=>(
                    <button type="button" key={t} onClick={()=>setForm(f=>({...f,type:t}))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${form.type===t?'btn-primary':'btn-ghost'}`}>
                      {t==='expense'?'Expense':'Income'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="label">Amount (₹)</div>
                <input className="input-field" type="number" min="1" placeholder="0.00" value={form.amount}
                  onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required />
              </div>
              <div>
                <div className="label">Category</div>
                <select className="input-field" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {['Food','Shopping','Utilities','Transport','Health','Entertainment','Income','Other'].map(c=>(
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Description</div>
                <input className="input-field" type="text" placeholder="What was this for?" value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Add Transaction</button>
                <button type="button" onClick={()=>setAdding(false)} className="btn-ghost">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
