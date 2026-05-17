import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore.js';
import ElixorLogo from '../components/ui/ElixorLogo.jsx';

export default function AuthPage() {
  const [tab,     setTab]     = useState('login');
  const [form,    setForm]    = useState({ name: '', email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setShowPw(false);
    setForm({ name: '', email: '', password: '' });
  };

  return (
    <div className="min-h-screen bg-[#010203] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="ambient-mesh w-[600px] h-[600px] -top-60 -left-40 opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 60%)' }} />
      <div className="ambient-mesh w-[500px] h-[500px] -bottom-40 -right-20 opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent 60%)', animationDuration: '30s', animationDelay: '-8s' }} />
      {/* Neural grid */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(14,165,233,1) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,1) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="card p-8">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-8">
            <ElixorLogo size={44} />
            <div>
              <div className="font-display font-bold text-xl tracking-tight">Elixor OS</div>
              <div className="font-mono text-[10px] text-[rgba(14,165,233,0.6)]">Personal AI Operating System</div>
            </div>
          </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {tab === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="label">Full Name</div>
                  <input className="input-field" type="text" placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required autoComplete="name" />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="label">Email</div>
              <input className="input-field" type="email" placeholder="you@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required autoComplete="email" />
            </div>

            {/* Password with show/hide toggle */}
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
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(186,230,253,0.3)] hover:text-[rgba(186,230,253,0.7)] transition-colors p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <AnimatePresence mode="wait">
                    {showPw
                      ? <motion.span key="off" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                          <EyeOff size={15} />
                        </motion.span>
                      : <motion.span key="on"  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                          <Eye size={15} />
                        </motion.span>
                    }
                  </AnimatePresence>
                </button>
              </div>
              {tab === 'register' && (
                <div className="font-mono text-[10px] text-[rgba(186,230,253,0.25)] mt-1">Minimum 6 characters</div>
              )}
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-[#f43f5e] font-mono text-xs px-1">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center mt-2 py-3 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading
                ? <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Please wait…
                  </span>
                : tab === 'login' ? 'Sign In →' : 'Create Account →'
              }
            </button>

            <p className="text-center font-mono text-[10px] text-[rgba(186,230,253,0.2)] mt-3">
              Demo: arjun@elixor.dev / password123
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
