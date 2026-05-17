/**
 * AuthPage — Two-step authentication with email OTP verification.
 *
 * Flow:
 *   Register → OTP sent → user enters code → dashboard
 *   Login    → if unverified → OTP screen   → dashboard
 *   Login    → verified      → dashboard directly
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, RefreshCw, ArrowLeft, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import { authApi }      from '../services/api.js';
import ElixorLogo       from '../components/ui/ElixorLogo.jsx';

/* ─── OTP Digit Input ────────────────────────────────────────── */
function OtpInput({ value, onChange, disabled }) {
  const digits = 6;
  const refs   = useRef([]);

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const next = value.split('');
        next[i] = '';
        onChange(next.join(''));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && i > 0) { refs.current[i-1]?.focus(); return; }
    if (e.key === 'ArrowRight' && i < digits-1) { refs.current[i+1]?.focus(); return; }
    if (!/^\d$/.test(e.key)) return;
    const next = value.split('');
    next[i] = e.key;
    onChange(next.join(''));
    if (i < digits - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, digits);
    if (paste) { onChange(paste.padEnd(digits, '').slice(0, digits)); refs.current[Math.min(paste.length, digits-1)]?.focus(); }
    e.preventDefault();
  };

  const chars = value.split('').concat(Array(digits).fill('')).slice(0, digits);

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {chars.map((ch, i) => (
        <motion.input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={ch}
          readOnly
          onKeyDown={e => handleKey(i, e)}
          onFocus={e => e.target.select()}
          disabled={disabled}
          whileFocus={{ scale: 1.08 }}
          className="w-11 h-14 rounded-xl border text-center text-xl font-display font-bold transition-all duration-200 outline-none bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
          style={{
            borderColor: ch ? '#0ea5e9' : 'rgba(255,255,255,0.1)',
            color: ch ? '#0ea5e9' : 'rgba(186,230,253,0.4)',
            boxShadow: ch ? '0 0 12px rgba(14,165,233,0.2)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

/* ─── Countdown timer for resend ─────────────────────────────── */
function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds);
  const reset = useCallback(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft(l => l - 1), 1000);
    return () => clearInterval(t);
  }, [left]);
  return [left, reset];
}

/* ─── OTP Verification Screen ────────────────────────────────── */
function OtpScreen({ email, devOtp, onSuccess, onBack }) {
  const [otp,     setOtp]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [cooldown, resetCD]   = useCountdown(60);
  const { setAuthData }       = useAuthStore();

  const verify = async () => {
    if (otp.length < 6) return;
    setLoading(true); setError('');
    try {
      const { data } = await authApi.verifyOtp(email, otp);
      setSuccess(true);
      setTimeout(() => {
        setAuthData(data.data.user, data.data.accessToken);
        onSuccess();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Incorrect code');
      setOtp('');
    } finally { setLoading(false); }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError(''); setOtp('');
    try {
      await authApi.sendOtp(email);
      resetCD();
    } catch (err) { setError(err.response?.data?.message || 'Could not resend'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 font-mono text-[10px] text-[rgba(186,230,253,0.35)] hover:text-white transition-colors mb-6">
        <ArrowLeft size={12}/> Back
      </button>

      {/* Success state */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 py-8">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}
              className="w-16 h-16 rounded-2xl bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.4)] flex items-center justify-center">
              <ShieldCheck size={28} className="text-[#10b981]"/>
            </motion.div>
            <div className="text-center">
              <div className="font-display font-bold text-xl text-[#10b981] mb-1">Verified!</div>
              <div className="font-mono text-xs text-[rgba(186,230,253,0.5)]">Entering ELIXOR…</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!success && (
        <>
          {/* Header */}
          <div className="text-center mb-7">
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2.5, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(124,58,237,0.2))', border: '1px solid rgba(14,165,233,0.3)' }}>
              <ShieldCheck size={22} className="text-[#0ea5e9]"/>
            </motion.div>
            <div className="font-display font-bold text-xl mb-1">Verify your email</div>
            <div className="font-mono text-xs text-[rgba(186,230,253,0.5)] leading-relaxed">
              We sent a 6-digit code to<br/>
              <span className="text-[#0ea5e9]">{email}</span>
            </div>
          </div>

          {/* Dev OTP hint */}
          {devOtp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-4 p-2.5 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] text-center">
              <div className="font-mono text-[9px] text-[#f59e0b] uppercase tracking-widest mb-0.5">Dev Mode — Your OTP</div>
              <div className="font-display font-bold text-2xl text-[#f59e0b] tracking-widest">{devOtp}</div>
            </motion.div>
          )}

          {/* OTP input */}
          <div className="mb-5">
            <OtpInput value={otp} onChange={setOtp} disabled={loading}/>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[#f43f5e] font-mono text-xs text-center mb-4">{error}</motion.p>
            )}
          </AnimatePresence>

          {/* Verify button */}
          <button
            onClick={verify}
            disabled={otp.length < 6 || loading}
            className="btn-primary w-full justify-center py-3 mb-3 disabled:opacity-40 disabled:cursor-not-allowed">
            {loading
              ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"/> Verifying…</span>
              : <><ShieldCheck size={14}/> Verify &amp; Enter ELIXOR</>
            }
          </button>

          {/* Resend */}
          <div className="text-center">
            <button onClick={resend} disabled={cooldown > 0}
              className="flex items-center gap-1.5 font-mono text-[10px] mx-auto transition-colors disabled:opacity-40"
              style={{ color: cooldown > 0 ? 'rgba(186,230,253,0.25)' : '#0ea5e9' }}>
              <RefreshCw size={10}/>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ─── Main AuthPage ───────────────────────────────────────────── */
export default function AuthPage() {
  const [tab,     setTab]     = useState('login');
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  // OTP step state
  const [otpStep,  setOtpStep]  = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [devOtp,   setDevOtp]   = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        try {
          await login(form.email, form.password);
          navigate('/dashboard');
        } catch (err) {
          // Backend signals unverified user — show OTP screen
          const body = err.response?.data;
          if (body?.pendingVerification) {
            setOtpEmail(body.email || form.email);
            // Trigger a fresh OTP send for this login attempt
            try {
              const r = await authApi.sendOtp(body.email || form.email);
              setDevOtp(r.data?.data?.devOtp || '');
            } catch {}
            setOtpStep(true);
            return;
          }
          throw err;
        }
      } else {
        const { data } = await authApi.register({
          name: form.name, email: form.email, password: form.password,
        });
        setOtpEmail(form.email);
        setDevOtp(data.data?.devOtp || '');
        setOtpStep(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const switchTab = (t) => {
    setTab(t); setError(''); setShowPw(false);
    setForm({ name: '', email: '', password: '' });
  };

  // Password strength
  const pwStrength = (() => {
    const p = form.password;
    if (!p || tab !== 'register') return null;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[!@#$%^&*]/.test(p)) s++;
    return s;
  })();

  const pwLabel  = [null, 'Weak', 'Fair', 'Good', 'Strong'][pwStrength] || null;
  const pwColor  = [null, '#f43f5e', '#f59e0b', '#0ea5e9', '#10b981'][pwStrength] || null;

  return (
    <div className="min-h-screen bg-[#010203] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="ambient-mesh w-[600px] h-[600px] -top-60 -left-40 opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 60%)' }}/>
      <div className="ambient-mesh w-[500px] h-[500px] -bottom-40 -right-20 opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 60%)', animationDuration: '30s', animationDelay: '-8s' }}/>
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,1) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }}/>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-7">
            <ElixorLogo size={44}/>
            <div>
              <div className="font-display font-bold text-xl tracking-tight">ELIXOR</div>
              <div className="font-mono text-[10px] text-[rgba(14,165,233,0.6)]">
                Powered by <span className="text-[#a78bfa]">AURA.AI</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── OTP step ── */}
            {otpStep && (
              <OtpScreen
                key="otp"
                email={otpEmail}
                devOtp={devOtp}
                onSuccess={() => navigate('/dashboard')}
                onBack={() => { setOtpStep(false); setDevOtp(''); setError(''); }}
              />
            )}

            {/* ── Auth form ── */}
            {!otpStep && (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Tabs */}
                <div className="flex gap-0.5 bg-white/[0.04] rounded-xl p-1 mb-6">
                  {[
                    { id: 'login',    label: 'Sign In'        },
                    { id: 'register', label: 'Create Account' },
                  ].map(t => (
                    <button key={t.id} onClick={() => switchTab(t.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === t.id
                          ? 'bg-[rgba(14,165,233,0.12)] text-[#0ea5e9] border border-[rgba(14,165,233,0.2)]'
                          : 'text-[rgba(186,230,253,0.4)] hover:text-[rgba(186,230,253,0.7)]'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Verification notice */}
                {tab === 'register' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.15)] mb-4">
                    <ShieldCheck size={14} className="text-[#0ea5e9] flex-shrink-0 mt-0.5"/>
                    <div className="font-mono text-[10px] text-[rgba(186,230,253,0.6)] leading-relaxed">
                      A 6-digit verification code will be sent to your email. Your account is activated after verification.
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence>
                    {tab === 'register' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="label">Full Name</div>
                        <input className="input-field" type="text" placeholder="Your name"
                          value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required autoComplete="name"/>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <div className="label">Email</div>
                    <input className="input-field" type="email" placeholder="you@example.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required autoComplete="email"/>
                  </div>

                  <div>
                    <div className="label">Password</div>
                    <div className="relative">
                      <input
                        className="input-field pr-11"
                        type={showPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required
                        autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                        minLength={tab === 'register' ? 6 : undefined}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(186,230,253,0.3)] hover:text-[rgba(186,230,253,0.7)] transition-colors p-1">
                        <AnimatePresence mode="wait">
                          {showPw
                            ? <motion.span key="off" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }}><EyeOff size={15}/></motion.span>
                            : <motion.span key="on"  initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }}><Eye size={15}/></motion.span>
                          }
                        </AnimatePresence>
                      </button>
                    </div>
                    {/* Password strength meter */}
                    {pwStrength !== null && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                              style={{ background: i <= pwStrength ? pwColor : 'rgba(255,255,255,0.08)' }}/>
                          ))}
                        </div>
                        <div className="font-mono text-[9px]" style={{ color: pwColor }}>{pwLabel}</div>
                      </motion.div>
                    )}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                        className="text-[#f43f5e] font-mono text-xs px-1">{error}</motion.p>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={loading}
                    className="btn-primary w-full justify-center mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading
                      ? <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"/>
                          Please wait…
                        </span>
                      : tab === 'login'
                        ? <><Zap size={14}/> Sign In →</>
                        : <><ShieldCheck size={14}/> Create & Verify →</>
                    }
                  </button>

                  <p className="text-center font-mono text-[10px] text-[rgba(186,230,253,0.15)] mt-3">
                    ELIXOR · Powered by AURA.AI · Secure auth
                  </p>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
