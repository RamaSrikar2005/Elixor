/**
 * SplashScreen — Premium ELIXOR opening experience.
 *
 * Phase 1 (0–3.5s): ELIXOR wordmark + orbital rings + floating particles
 * Phase 2 (3.5–5.5s): "Powered by AURA.AI" reveal + personalized greeting
 * Phase 3 (5.5s+): Fade-scale exit → dashboard
 *
 * Shows once per browser session via sessionStorage.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore.js';

const SPLASH_KEY = 'elixor_splash_v3';

export function shouldShowSplash() {
  return !sessionStorage.getItem(SPLASH_KEY);
}
export function markSplashShown() {
  sessionStorage.setItem(SPLASH_KEY, '1');
}

/* ─── Greeting logic ─────────────────────────────────────────── */
function timeGreeting(user) {
  const h    = new Date().getHours();
  const name = user?.name?.split(' ')[0] || 'Explorer';
  if (h < 5)  return { icon: '🌙', line: `Night owl mode, ${name}`, sub: 'Late-night focus detected. AURA.AI is with you.' };
  if (h < 12) return { icon: '🌅', line: `Good morning, ${name}`, sub: 'Your best work happens now. Let\'s make it count.' };
  if (h < 17) return { icon: '☀️', line: `Good afternoon, ${name}`, sub: 'Momentum is your superpower. Keep pushing.' };
  if (h < 21) return { icon: '🌆', line: `Good evening, ${name}`, sub: 'Time to reflect, plan, and recharge.' };
  return        { icon: '🌙', line: `Good night, ${name}`, sub: 'Rest well — AURA.AI will be here tomorrow.' };
}

/* ─── Floating particle (CSS-animated) ──────────────────────── */
function Particle({ x, y, size, delay, duration, color }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: 'blur(1px)' }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

