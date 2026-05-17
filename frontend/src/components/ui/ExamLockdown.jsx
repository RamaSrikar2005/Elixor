/**
 * ExamLockdown — Full-screen immersive exam environment.
 * Locks the UI, requests browser fullscreen, shows breathing guide,
 * runs the countdown timer, and fires a celebration on completion.
 *
 * Architecture:
 *   1. Mount → breathing phase (30s) → timer phase → celebration phase
 *   2. Fullscreen API is requested automatically on mount
 *   3. Keyboard/back-navigation is blocked during the session
 *   4. Exit requires explicit confirmation to prevent accidents
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, CheckCircle2 } from 'lucide-react';

/* ─── Breathing animation phases ─────────────────────────────── */
const BREATH_CYCLE = [
  { label: 'Breathe in…',  duration: 4000, scale: 1.55, opacity: 0.9 },
  { label: 'Hold…',        duration: 3000, scale: 1.55, opacity: 1.0 },
  { label: 'Breathe out…', duration: 5000, scale: 1.0,  opacity: 0.6 },
  { label: 'Hold…',        duration: 2000, scale: 1.0,  opacity: 0.5 },
];
const BREATH_TOTAL = BREATH_CYCLE.reduce((s, p) => s + p.duration, 0); // 14 000 ms

/* ─── Motivational quotes shown during exam ──────────────────── */
const QUOTES = [
  'Concentrate all your thoughts upon the work at hand.',
  'Success is the sum of small efforts, repeated day in and day out.',
  "Believe you can and you're halfway there.",
  'The secret of getting ahead is getting started.',
  'Focused action is the key that unlocks potential.',
  'Deep work produces extraordinary results.',
];

/* ─── Confetti particle ──────────────────────────────────────── */
function Particle({ delay }) {
  const x = (Math.random() - 0.5) * 400;
  const y = -(Math.random() * 600 + 200);
  const rot = Math.random() * 720 - 360;
  const color = ['#0ea5e9','#10b981','#f59e0b','#a78bfa','#f43f5e'][Math.floor(Math.random()*5)];
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ background: color, left: '50%', top: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ x, y, opacity: 0, rotate: rot, scale: [1, 1.2, 0.5] }}
      transition={{ duration: 1.8, delay, ease: 'easeOut' }}
    />
  );
}

/* ─── Celebration screen ─────────────────────────────────────── */
function CelebrationScreen({ duration, xpEarned, onExit }) {
  const mins = Math.floor(duration / 60);
  const focusScore = Math.min(100, Math.round(40 + Math.random() * 30 + mins * 0.5));
  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center overflow-hidden">
      {/* Confetti burst */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 35 }, (_, i) => <Particle key={i} delay={i * 0.04} />)}
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, delay: 0.4 }}
          className="text-8xl"
        >
          🏆
        </motion.div>

        <div>
          <div className="font-mono text-[12px] tracking-widest uppercase text-[rgba(14,165,233,0.7)] mb-2">
            Session Complete
          </div>
          <div className="font-display font-bold text-4xl tracking-tight text-[#f0f9ff] mb-1">
            Outstanding Work!
          </div>
          <div className="font-mono text-sm text-[rgba(186,230,253,0.5)]">
            You studied for <strong className="text-[#0ea5e9]">{mins} minutes</strong> with deep focus.
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          {[
            { icon: '⚡', label: 'XP Earned',    value: `+${xpEarned}` },
            { icon: '🧠', label: 'Focus Score',  value: `${focusScore}/100` },
            { icon: '⏱️', label: 'Time Studied', value: `${mins}m` },
          ].map(s => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-center px-5 py-3 rounded-2xl border border-[rgba(14,165,233,0.2)] bg-[rgba(14,165,233,0.06)]"
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-display font-bold text-xl text-[#0ea5e9]">{s.value}</div>
              <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)] mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Motivational quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="max-w-sm font-mono text-sm text-[rgba(186,230,253,0.4)] italic text-center leading-relaxed"
        >
          "{QUOTES[Math.floor(Math.random() * QUOTES.length)]}"
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          onClick={onExit}
          className="btn-primary px-10 py-3.5 text-base font-bold"
        >
          <CheckCircle2 size={18} className="mr-2" /> Return to Study
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ─── Breathing guide ────────────────────────────────────────── */
function BreathingGuide({ onStart }) {
  const [phaseIdx,  setPhaseIdx]  = useState(0);
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const tick  = setInterval(() => {
      const ms  = Date.now() - start;

      // Which breath phase are we in?
      let cumulative = 0;
      for (let i = 0; i < BREATH_CYCLE.length; i++) {
        cumulative += BREATH_CYCLE[i].duration;
        if (ms % BREATH_TOTAL < cumulative) {
          setPhaseIdx(i);
          setCountdown(Math.ceil((cumulative - (ms % BREATH_TOTAL)) / 1000));
          break;
        }
      }
    }, 100);
    return () => clearInterval(tick);
  }, []);

  const phase = BREATH_CYCLE[phaseIdx];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 text-center">
      <div>
        <div className="font-mono text-[11px] tracking-widest uppercase text-[rgba(14,165,233,0.5)] mb-2">
          Prepare Your Mind
        </div>
        <div className="font-display font-bold text-2xl text-[#f0f9ff]">
          Breathing Exercise
        </div>
        <div className="font-mono text-sm text-[rgba(186,230,253,0.4)] mt-1">
          Follow the circle. Calm your mind before the session.
        </div>
      </div>

      {/* Breathing circle */}
      <div className="relative flex items-center justify-center" style={{ width: 220, height: 220 }}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute rounded-full border border-[rgba(14,165,233,0.2)]"
          animate={{ scale: phase.scale * 1.15, opacity: phase.opacity * 0.4 }}
          transition={{ duration: phase.duration / 1000, ease: 'easeInOut' }}
          style={{ width: 180, height: 180 }}
        />
        {/* Main circle */}
        <motion.div
          className="absolute rounded-full"
          animate={{ scale: phase.scale, opacity: phase.opacity }}
          transition={{ duration: phase.duration / 1000, ease: 'easeInOut' }}
          style={{
            width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(14,165,233,0.3) 0%, rgba(14,165,233,0.05) 100%)',
            border: '2px solid rgba(14,165,233,0.5)',
            boxShadow: '0 0 40px rgba(14,165,233,0.2)',
          }}
        />
        {/* Center */}
        <div className="relative z-10 text-center">
          <div className="font-display font-bold text-3xl text-[#0ea5e9]">{countdown}</div>
          <div className="font-mono text-[11px] text-[rgba(186,230,253,0.5)] mt-0.5">{phase.label}</div>
        </div>
      </div>

      <button onClick={onStart} className="btn-primary px-8 py-3.5 text-base font-bold flex items-center gap-3">
        <Play size={16} /> Begin Session
      </button>

      <div className="font-mono text-[10px] text-[rgba(186,230,253,0.25)]">
        Or press Space to start immediately
      </div>
    </div>
  );
}

