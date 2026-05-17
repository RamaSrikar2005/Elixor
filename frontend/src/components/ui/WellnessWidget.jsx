/**
 * WellnessWidget — Intelligent Hydration Engine + Wellness Reminders.
 *
 * Hydration system:
 *   • User sets daily goal (2 / 3 / 4 L or custom ml)
 *   • System divides goal into adaptive per-hour slots based on awake window
 *   • Missed-session detection: if 2 h pass without logging, shows catch-up prompt
 *   • +250ml / +500ml / +1L quick-add buttons
 *   • Daily hydration score, streaks, 7-day trend bar graph
 *   • All data persisted to localStorage, resets at midnight
 *
 * Wellness reminders:
 *   • Eye break every 20 min (20-20-20 rule)
 *   • Stretch every 60 min
 *   • Browser notifications if granted
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Droplets, Eye, Wind, ChevronUp, ChevronDown,
  X, Check, Settings, TrendingUp, Zap,
} from 'lucide-react';

/* ─── Constants ──────────────────────────────────────────────── */
const EYE_SECS  = 20 * 60;
const MOVE_SECS = 60 * 60;
const LS_LOG    = 'elixor_hydration_log';
const LS_GOAL   = 'elixor_hydration_goal';
const LS_STREAK = 'elixor_hydration_streak';

const GOAL_PRESETS = [
  { label: '2 L',  ml: 2000 },
  { label: '3 L',  ml: 3000 },
  { label: '4 L',  ml: 4000 },
];

/* ─── Helpers ────────────────────────────────────────────────── */
function todayKey() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function loadLog() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_LOG) || '{}');
    const key = todayKey();
    return raw[key] || [];           // [{ml, time}]
  } catch { return []; }
}

function saveLog(entries) {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_LOG) || '{}');
    raw[todayKey()] = entries;
    // keep only last 7 days
    const keys = Object.keys(raw).sort().slice(-7);
    const trimmed = {};
    keys.forEach(k => { trimmed[k] = raw[k]; });
    localStorage.setItem(LS_LOG, JSON.stringify(trimmed));
  } catch {}
}

function loadAllDays() {
  try { return JSON.parse(localStorage.getItem(LS_LOG) || '{}'); } catch { return {}; }
}

function loadGoal() {
  const raw = parseInt(localStorage.getItem(LS_GOAL) || '2500', 10);
  return isNaN(raw) ? 2500 : raw;
}

function saveGoal(ml) { localStorage.setItem(LS_GOAL, String(ml)); }

function loadStreak() {
  try { return JSON.parse(localStorage.getItem(LS_STREAK) || '{"count":0,"lastDate":""}'); }
  catch { return { count: 0, lastDate: '' }; }
}

function notify(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}

function requestNotifPerm() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/* ─── Calculate adaptive interval ───────────────────────────── */
function calcIntervalMins(goalMl) {
  // Assume 16 h awake window (7 AM – 11 PM); divide evenly
  const awakeHours = 16;
  const reminders  = Math.max(4, Math.round(awakeHours * 60 / (goalMl / 200)));
  return Math.round((awakeHours * 60) / reminders);
}

/* ─── Water droplet SVG ──────────────────────────────────────── */
function Droplet({ pct = 0, size = 48, color = '#0ea5e9' }) {
  const fillY = 100 - Math.min(pct, 100);
  return (
    <svg width={size} height={size} viewBox="0 0 40 50" fill="none">
      <defs>
        <clipPath id="drop-clip">
          <path d="M20 2 C20 2, 36 22, 36 32 A16 16 0 0 1 4 32 C4 22, 20 2 20 2Z"/>
        </clipPath>
        <linearGradient id="drop-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.8"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {/* Outline */}
      <path d="M20 2 C20 2, 36 22, 36 32 A16 16 0 0 1 4 32 C4 22, 20 2 20 2Z"
        stroke={color} strokeWidth="1.5" fill="rgba(14,165,233,0.06)"/>
      {/* Fill */}
      <rect x="0" y={fillY * 0.5} width="40" height="50" fill="url(#drop-grad)" clipPath="url(#drop-clip)"/>
      {/* Shine */}
      <ellipse cx="27" cy="18" rx="3" ry="5" fill="white" opacity="0.15" transform="rotate(-20 27 18)"/>
    </svg>
  );
}

