import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Settings, X, Clock, Zap, Target, TrendingUp } from 'lucide-react';
import { focusApi } from '../services/api.js';
import { emit }     from '../services/socket.js';
import { useAppStore } from '../store/appStore.js';

const DEFAULT_WORK  = 25;
const DEFAULT_BREAK = 5;

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function SessionBadge({ session }) {
  const dur  = Math.round(session.durationSeconds / 60);
  const when = new Date(session.startedAt || session.createdAt);
  const timeStr = when.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.completed ? 'bg-[#10b981]' : 'bg-[rgba(186,230,253,0.2)]'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-[rgba(186,230,253,0.7)]">{session.type === 'work' ? '🎯 Work' : '☕ Break'} · {dur}m</div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.3)]">{timeStr}</div>
      </div>
      {session.xpAwarded > 0 && (
        <span className="font-mono text-[10px] text-[#0ea5e9]">+{session.xpAwarded} XP</span>
      )}
    </div>
  );
}

export default function FocusPage() {
  const { addNotification } = useAppStore();

  // ─── Timer settings ───────────────────────────────
  const [workMin,  setWorkMin]  = useState(DEFAULT_WORK);
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK);
  const [showSettings, setShowSettings] = useState(false);
  const [autoStart, setAutoStart]       = useState(false);
  const [settingWork,  setSettingWork]  = useState(DEFAULT_WORK);
  const [settingBreak, setSettingBreak] = useState(DEFAULT_BREAK);

  // ─── Timer state ──────────────────────────────────
  const [type,    setType]    = useState('work');
  const [secs,    setSecs]    = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [sessionId, setSId]   = useState(null);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [xpMsg, setXpMsg]     = useState('');

  // ─── Stats & history ──────────────────────────────
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);

  const intervalRef = useRef(null);

  const totalSecs = type === 'work' ? workMin * 60 : breakMin * 60;
  const pct       = totalSecs > 0 ? secs / totalSecs : 0;
  const r         = 88;
  const circ      = 2 * Math.PI * r;

  // Load stats on mount
  useEffect(() => {
    focusApi.stats()
      .then(({ data }) => setStats(data.data))
      .catch(() => {});
  }, []);

  // Sync secs when type/duration changes (only if not running)
  useEffect(() => {
    if (!running) setSecs(type === 'work' ? workMin * 60 : breakMin * 60);
  }, [type, workMin, breakMin]);

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            handleComplete();
            return 0;
          }
          if (s % 10 === 0 && sessionId) {
            emit('focus:tick', { sessionId, secsRemaining: s });
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, sessionId]);

  // Document title update
  useEffect(() => {
    if (running) {
      document.title = `${formatTime(secs)} – ${type === 'work' ? '🎯 Focus' : '☕ Break'}`;
    } else {
      document.title = 'ELIXOR — Focus Mode';
    }
    return () => { document.title = 'ELIXOR — Personal AI Operating System'; };
  }, [secs, running, type]);

  const handleComplete = useCallback(async () => {
    clearInterval(intervalRef.current);
    setRunning(false);

    if (sessionId) {
      try {
        const { data } = await focusApi.end(sessionId, { completed: true });
        emit('focus:end', { sessionId, completed: true });
        const xp = data.data?.xpAwarded;
        if (xp > 0) {
          setXpMsg(`+${xp} XP 🎯`);
          addNotification('xp', `Session complete! +${xp} XP`);
          setTimeout(() => setXpMsg(''), 3000);
        }
        // Refresh stats + prepend to history
        const { data: sData } = await focusApi.stats();
        setStats(sData.data);
        setHistory(h => [data.data?.session || {}, ...h].slice(0, 8));
      } catch { /* ignore */ }
      setSId(null);
    }

    setSessionsToday(n => n + 1);

    // Switch type
    const nextType = type === 'work' ? 'break' : 'work';
    setType(nextType);
    setSecs((nextType === 'work' ? workMin : breakMin) * 60);

    if (autoStart) {
      setTimeout(() => startTimer(nextType), 800);
    }
  }, [sessionId, type, workMin, breakMin, autoStart]);

  const startTimer = async (overrideType) => {
    const t = overrideType || type;
    const dur = t === 'work' ? workMin * 60 : breakMin * 60;
    try {
      const { data } = await focusApi.start({ durationSeconds: dur, type: t });
      setSId(data.data._id);
      emit('focus:start', { sessionId: data.data._id, durationSeconds: dur });
    } catch { /* offline mode */ }
    setRunning(true);
  };

  const pauseTimer = async () => {
    setRunning(false);
    if (sessionId) {
      try {
        await focusApi.end(sessionId, { completed: false });
        emit('focus:end', { sessionId, completed: false });
      } catch { /* ignore */ }
      setSId(null);
    }
  };

  const skipBreak = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (sessionId) {
      focusApi.end(sessionId, { completed: false }).catch(() => {});
      setSId(null);
    }
    setType('work');
    setSecs(workMin * 60);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    if (sessionId) {
      focusApi.end(sessionId, { completed: false }).catch(() => {});
      setSId(null);
    }
    setSecs(type === 'work' ? workMin * 60 : breakMin * 60);
  };

  const applySettings = () => {
    setWorkMin(settingWork);
    setBreakMin(settingBreak);
    if (!running) setSecs(settingWork * 60);
    setShowSettings(false);
  };

  const productivityScore = stats
    ? Math.min(100, Math.round((stats.totalSessions / 4) * 100))
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight">Focus Mode</h1>
          <p className="font-mono text-[11px] text-[rgba(186,230,253,0.35)] mt-1">
            Deep work · {sessionsToday} sessions today
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {[
              { v: 'work',  l: '🎯 Work'  },
              { v: 'break', l: '☕ Break' },
            ].map(({ v, l }) => (
              <button key={v}
                onClick={() => { if (!running) { setType(v); } }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  type === v ? 'btn-primary' : 'btn-ghost text-[rgba(186,230,253,0.4)]'
                } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={running}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => { setSettingWork(workMin); setSettingBreak(breakMin); setShowSettings(true); }}
            className="btn-ghost p-2 rounded-xl">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main timer card */}
        <div className="card card-ion p-8 flex flex-col items-center gap-6">
          {/* Ring timer */}
          <div className="relative">
            <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background track */}
              <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              {/* Break segment */}
              {type === 'break' && (
                <circle cx="130" cy="130" r={r} fill="none" stroke="rgba(16,185,129,0.15)"
                  strokeWidth="8" strokeDasharray={circ} strokeDashoffset={0} />
              )}
              {/* Progress arc */}
              <circle cx="130" cy="130" r={r} fill="none"
                stroke={type === 'work' ? 'url(#timerGradWork)' : 'url(#timerGradBreak)'}
                strokeWidth="8"
                strokeDasharray={circ}
                strokeDashoffset={circ - pct * circ}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
              <defs>
                <linearGradient id="timerGradWork" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="timerGradBreak" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06e5d4" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-bold text-6xl tracking-tight leading-none">
                {formatTime(secs)}
              </div>
              <div className="font-mono text-[11px] text-[rgba(186,230,253,0.4)] mt-2">
                {type === 'work' ? `${workMin}m work block` : `${breakMin}m break`}
              </div>
              <AnimatePresence>
                {xpMsg && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="font-display font-bold text-[#0ea5e9] text-lg mt-2">
                    {xpMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* XP progress hint */}
          <div className="w-full max-w-sm">
            <div className="flex justify-between font-mono text-[10px] text-[rgba(186,230,253,0.3)] mb-1.5">
              <span>Session progress</span>
              <span>{Math.round((1 - pct) * 100)}% done</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed]"
                style={{ width: `${Math.round((1 - pct) * 100)}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={resetTimer}
              className="btn-ghost p-3 rounded-xl" title="Reset">
              <RotateCcw size={16} />
            </button>

            {!running ? (
              <button onClick={() => startTimer()}
                className="btn-primary px-10 py-3.5 text-base font-bold rounded-2xl flex items-center gap-3"
                style={{ minWidth: 160 }}>
                <Play size={18} />
                {secs === (type === 'work' ? workMin : breakMin) * 60 ? 'Start' : 'Resume'}
              </button>
            ) : (
              <button onClick={pauseTimer}
                className="btn-ghost px-10 py-3.5 text-base font-bold rounded-2xl flex items-center gap-3"
                style={{ minWidth: 160 }}>
                <Pause size={18} />
                Pause
              </button>
            )}

            {type === 'break' && (
              <button onClick={skipBreak}
                className="btn-ghost p-3 rounded-xl text-[rgba(186,230,253,0.5)]" title="Skip break">
                <SkipForward size={16} />
              </button>
            )}
          </div>

          {/* Auto-start toggle */}
          <div className="flex items-center gap-3 font-mono text-xs text-[rgba(186,230,253,0.45)]">
            <button
              onClick={() => setAutoStart(a => !a)}
              className={`relative w-9 h-5 rounded-full transition-colors ${autoStart ? 'bg-[rgba(14,165,233,0.4)]' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${autoStart ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            Auto-start next session
          </div>
        </div>

        {/* Right column: stats + history */}
        <div className="flex flex-col gap-4">
          {/* Live stats */}
          <div className="card card-plasma p-5">
            <div className="label mb-4">Today's Focus</div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: <Target size={14} />, label: 'Sessions', value: stats?.totalSessions || 0, color: 'text-[#0ea5e9]' },
                { icon: <Clock size={14} />,  label: 'Hours',    value: `${stats?.totalHours || 0}h`, color: 'text-[#a78bfa]' },
                { icon: <Zap size={14} />,    label: 'XP Earned',value: stats?.totalXP || 0, color: 'text-[#f59e0b]' },
                { icon: <TrendingUp size={14} />, label: 'Score', value: `${productivityScore}%`, color: 'text-[#10b981]' },
              ].map(s => (
                <div key={s.label} className="text-center py-2">
                  <div className={`font-display font-bold text-2xl leading-none ${s.color}`}>{s.value}</div>
                  <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <div className="card card-bio p-5">
            <div className="label mb-3">AI Productivity Insight</div>
            <p className="text-xs text-[rgba(186,230,253,0.6)] leading-relaxed">
              {sessionsToday === 0
                ? 'Start your first focus session to begin tracking productivity. Morning sessions yield the highest deep work output.'
                : sessionsToday < 2
                ? `Great start! You've completed ${sessionsToday} session. Research shows 3+ daily sessions maximize cognitive flow.`
                : sessionsToday < 4
                ? `${sessionsToday} sessions in! You're in the deep work zone. Keep momentum — you're ${Math.round((sessionsToday/4)*100)}% to peak performance.`
                : `Excellent work — ${sessionsToday} sessions completed! You've hit peak focus today. Consider a longer break to consolidate learning.`
              }
            </p>
          </div>

          {/* Session duration config summary */}
          <div className="card p-4 flex gap-4">
            <div className="flex-1 text-center">
              <div className="font-display font-bold text-xl text-[#0ea5e9]">{workMin}m</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">Work block</div>
            </div>
            <div className="w-px bg-white/5" />
            <div className="flex-1 text-center">
              <div className="font-display font-bold text-xl text-[#10b981]">{breakMin}m</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] mt-0.5">Break</div>
            </div>
          </div>

          {/* Session history */}
          {history.length > 0 && (
            <div className="card card-ion p-5">
              <div className="label mb-3">Recent Sessions</div>
              {history.slice(0, 5).map((s, i) => (
                <SessionBadge key={i} session={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="card p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="font-display font-bold text-lg">Timer Settings</div>
                <button onClick={() => setShowSettings(false)}
                  className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {[
                { label: 'Work Duration', min: 5, max: 120, step: 5, value: settingWork,  set: setSettingWork,  unit: 'min', color: '#0ea5e9' },
                { label: 'Break Duration', min: 1, max: 30, step: 1, value: settingBreak, set: setSettingBreak, unit: 'min', color: '#10b981' },
              ].map(cfg => (
                <div key={cfg.label} className="mb-6">
                  <div className="flex justify-between mb-3">
                    <div className="label mb-0">{cfg.label}</div>
                    <div className="font-display font-bold text-lg" style={{ color: cfg.color }}>
                      {cfg.value} {cfg.unit}
                    </div>
                  </div>
                  <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={cfg.value}
                    onChange={e => cfg.set(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: cfg.color, background: `linear-gradient(to right, ${cfg.color} 0%, ${cfg.color} ${((cfg.value - cfg.min) / (cfg.max - cfg.min)) * 100}%, rgba(255,255,255,0.1) ${((cfg.value - cfg.min) / (cfg.max - cfg.min)) * 100}%, rgba(255,255,255,0.1) 100%)` }}
                  />
                  <div className="flex justify-between font-mono text-[10px] text-[rgba(186,230,253,0.25)] mt-1">
                    <span>{cfg.min}m</span><span>{cfg.max}m</span>
                  </div>
                </div>
              ))}

              {/* Quick presets */}
              <div className="mb-6">
                <div className="label mb-3">Quick Presets</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Standard', work: 25, brk: 5 },
                    { label: 'Long', work: 50, brk: 10 },
                    { label: 'Short', work: 15, brk: 3 },
                  ].map(p => (
                    <button key={p.label} onClick={() => { setSettingWork(p.work); setSettingBreak(p.brk); }}
                      className={`py-2 text-xs rounded-lg border transition-all ${
                        settingWork === p.work && settingBreak === p.brk
                          ? 'border-[rgba(14,165,233,0.4)] text-[#0ea5e9] bg-[rgba(14,165,233,0.08)]'
                          : 'border-white/10 text-[rgba(186,230,253,0.5)] hover:border-white/20'
                      }`}>
                      <div className="font-semibold">{p.label}</div>
                      <div className="font-mono text-[10px] opacity-60">{p.work}/{p.brk}m</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={applySettings} className="btn-primary flex-1 justify-center">Apply Settings</button>
                <button onClick={() => setShowSettings(false)} className="btn-ghost">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
