/**
 * FinancialWarning — Real-time financial alert system.
 *
 * Two-tier behavior:
 *   SEVERE  (expense ≥ income)        → full-screen blocking overlay with X dismiss
 *   CAUTION (savings rate < 10%)      → slide-in top banner (non-blocking)
 *
 * The full-screen overlay is dismissible via X button and stays dismissed
 * for 1 hour (stored in sessionStorage) so it doesn't re-appear on every route change.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
import { useAppStore } from '../../store/appStore.js';
import { useNavigate } from 'react-router-dom';

const DISMISS_KEY = 'elixor_fin_warn_dismissed';
const TIPS = [
  'Audit your top category and set a strict weekly cap.',
  'Cancel unused subscriptions — average savings: ₹1,500/mo.',
  'Cook at home 3 extra days — cuts food spend by ~35%.',
  '50/30/20 rule: 50% needs, 30% wants, 20% savings.',
  'Auto-transfer savings on payday before spending anything.',
  'Reduce dining out to once a week for 30 days.',
];

const RECOVERY_STEPS = [
  { icon: '🛑', step: 'Pause all non-essential spending immediately.' },
  { icon: '📋', step: 'List every recurring expense and cancel ≥1 unused subscription.' },
  { icon: '💳', step: 'Switch to cash/UPI for daily purchases to feel the spend.' },
  { icon: '📊', step: 'Set a hard budget cap per category in Finance tab.' },
  { icon: '🎯', step: 'Target 20% savings rate before adding any new expense.' },
];

function healthScore(income, expense) {
  if (!income) return 0;
  const r = expense / income;
  if (r >= 1.2) return 0;
  if (r >= 1)   return 5;
  if (r >= 0.9) return 15;
  if (r >= 0.8) return 30;
  if (r >= 0.7) return 45;
  if (r >= 0.5) return 65;
  return 88;
}

function wasDismissedRecently() {
  const ts = sessionStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts) < 3600_000; // 1 hour
}

function markDismissed() {
  sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
}

/* ─── Full-screen overlay for SEVERE deficit ─────────────────── */
function FullScreenOverlay({ income, expense, onDismiss }) {
  const navigate  = useNavigate();
  const deficit   = expense - income;
  const score     = healthScore(income, expense);
  const fmt       = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
  const [tipIdx,  setTipIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i+1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(1,2,3,0.96)', backdropFilter: 'blur(20px)' }}
    >
      {/* Neural grid overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(244,63,94,1) 1px,transparent 1px),linear-gradient(90deg,rgba(244,63,94,1) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      {/* Dismiss button */}
      <button onClick={onDismiss}
        className="absolute top-5 right-5 w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.1] text-[rgba(186,230,253,0.4)] hover:text-white hover:border-white/[0.3] transition-all z-10">
        <X size={16}/>
      </button>

      {/* Pulsing alert ring */}
      <div className="relative mb-8 flex items-center justify-center" style={{ width: 120, height: 120 }}>
        <motion.div className="absolute inset-0 rounded-full border-2 border-[#f43f5e]"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.1, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity }}/>
        <motion.div className="absolute inset-3 rounded-full border-2 border-[#f43f5e]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}/>
        <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(244,63,94,0.15)', border: '1.5px solid rgba(244,63,94,0.4)' }}>
          <AlertTriangle size={28} className="text-[#f43f5e]"/>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <div className="font-mono text-[11px] tracking-widest uppercase text-[rgba(244,63,94,0.7)] mb-2">
          Financial Alert
        </div>
        <div className="font-display font-bold text-4xl tracking-tight text-[#f0f9ff] mb-2">
          Budget Exceeded
        </div>
        <div className="font-mono text-sm text-[rgba(186,230,253,0.5)]">
          Spending <strong className="text-[#f43f5e]">{fmt(deficit)}</strong> more than you earn this month
        </div>
      </div>

      {/* KPI row */}
      <div className="flex gap-4 mb-8 flex-wrap justify-center">
        {[
          { label: 'Income',   value: fmt(income),  color: '#10b981' },
          { label: 'Expenses', value: fmt(expense), color: '#f43f5e' },
          { label: 'Deficit',  value: fmt(deficit), color: '#f43f5e' },
          { label: 'Health',   value: `${score}/100`, color: score < 20 ? '#f43f5e' : '#f59e0b' },
        ].map(k => (
          <div key={k.label} className="text-center px-5 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <div className="font-display font-bold text-2xl leading-none" style={{ color: k.color }}>{k.value}</div>
            <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Financial health bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between font-mono text-[10px] text-[rgba(186,230,253,0.35)] mb-2">
          <span>Financial Health</span>
          <span className="text-[#f43f5e]">{score}/100 — Critical</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div className="h-full rounded-full bg-[#f43f5e]"
            initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1 }}/>
        </div>
      </div>

      {/* Recovery steps */}
      <div className="w-full max-w-md mb-8">
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-3">
          AI Recovery Plan
        </div>
        <div className="space-y-2">
          {RECOVERY_STEPS.map((s,i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl border border-[rgba(244,63,94,0.12)] bg-[rgba(244,63,94,0.04)]">
              <span className="text-base flex-shrink-0">{s.icon}</span>
              <div className="text-xs text-[rgba(186,230,253,0.65)] leading-relaxed">{s.step}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Rotating tip */}
      <AnimatePresence mode="wait">
        <motion.div key={tipIdx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="max-w-sm text-center font-mono text-xs text-[rgba(186,230,253,0.3)] mb-8 italic">
          💡 {TIPS[tipIdx]}
        </motion.div>
      </AnimatePresence>

      {/* CTAs */}
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => { onDismiss(); navigate('/finance'); }}
          className="btn-primary px-6 py-3 flex items-center gap-2">
          <DollarSign size={15}/> Open Finance
        </button>
        <button onClick={onDismiss} className="btn-ghost px-6 py-3 flex items-center gap-2">
          <X size={15}/> Dismiss for 1 hour
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Subtle top banner for CAUTION mode ─────────────────────── */
function CautionBanner({ income, expense, savingsRate, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const [tipIdx,   setTipIdx]   = useState(0);
  const navigate  = useNavigate();
  const score     = healthScore(income, expense);
  const fmt       = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i+1) % TIPS.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
      className="fixed top-0 left-0 right-0 z-[9990] border-b"
      style={{ background:'linear-gradient(135deg,rgba(244,63,94,0.1),rgba(220,38,38,0.07))', borderColor:'rgba(244,63,94,0.3)' }}>
      <div className="max-w-screen-xl mx-auto px-6 py-2.5 flex items-center gap-4">
        <motion.div animate={{ scale:[1,1.15,1] }} transition={{ duration:1.5, repeat:Infinity }}>
          <AlertTriangle size={15} className="text-[#f43f5e] flex-shrink-0"/>
        </motion.div>
        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0">
          <span className="font-semibold text-sm text-[#f43f5e] whitespace-nowrap">
            {expense >= income ? '⚠️ Budget exceeded' : '📊 Low savings rate'}
          </span>
          <span className="font-mono text-xs text-[rgba(186,230,253,0.6)]">
            {expense >= income
              ? `Spending ${fmt(expense)} vs ${fmt(income)} income`
              : `Saving only ${savingsRate} — target 20%+`}
          </span>
          <span className="font-mono text-[10px] text-[rgba(244,63,94,0.8)] bg-[rgba(244,63,94,0.1)] px-2 py-0.5 rounded-full border border-[rgba(244,63,94,0.2)]">
            Health: {score}/100
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => navigate('/finance')}
            className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-[rgba(244,63,94,0.15)] text-[#f43f5e] border border-[rgba(244,63,94,0.25)] hover:bg-[rgba(244,63,94,0.25)] transition-colors whitespace-nowrap">
            Fix Now
          </button>
          <button onClick={() => setExpanded(e=>!e)} className="p-1 text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
            {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
          <button onClick={onDismiss} className="p-1 text-[rgba(186,230,253,0.3)] hover:text-white transition-colors">
            <X size={14}/>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="overflow-hidden">
            <div className="max-w-screen-xl mx-auto px-6 pb-4 pt-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-2">Health</div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-[#f43f5e]" style={{ width: `${score}%` }}/>
                </div>
                <div className="font-mono text-[10px] text-[#f43f5e] mt-1">{score}/100 — At Risk</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-2">Spending Ratio</div>
                <div className="font-display font-bold text-2xl text-[#f43f5e]">
                  {income > 0 ? Math.round((expense/income)*100) : '—'}%
                </div>
                <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)]">of income · target &lt;80%</div>
              </div>
              <div>
                <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-2">AI Tip</div>
                <AnimatePresence mode="wait">
                  <motion.div key={tipIdx} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                    className="text-xs text-[rgba(186,230,253,0.6)] leading-relaxed">
                    💡 {TIPS[tipIdx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Root controller ─────────────────────────────────────────── */
export default function FinancialWarning() {
  const { dashboard }   = useAppStore();
  const [dismissed, setDismiss] = useState(false);

  const fin      = dashboard?.finance;
  const income   = fin?.income  || 0;
  const expense  = fin?.expense || 0;
  const savings  = parseFloat(fin?.savingsRate || '100');

  const isSevere  = income > 0 && expense >= income;
  const isCaution = income > 0 && !isSevere && savings < 10;
  const shouldShow = (isSevere || isCaution) && !dismissed;

  // Check sessionStorage on mount
  useEffect(() => {
    if (wasDismissedRecently()) setDismiss(true);
  }, []);

  // Re-show if financial state changes and dismiss has expired
  useEffect(() => {
    if (shouldShow === false && dismissed && !wasDismissedRecently()) {
      setDismiss(false);
    }
  }, [fin?.income, fin?.expense]);

  const handleDismiss = () => {
    markDismissed();
    setDismiss(true);
  };

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      {isSevere ? (
        <FullScreenOverlay key="fullscreen" income={income} expense={expense} onDismiss={handleDismiss}/>
      ) : (
        <CautionBanner key="banner" income={income} expense={expense} savingsRate={fin?.savingsRate} onDismiss={handleDismiss}/>
      )}
    </AnimatePresence>
  );
}