/* ─── Tiny bar for 7-day trend ───────────────────────────────── */
function TrendBar({ days, goal }) {
  return (
    <div className="flex items-end gap-1 h-16">
      {days.map((d, i) => {
        const pct = goal > 0 ? Math.min((d.ml / goal) * 100, 100) : 0;
        const isToday = i === days.length - 1;
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
            <motion.div
              className="w-full rounded-t-sm"
              style={{ background: pct >= 100 ? '#10b981' : pct >= 60 ? '#0ea5e9' : 'rgba(255,255,255,0.12)' }}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(pct * 0.56, 2)}px` }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
            />
            <div className={`font-mono text-[7px] ${isToday ? 'text-[#0ea5e9]' : 'text-[rgba(186,230,253,0.25)]'}`}>
              {d.date.slice(5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Missed-session catch-up banner ─────────────────────────── */
function MissedBanner({ missedMl, onLog, onDismiss }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="mb-2 p-3 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]">
      <div className="font-mono text-[10px] text-[#f59e0b] mb-2 leading-relaxed">
        💧 You missed {Math.round(missedMl / 100) / 10}L — did you drink?
      </div>
      <div className="flex gap-1.5">
        <button onClick={() => onLog(missedMl)}
          className="flex-1 py-1 rounded-lg text-[10px] font-semibold bg-[rgba(245,158,11,0.2)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)] hover:bg-[rgba(245,158,11,0.3)] transition-all">
          Yes, log it
        </button>
        <button onClick={onDismiss} className="p-1 text-[rgba(186,230,253,0.3)] hover:text-white transition-colors">
          <X size={12}/>
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Settings panel ──────────────────────────────────────────── */
function GoalPanel({ current, onSave, onClose }) {
  const [ml, setMl] = useState(current);
  const [custom, setCustom] = useState('');
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      className="mb-2 w-56 card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] text-[rgba(14,165,233,0.7)] uppercase tracking-widest">Hydration Goal</div>
        <button onClick={onClose} className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors"><X size={12}/></button>
      </div>
      <div className="flex gap-1.5 mb-3">
        {GOAL_PRESETS.map(p => (
          <button key={p.ml} onClick={() => setMl(p.ml)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
            style={{
              borderColor: ml === p.ml ? '#0ea5e9' : 'rgba(255,255,255,0.08)',
              background: ml === p.ml ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: ml === p.ml ? '#0ea5e9' : 'rgba(186,230,253,0.4)',
            }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input type="number" min="500" max="8000" step="100"
          placeholder="Custom ml"
          value={custom}
          onChange={e => { setCustom(e.target.value); setMl(parseInt(e.target.value) || ml); }}
          className="input-field flex-1 py-1.5 text-xs"
        />
        <span className="flex items-center text-[10px] text-[rgba(186,230,253,0.3)]">ml</span>
      </div>
      <div className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] mb-3 leading-relaxed">
        Reminder every ~{calcIntervalMins(ml)} min · {Math.round(ml / 250)} sessions/day
      </div>
      <button onClick={() => { onSave(ml); onClose(); }} className="btn-primary btn-sm w-full justify-center">
        <Check size={11}/> Save Goal
      </button>
    </motion.div>
  );
}

/* ─── Main Widget ────────────────────────────────────────────── */
export default function WellnessWidget() {
  const [open,       setOpen]    = useState(false);
  const [showGoal,   setShowGoal]= useState(false);
  const [tab,        setTab]     = useState('hydration'); // 'hydration' | 'wellness'

  // Hydration state
  const [goal,       setGoal]    = useState(loadGoal);
  const [log,        setLog]     = useState(loadLog);   // [{ml, time}]
  const [streak,     setStreak]  = useState(loadStreak);
  const [missedBanner, setMissedBanner] = useState(false);
  const [missedMl,   setMissedMl]= useState(0);
  const lastLogRef = useRef(log.length > 0 ? new Date(log[log.length - 1].time).getTime() : Date.now());

  // Wellness timers
  const [eyeLeft,    setEyeLeft] = useState(EYE_SECS);
  const [moveLeft,   setMoveLeft]= useState(MOVE_SECS);
  const [alert,      setAlert]   = useState(null);

  const totalDrunk = log.reduce((s, e) => s + e.ml, 0);
  const hydPct     = Math.min((totalDrunk / goal) * 100, 100);
  const intervalMins = calcIntervalMins(goal);

  /* request notification permission on mount */
  useEffect(() => { requestNotifPerm(); }, []);

  /* midnight reset check */
  useEffect(() => {
    const key = todayKey();
    const raw = loadAllDays();
    // if we have an entry for today already loaded, do nothing
    // else the log will be empty via loadLog()
    if (!raw[key]) { setLog([]); }
  }, []);

  /* streak update when goal met */
  useEffect(() => {
    if (totalDrunk >= goal) {
      const today = todayKey();
      const s = loadStreak();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      const newStreak = (s.lastDate === yKey || s.lastDate === today)
        ? { count: s.lastDate === today ? s.count : s.count + 1, lastDate: today }
        : { count: 1, lastDate: today };
      localStorage.setItem(LS_STREAK, JSON.stringify(newStreak));
      setStreak(newStreak);
    }
  }, [totalDrunk, goal]);

  /* missed-session detector: check every 5 min */
  useEffect(() => {
    const check = () => {
      if (totalDrunk >= goal) return;
      const now = Date.now();
      const msSinceLast = now - lastLogRef.current;
      if (msSinceLast >= 2 * 60 * 60 * 1000) {
        // 2 h passed → suggest catching up with interval amount
        const catchUp = Math.round(intervalMins / 60 * goal / 16 / 100) * 100 || 500;
        setMissedMl(catchUp);
        setMissedBanner(true);
        notify('💧 Hydration Check', `You haven't logged water in 2 hours. Did you drink ${catchUp}ml?`);
      }
    };
    check();
    const t = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [totalDrunk, goal, intervalMins]);

  /* eye break countdown */
  useEffect(() => {
    const t = setInterval(() => {
      setEyeLeft(s => {
        if (s <= 1) {
          notify('👁️ Eye Break', '20-20-20 Rule: look 20 ft away for 20 seconds.');
          setAlert('eye'); setTimeout(() => setAlert(null), 20000);
          return EYE_SECS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* stretch countdown */
  useEffect(() => {
    const t = setInterval(() => {
      setMoveLeft(s => {
        if (s <= 1) {
          notify('🧘 Time to Move', 'Stand up, stretch, and walk for 5 minutes.');
          setAlert('move'); setTimeout(() => setAlert(null), 10000);
          return MOVE_SECS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* periodic water reminder */
  useEffect(() => {
    const t = setInterval(() => {
      if (totalDrunk < goal) {
        const remaining = goal - totalDrunk;
        notify('💧 Hydration Reminder', `Drink water! ${remaining}ml left for today's goal.`);
        setAlert('water'); setTimeout(() => setAlert(null), 15000);
      }
    }, intervalMins * 60 * 1000);
    return () => clearInterval(t);
  }, [intervalMins, totalDrunk, goal]);

  const addWater = useCallback((ml) => {
    const entry = { ml, time: new Date().toISOString() };
    const updated = [...log, entry];
    setLog(updated);
    saveLog(updated);
    lastLogRef.current = Date.now();
    setMissedBanner(false);
    notify('💧 Water logged!', `+${ml}ml — ${Math.round(updated.reduce((s,e)=>s+e.ml,0))}ml today`);
  }, [log]);

  const resetDay = () => {
    setLog([]); saveLog([]);
    lastLogRef.current = Date.now();
    setMissedBanner(false);
  };

  const handleGoalSave = (ml) => { setGoal(ml); saveGoal(ml); };

  const fmtTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // 7-day trend
  const allDays = loadAllDays();
  const trendDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = d.toISOString().slice(0, 10);
    const ml = (allDays[k] || []).reduce((s, e) => s + e.ml, 0);
    return { date: k, ml };
  });

  const hydScore = Math.round(hydPct);
  const wellnessScore = Math.round(
    (hydPct * 0.5) + ((1 - eyeLeft / EYE_SECS) * 25) + ((1 - moveLeft / MOVE_SECS) * 25)
  );

  return (
    <div className="fixed bottom-40 left-4 z-40">

      {/* Alert toasts */}
      <AnimatePresence>
        {alert && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="mb-2 px-4 py-3 rounded-xl border text-xs font-semibold max-w-[220px]"
            style={{
              background: alert === 'eye' ? 'rgba(167,139,250,0.15)' : alert === 'water' ? 'rgba(14,165,233,0.15)' : 'rgba(16,185,129,0.15)',
              borderColor: alert === 'eye' ? 'rgba(167,139,250,0.3)' : alert === 'water' ? 'rgba(14,165,233,0.3)' : 'rgba(16,185,129,0.3)',
              color: alert === 'eye' ? '#a78bfa' : alert === 'water' ? '#0ea5e9' : '#10b981',
            }}>
            {alert === 'eye' ? '👁️ Look away 20 ft for 20 seconds' : alert === 'water' ? '💧 Time to drink water!' : '🧘 Stand up and stretch!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missed-session catch-up banner */}
      <AnimatePresence>
        {missedBanner && open && (
          <MissedBanner missedMl={missedMl}
            onLog={ml => addWater(ml)}
            onDismiss={() => { setMissedBanner(false); lastLogRef.current = Date.now(); }}
          />
        )}
      </AnimatePresence>

      {/* Goal settings panel */}
      <AnimatePresence>
        {showGoal && (
          <GoalPanel current={goal} onSave={handleGoalSave} onClose={() => setShowGoal(false)} />
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {open && !showGoal && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}
            className="mb-2 w-64 card p-4">

            {/* Tab row */}
            <div className="flex gap-1.5 mb-4">
              {[
                { id: 'hydration', label: 'Hydration', icon: Droplets },
                { id: 'wellness',  label: 'Wellness',  icon: Heart },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold border transition-all"
                  style={{
                    borderColor: tab === id ? '#0ea5e9' : 'rgba(255,255,255,0.06)',
                    background:  tab === id ? 'rgba(14,165,233,0.12)' : 'transparent',
                    color:       tab === id ? '#0ea5e9' : 'rgba(186,230,253,0.35)',
                  }}>
                  <Icon size={10}/> {label}
                </button>
              ))}
            </div>

            {/* ─ HYDRATION TAB ─ */}
            {tab === 'hydration' && (
              <div>
                {/* Droplet + stats */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <Droplet pct={hydPct} size={56} color="#0ea5e9" />
                    {hydPct >= 100 && (
                      <motion.div animate={{ scale: [1,1.2,1] }} transition={{ duration: 1, repeat: Infinity }}
                        className="absolute -top-1 -right-1 text-[10px]">✅</motion.div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-xl text-[#0ea5e9] leading-none">
                      {totalDrunk >= 1000 ? `${(totalDrunk/1000).toFixed(1)}L` : `${totalDrunk}ml`}
                    </div>
                    <div className="font-mono text-[9px] text-[rgba(186,230,253,0.4)] mt-0.5">
                      / {goal >= 1000 ? `${goal/1000}L` : `${goal}ml`} goal
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div className="h-full rounded-full"
                        style={{ background: hydPct >= 100 ? '#10b981' : 'linear-gradient(90deg,#0ea5e9,#38bdf8)' }}
                        animate={{ width: `${hydPct}%` }} transition={{ duration: 0.5 }}/>
                    </div>
                    <div className="font-mono text-[9px] mt-1" style={{ color: hydPct >= 100 ? '#10b981' : '#0ea5e9' }}>
                      {hydScore}% · {streak.count > 0 ? `🔥 ${streak.count}d streak` : 'No streak yet'}
                    </div>
                  </div>
                </div>

                {/* Quick-add buttons */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {[{ml:250,label:'+250ml'},{ml:500,label:'+500ml'},{ml:1000,label:'+1L'}].map(({ml,label}) => (
                    <button key={ml} onClick={() => addWater(ml)}
                      className="py-2 rounded-xl text-[10px] font-bold border border-[rgba(14,165,233,0.2)] text-[#0ea5e9] bg-[rgba(14,165,233,0.06)] hover:bg-[rgba(14,165,233,0.15)] transition-all flex flex-col items-center gap-0.5">
                      <Droplets size={10}/>
                      {label}
                    </button>
                  ))}
                </div>

                {/* 7-day trend */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest flex items-center gap-1">
                      <TrendingUp size={9}/> 7-day trend
                    </div>
                    <div className="font-mono text-[9px] text-[rgba(186,230,253,0.25)]">
                      avg {Math.round(trendDays.reduce((s,d)=>s+d.ml,0)/7)}ml/day
                    </div>
                  </div>
                  <TrendBar days={trendDays} goal={goal}/>
                </div>

                {/* AI hydration insight */}
                <div className="p-2.5 rounded-xl bg-[rgba(14,165,233,0.05)] border border-[rgba(14,165,233,0.1)] mb-3">
                  <div className="font-mono text-[9px] text-[rgba(14,165,233,0.6)] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Zap size={8}/> AI Insight
                  </div>
                  <div className="font-mono text-[9px] text-[rgba(186,230,253,0.55)] leading-relaxed">
                    {hydPct >= 100
                      ? "Goal achieved! You're well hydrated. Maintain this tomorrow."
                      : hydPct >= 60
                      ? `${Math.round(goal - totalDrunk)}ml left. Drink ${Math.round((goal - totalDrunk) / 250)} more glasses before bed.`
                      : hydPct >= 30
                      ? `Moderate dehydration risk. Aim to drink ${Math.round((goal * 0.6 - totalDrunk) / 100) * 100}ml in the next hour.`
                      : "⚠️ Low hydration detected. Start with 500ml now — dehydration impairs focus by up to 20%."}
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setShowGoal(true)}
                    className="flex items-center gap-1 font-mono text-[9px] text-[rgba(186,230,253,0.3)] hover:text-[#0ea5e9] transition-colors">
                    <Settings size={9}/> Set goal
                  </button>
                  <button onClick={resetDay}
                    className="font-mono text-[9px] text-[rgba(186,230,253,0.2)] hover:text-[rgba(186,230,253,0.5)] transition-colors">
                    Reset day
                  </button>
                </div>
              </div>
            )}

            {/* ─ WELLNESS TAB ─ */}
            {tab === 'wellness' && (
              <div className="space-y-3">
                {/* Overall wellness score */}
                <div className="text-center pb-2 border-b border-white/[0.04]">
                  <div className="font-display font-bold text-2xl text-[#10b981]">{wellnessScore}</div>
                  <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)]">Wellness Score</div>
                </div>

                {/* Eye break */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-[#a78bfa]">
                      <Eye size={11}/>
                      <span className="font-mono text-[9px] text-[rgba(186,230,253,0.5)]">
                        Eye break in {fmtTime(eyeLeft)}
                      </span>
                    </div>
                    <button onClick={() => setEyeLeft(EYE_SECS)}
                      className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[rgba(167,139,250,0.1)] text-[#a78bfa] border border-[rgba(167,139,250,0.2)] hover:bg-[rgba(167,139,250,0.2)] transition-all">
                      Reset
                    </button>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full bg-[#a78bfa] transition-all"
                      style={{ width: `${(eyeLeft / EYE_SECS) * 100}%` }}/>
                  </div>
                </div>

                {/* Stretch */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-[#10b981]">
                      <Wind size={11}/>
                      <span className="font-mono text-[9px] text-[rgba(186,230,253,0.5)]">
                        Stretch in {fmtTime(moveLeft)}
                      </span>
                    </div>
                    <button onClick={() => setMoveLeft(MOVE_SECS)}
                      className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.2)] transition-all">
                      Reset
                    </button>
                  </div>
                  <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <div className="h-full rounded-full bg-[#10b981] transition-all"
                      style={{ width: `${(moveLeft / MOVE_SECS) * 100}%` }}/>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-2.5 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.1)]">
                  <div className="font-mono text-[9px] text-[rgba(16,185,129,0.6)] uppercase tracking-wider mb-1.5">Wellness Tips</div>
                  <div className="space-y-1">
                    {[
                      '💧 Drink a glass of water before every meal.',
                      '👁️ Blink 10 times slowly to refresh eyes.',
                      '🧘 5 deep breaths reset your focus instantly.',
                      '🚶 10-min walk boosts energy for 2 hours.',
                    ].map((t, i) => (
                      <div key={i} className="font-mono text-[9px] text-[rgba(186,230,253,0.45)] leading-relaxed">{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle FAB */}
      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(x => !x); setShowGoal(false); }}
        className={`relative w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
          wellnessScore > 60
            ? 'border-[rgba(14,165,233,0.4)] bg-[rgba(14,165,233,0.12)] text-[#0ea5e9]'
            : 'border-white/[0.08] bg-[rgba(8,14,26,0.8)] text-[rgba(186,230,253,0.35)] hover:text-[rgba(186,230,253,0.7)]'
        }`}
        title="Wellness &amp; Hydration"
      >
        <Droplets size={15}/>
        {/* Hydration badge */}
        {totalDrunk > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#0ea5e9] text-[8px] font-bold text-white flex items-center justify-center border border-[#010203]">
            {Math.round(hydPct / 10)}
          </span>
        )}
        {/* Expand/collapse indicator */}
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          {open ? <ChevronDown size={8} className="text-[rgba(186,230,253,0.3)]"/> : <ChevronUp size={8} className="text-[rgba(186,230,253,0.2)]"/>}
        </span>
      </motion.button>
    </div>
  );
}