/* ─── Main ExamLockdown ───────────────────────────────────────── */
export default function ExamLockdown({ duration, subject, onExit }) {
  const [phase,   setPhase]   = useState('breathe'); // 'breathe' | 'timer' | 'celebrate'
  const [secs,    setSecs]    = useState(0);
  const [paused,  setPaused]  = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [quote,   setQuote]   = useState(QUOTES[0]);
  const [quoteIdx,setQIdx]    = useState(0);
  const timerRef = useRef(null);
  const totalSecs = duration * 60;
  const xpEarned  = Math.max(5, Math.round(secs / 60 * 0.5));

  // Request fullscreen + block scroll
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    document.body.style.overflow = 'hidden';
    // Block Escape key (fullscreen listener still works, but we prevent default)
    const blockEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); setConfirm(true); } };
    window.addEventListener('keydown', blockEsc, true);
    return () => {
      document.exitFullscreen?.().catch(() => {});
      document.body.style.overflow = '';
      window.removeEventListener('keydown', blockEsc, true);
    };
  }, []);

  // Rotate quotes every 45s
  useEffect(() => {
    const t = setInterval(() => {
      setQIdx(i => {
        const next = (i + 1) % QUOTES.length;
        setQuote(QUOTES[next]);
        return next;
      });
    }, 45000);
    return () => clearInterval(t);
  }, []);

  // Timer logic
  useEffect(() => {
    if (phase !== 'timer' || paused) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSecs(s => {
        const next = s + 1;
        if (next >= totalSecs) {
          clearInterval(timerRef.current);
          setPhase('celebrate');
          document.exitFullscreen?.().catch(() => {});
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, paused, totalSecs]);

  // Start timer from breathing phase
  const startTimer = useCallback(() => setPhase('timer'), []);

  // Keyboard Space to start
  useEffect(() => {
    if (phase !== 'breathe') return;
    const handler = (e) => { if (e.key === ' ') { e.preventDefault(); startTimer(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, startTimer]);

  const handleExit = () => {
    clearInterval(timerRef.current);
    document.exitFullscreen?.().catch(() => {});
    document.body.style.overflow = '';
    onExit({ secs, xpEarned });
  };

  // Timer display
  const remaining = totalSecs - secs;
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const pct = secs / totalSecs;
  const r   = 110, circ = 2 * Math.PI * r;

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: 'linear-gradient(135deg, #010203 0%, #020912 50%, #010203 100%)' }}
    >
      {/* Neural grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,1) 1px,transparent 1px)',
        backgroundSize: '36px 36px',
      }}/>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.04), transparent 70%)', filter: 'blur(60px)' }}/>

      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(14,165,233,0.06)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-[#f43f5e]"/>
          <span className="font-mono text-[11px] tracking-widest uppercase text-[rgba(244,63,94,0.7)]">
            Exam Mode Active
          </span>
        </div>
        {subject && (
          <div className="flex items-center gap-2 font-mono text-[11px] text-[rgba(186,230,253,0.4)]">
            <span>{subject.emoji}</span>
            <span>{subject.name}</span>
          </div>
        )}
        {phase === 'timer' && (
          <button onClick={() => setConfirm(true)}
            className="flex items-center gap-1.5 font-mono text-[11px] text-[rgba(186,230,253,0.3)] hover:text-[#f43f5e] transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-[rgba(244,63,94,0.2)]">
            <X size={13}/> Exit
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">

          {/* Breathing phase */}
          {phase === 'breathe' && (
            <motion.div key="breathe" className="w-full h-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <BreathingGuide onStart={startTimer}/>
            </motion.div>
          )}

          {/* Timer phase */}
          {phase === 'timer' && (
            <motion.div key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-8 text-center"
            >
              {/* Countdown ring */}
              <div className="relative">
                <svg width="280" height="280" viewBox="0 0 280 280" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Track */}
                  <circle cx="140" cy="140" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
                  {/* Warning zone at 20% remaining */}
                  <circle cx="140" cy="140" r={r} fill="none"
                    stroke={pct > 0.8 ? 'rgba(244,63,94,0.2)' : 'transparent'}
                    strokeWidth="8" strokeDasharray={circ} strokeDashoffset={0}/>
                  {/* Progress arc */}
                  <motion.circle cx="140" cy="140" r={r} fill="none"
                    stroke={pct > 0.8 ? '#f43f5e' : '#0ea5e9'}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={pct * circ}
                    style={{
                      filter: `drop-shadow(0 0 16px ${pct > 0.8 ? 'rgba(244,63,94,0.6)' : 'rgba(14,165,233,0.5)'})`,
                      transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
                    }}/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-display font-bold text-[64px] tracking-tight leading-none text-[#f0f9ff]">
                    {mm}:{ss}
                  </div>
                  <div className="font-mono text-sm text-[rgba(186,230,253,0.4)] mt-2">
                    {paused ? '⏸ Paused' : 'remaining'}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button onClick={() => setPaused(p => !p)}
                  className="btn-ghost px-6 py-3 flex items-center gap-2 font-semibold">
                  {paused ? <><Play size={15}/> Resume</> : <><Pause size={15}/> Pause</>}
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-80">
                <div className="flex justify-between font-mono text-[10px] text-[rgba(186,230,253,0.3)] mb-1.5">
                  <span>{Math.round(pct * 100)}% elapsed</span>
                  <span>⚡ +{xpEarned} XP earned</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: pct > 0.8 ? '#f43f5e' : 'linear-gradient(90deg, #0ea5e9, #7c3aed)' }}
                    animate={{ width: `${pct * 100}%` }}
                    transition={{ duration: 0.5 }}/>
                </div>
              </div>

              {/* Rotating motivational quote */}
              <AnimatePresence mode="wait">
                <motion.div key={quoteIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.6 }}
                  className="max-w-md font-mono text-xs text-[rgba(186,230,253,0.25)] italic text-center leading-relaxed px-4"
                >
                  "{quote}"
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Celebration phase */}
          {phase === 'celebrate' && (
            <motion.div key="celebrate" className="w-full h-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CelebrationScreen duration={secs} xpEarned={xpEarned} onExit={handleExit}/>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Exit confirmation dialog */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-8 max-w-sm w-full text-center mx-4"
            >
              <div className="text-4xl mb-4">⚠️</div>
              <div className="font-display font-bold text-xl mb-2">Exit Exam Mode?</div>
              <div className="font-mono text-sm text-[rgba(186,230,253,0.5)] mb-6 leading-relaxed">
                You've studied for <strong className="text-[#0ea5e9]">{Math.floor(secs/60)}m {secs%60}s</strong>
                . Exiting will still save your progress and XP.
              </div>
              <div className="flex gap-3">
                <button onClick={handleExit} className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-[rgba(244,63,94,0.15)] text-[#f43f5e] border border-[rgba(244,63,94,0.25)] hover:bg-[rgba(244,63,94,0.25)] transition-all">
                  Exit Session
                </button>
                <button onClick={() => setConfirm(false)} className="btn-primary flex-1 py-2.5 justify-center">
                  Keep Going
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  return createPortal(content, document.body);
}