/* ─── Orbital ring ───────────────────────────────────────────── */
function OrbitalRing({ size, duration, delay, color, opacity }) {
  return (
    <motion.div
      className="absolute rounded-full border pointer-events-none"
      style={{
        width: size, height: size,
        borderColor: color,
        opacity,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }}
      animate={{ rotate: 360, scale: [1, 1.05, 1] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  );
}

/* ─── AURA.AI typewriter ─────────────────────────────────────── */
function TypeWriter({ text, className }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setShown(text.slice(0, ++i));
      if (i >= text.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, [text]);
  return (
    <span className={className}>
      {shown}
      {shown.length < text.length && (
        <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>|</motion.span>
      )}
    </span>
  );
}

/* ─── Main SplashScreen ──────────────────────────────────────── */
export default function SplashScreen({ onDone }) {
  const { user } = useAuthStore();
  const [phase, setPhase] = useState('logo'); // logo → aura → greeting → out
  const greet = timeGreeting(user);

  // Pre-generate particles so they don't re-randomize on re-render
  const particles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 4,
    duration: Math.random() * 4 + 3,
    color: ['rgba(14,165,233,0.7)', 'rgba(124,58,237,0.7)', 'rgba(16,185,129,0.5)', 'rgba(6,229,212,0.5)'][i % 4],
  })), []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('aura'),    2800);
    const t2 = setTimeout(() => setPhase('greeting'), 4200);
    const t3 = setTimeout(() => {
      setPhase('out');
      markSplashShown();
      setTimeout(onDone, 700);
    }, 6200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== 'out' && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #060d1f 0%, #010203 70%)' }}
        >
          {/* Neural grid background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,1) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}/>

          {/* Floating particles */}
          {particles.map(p => <Particle key={p.id} {...p}/>)}

          {/* Orbital rings */}
          <OrbitalRing size={320} duration={18} delay={0}   color="rgba(14,165,233,0.12)"  opacity={1}/>
          <OrbitalRing size={480} duration={26} delay={1}   color="rgba(124,58,237,0.08)"  opacity={1}/>
          <OrbitalRing size={640} duration={34} delay={0.5} color="rgba(14,165,233,0.05)"  opacity={1}/>

          {/* Central glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              width: 500, height: 500, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)',
              filter: 'blur(20px)',
            }}/>

          <AnimatePresence mode="wait">

            {/* ── Phase 1: ELIXOR logo ── */}
            {phase === 'logo' && (
              <motion.div key="logo"
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.1, y: -40 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-8 relative z-10"
              >
                {/* Hexagonal logo mark */}
                <div className="relative">
                  {/* Outer pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-[28px]"
                    animate={{ boxShadow: ['0 0 0px rgba(14,165,233,0)', '0 0 80px rgba(14,165,233,0.5)', '0 0 0px rgba(14,165,233,0)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <motion.div
                    animate={{ rotate: [0, 3, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-28 h-28 rounded-[28px] flex items-center justify-center text-white font-display font-black relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 60%, #06e5d4 100%)' }}
                  >
                    {/* Inner shine */}
                    <motion.div className="absolute inset-0 opacity-30"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%)' }}
                      animate={{ opacity: [0.2, 0.5, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="relative text-6xl font-black tracking-tighter" style={{ textShadow: '0 0 30px rgba(255,255,255,0.4)' }}>E</span>
                  </motion.div>
                </div>

                {/* ELIXOR wordmark */}
                <div className="text-center">
                  <motion.div
                    initial={{ letterSpacing: '0.5em', opacity: 0 }}
                    animate={{ letterSpacing: '0.1em', opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="font-display font-black text-6xl leading-none"
                    style={{
                      background: 'linear-gradient(135deg, #f0f9ff 0%, #7dd3fc 40%, #a78bfa 80%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      textShadow: 'none',
                    }}
                  >
                    ELIXOR
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="font-mono text-xs tracking-[0.3em] uppercase mt-3 text-[rgba(14,165,233,0.5)]"
                  >
                    Personal AI Ecosystem
                  </motion.div>
                </div>

                {/* Scanning loading line */}
                <div className="w-56 h-px bg-[rgba(255,255,255,0.06)] relative overflow-hidden rounded-full">
                  <motion.div className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #0ea5e9, #7c3aed, transparent)' }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Phase 2: AURA.AI reveal ── */}
            {phase === 'aura' && (
              <motion.div key="aura"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-6 text-center relative z-10"
              >
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-mono text-[11px] tracking-[0.35em] uppercase text-[rgba(14,165,233,0.5)]"
                >
                  Powered by
                </motion.div>

                {/* AURA.AI wordmark */}
                <div className="relative">
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -inset-4 rounded-2xl"
                    style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.2), transparent 70%)' }}
                  />
                  <div className="font-display font-black text-5xl relative"
                    style={{
                      background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #0ea5e9 80%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                    <TypeWriter text="AURA.AI" className=""/>
                  </div>
                </div>

                <div className="font-mono text-sm text-[rgba(186,230,253,0.5)] max-w-xs leading-relaxed">
                  Your intelligent study companion,<br/>wellness coach & productivity co-pilot
                </div>

                {/* AI capability pills */}
                <motion.div className="flex flex-wrap gap-2 justify-center max-w-sm"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  {['Study Mentor', 'Research AI', 'Wellness Coach', 'Deep Work', 'AI Diagrams'].map((p, i) => (
                    <motion.div key={p}
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="px-3 py-1 rounded-full border font-mono text-[10px]"
                      style={{ borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa', background: 'rgba(124,58,237,0.08)' }}>
                      {p}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ── Phase 3: Greeting ── */}
            {phase === 'greeting' && (
              <motion.div key="greeting"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-5 text-center px-8 max-w-md relative z-10"
              >
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-6xl"
                >
                  {greet.icon}
                </motion.div>

                <div>
                  <div className="font-display font-bold text-3xl tracking-tight text-[#f0f9ff] leading-tight mb-2">
                    {greet.line}
                  </div>
                  <div className="font-mono text-sm text-[rgba(186,230,253,0.5)] leading-relaxed">
                    {greet.sub}
                  </div>
                </div>

                {user && (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {(user.xp ?? 0) > 0 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }}
                        className="px-3 py-1.5 rounded-full border border-[rgba(14,165,233,0.2)] bg-[rgba(14,165,233,0.08)] font-mono text-[11px] text-[#0ea5e9]">
                        ⚡ {(user.xp || 0).toLocaleString()} XP
                      </motion.div>
                    )}
                    {(user.level ?? 1) > 1 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
                        className="px-3 py-1.5 rounded-full border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.08)] font-mono text-[11px] text-[#a78bfa]">
                        🏆 Level {user.level}
                      </motion.div>
                    )}
                    {(user.streak ?? 0) > 0 && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                        className="px-3 py-1.5 rounded-full border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.08)] font-mono text-[11px] text-[#f59e0b]">
                        🔥 {user.streak}-day streak
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                <div className="w-52 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <motion.div className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #0ea5e9, #7c3aed, #06e5d4)' }}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.6, ease: 'easeInOut' }}
                  />
                </div>

                <div className="font-mono text-[10px] text-[rgba(14,165,233,0.4)] tracking-widest uppercase">
                  Loading your intelligence layer…
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
