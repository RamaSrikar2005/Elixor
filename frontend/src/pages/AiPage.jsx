import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Zap, Brain, Sparkles, BookOpen, TrendingUp, Heart, DollarSign } from 'lucide-react';
import { aiApi } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useAppStore }  from '../store/appStore.js';

/* ─── Prompt catalogue ───────────────────────────────────────── */
const QUICK_PROMPTS = [
  { icon: TrendingUp, label: 'Productivity analysis',  q: 'Analyze my productivity this week and tell me what to improve.' },
  { icon: BookOpen,   label: 'Study plan',              q: 'Create a smart study plan for today based on my current habits.' },
  { icon: DollarSign, label: 'Finance insight',         q: 'Where am I overspending and how can I save more?' },
  { icon: Heart,      label: 'Wellness check',          q: 'Give me a wellness assessment and suggest improvements.' },
  { icon: Brain,      label: 'AI action plan',          q: 'What are the top 3 things I should focus on right now?' },
  { icon: Sparkles,   label: 'Daily briefing',          q: 'Give me a comprehensive daily briefing based on all my data.' },
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
    </div>
  );
}

function formatMd(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(14,165,233,0.1);padding:1px 5px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:11px">$1</code>')
    .replace(/\n/g, '<br>');
}

function AuraLogo({ size = 42 }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <motion.div
        className="w-full h-full rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)' }}
        animate={{ boxShadow: ['0 0 12px rgba(14,165,233,0.3)', '0 0 24px rgba(124,58,237,0.5)', '0 0 12px rgba(14,165,233,0.3)'] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Zap size={size * 0.45} className="text-white"/>
      </motion.div>
      <motion.span
        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10b981] border-2 border-[#010203]"
        animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

export default function AiPage() {
  const { token }     = useAuthStore();
  const { dashboard } = useAppStore();
  const [messages, setMessages]  = useState([]);
  const [input,    setInput]     = useState('');
  const [loading,  setLoading]   = useState(false);
  const [histLoading, setHL]     = useState(true);
  const chatRef = useRef(null);
  const scroll = () => setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);

  const buildGreeting = () => {
    const d    = dashboard?.user;
    const hour = new Date().getHours();
    const g    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    if (d) return `${g}, **${d.name.split(' ')[0]}**! 👋\n\nI'm **AURA.AI** — your intelligence layer inside ELIXOR. Live status:\n\n⚡ Productivity **${dashboard.scores?.productivity || 0}/100** · 🔥 Streak **${d.streak} days** · ✅ **${dashboard.tasks?.done || 0}/${dashboard.tasks?.total || 0}** tasks done\n\nWhat would you like to explore?`;
    return `Hey! I'm **AURA.AI** — your AI study mentor, productivity strategist & wellness coach. I have live access to your ELIXOR data. Ask me anything!`;
  };

  useEffect(() => {
    aiApi.history(30)
      .then(({ data }) => {
        const msgs = (data.data || []).filter(m => m.role !== 'system');
        setMessages(msgs.length > 0
          ? msgs.map(m => ({ role: m.role, content: m.content, id: m._id }))
          : [{ role: 'assistant', id: 'init', content: buildGreeting() }]
        );
        scroll();
      })
      .catch(() => setMessages([{ role: 'assistant', id: 'init', content: buildGreeting() }]))
      .finally(() => setHL(false));
  }, []);

  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput('');
    const uid = Date.now();
    setMessages(m => [...m, { role: 'user', content: text, id: uid }]);
    setLoading(true);
    const botId = uid + 1;
    setMessages(m => [...m, { role: 'assistant', content: '', id: botId, streaming: true }]);
    scroll();
    try {
      const res = await aiApi.stream(text, token);
      if (!res.ok) throw new Error('Stream failed');
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.delta) { full += j.delta; setMessages(m => m.map(x => x.id===botId ? { ...x, content:full } : x)); scroll(); }
            if (j.done)  setMessages(m => m.map(x => x.id===botId ? { ...x, streaming:false } : x));
            if (j.error) setMessages(m => m.map(x => x.id===botId ? { ...x, content:`⚠ ${j.error}`, streaming:false } : x));
          } catch {}
        }
      }
    } catch {
      try {
        const { data } = await aiApi.chat(text);
        setMessages(m => m.map(x => x.id===botId ? { ...x, content:data.data.reply, streaming:false } : x));
        scroll();
      } catch {
        setMessages(m => m.map(x => x.id===botId ? { ...x, content:'⚠ AURA.AI temporarily unavailable. Ensure backend is running.', streaming:false } : x));
      }
    } finally { setLoading(false); }
  };

  const clearHistory = async () => {
    await aiApi.clear();
    setMessages([{ role: 'assistant', id: 'cleared', content: buildGreeting() }]);
  };

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
      className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5 h-[calc(100vh-120px)]">

      {/* Chat panel */}
      <div className="card card-ion flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[rgba(14,165,233,0.06)] flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.04),rgba(124,58,237,0.04))' }}>
          <AuraLogo size={42}/>
          <div className="flex-1">
            <div className="font-display font-bold text-base">AURA.AI</div>
            <div className="font-mono text-[10px] flex items-center gap-2">
              <span className="text-[#10b981]">● Online</span>
              <span className="text-[rgba(186,230,253,0.25)]">·</span>
              <span className="text-[rgba(186,230,253,0.4)]">Groq · Llama 3.3 70B · Free</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 rounded-lg bg-[rgba(14,165,233,0.08)] border border-[rgba(14,165,233,0.15)] font-mono text-[9px] text-[#0ea5e9]">
              Live Data
            </div>
            <button onClick={clearHistory} title="Clear history"
              className="p-2 text-[rgba(186,230,253,0.3)] hover:text-[#f43f5e] transition-colors rounded-lg hover:bg-[rgba(244,63,94,0.06)]">
              <Trash2 size={14}/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {histLoading && <div className="space-y-3">{[1,2].map(i=><div key={i} className="skeleton h-14"/>)}</div>}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role==='user'
                    ? 'self-end max-w-[82%] bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.2)]'
                    : 'self-start max-w-[90%] bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.1)]'
                }`}>
                {msg.streaming && !msg.content ? <TypingDots/> : <span dangerouslySetInnerHTML={{ __html: formatMd(msg.content) }}/>}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Quick chips */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.slice(0, 4).map(p => (
              <button key={p.label} onClick={() => sendMessage(p.q)}
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full border border-[rgba(14,165,233,0.15)] text-[rgba(186,230,253,0.5)] hover:text-[#0ea5e9] hover:border-[rgba(14,165,233,0.3)] transition-all whitespace-nowrap">
                <p.icon size={10}/> {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-3 px-5 py-3.5 border-t border-[rgba(14,165,233,0.06)] bg-[rgba(1,2,3,0.4)] flex-shrink-0">
          <input
            className="input-field flex-1 py-2.5 text-sm"
            placeholder="Ask AURA.AI — study plans, finance advice, habit analysis…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
          />
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
            onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] disabled:opacity-40 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            <Send size={15} className="text-white"/>
          </motion.button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4 overflow-y-auto">
        {/* Quick prompts */}
        <div className="card p-5" style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.05),rgba(14,165,233,0.05))', borderColor:'rgba(124,58,237,0.15)' }}>
          <div className="font-mono text-[10px] text-[rgba(124,58,237,0.6)] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles size={10}/> AURA.AI Prompts
          </div>
          <div className="space-y-1.5">
            {QUICK_PROMPTS.map(p => (
              <button key={p.label} onClick={() => sendMessage(p.q)}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.05] hover:border-[rgba(124,58,237,0.25)] hover:bg-[rgba(124,58,237,0.06)] transition-all group">
                <p.icon size={12} className="text-[#a78bfa] flex-shrink-0 group-hover:scale-110 transition-transform"/>
                <span className="font-mono text-[11px] text-[rgba(186,230,253,0.55)] group-hover:text-[rgba(186,230,253,0.8)] transition-colors">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live stats */}
        <div className="card card-bio p-5">
          <div className="font-mono text-[10px] text-[rgba(16,185,129,0.6)] uppercase tracking-widest mb-3">Live Dashboard</div>
          {[
            { l:'Productivity', v:`${dashboard?.scores?.productivity || '—'}/100`,  c:'text-[#0ea5e9]' },
            { l:'Habit Score',  v:`${dashboard?.scores?.habit || '—'}%`,             c:'text-[#a78bfa]' },
            { l:'Savings',      v:dashboard?.finance?.savingsRate ? `${dashboard.finance.savingsRate}%` : '—', c:'text-[#10b981]' },
            { l:'Total XP',     v:(dashboard?.user?.xp||0).toLocaleString('en-IN'),  c:'text-[#f59e0b]' },
            { l:'Streak',       v:`${dashboard?.user?.streak || 0}d`,                c:'text-[#f97316]' },
          ].map(s => (
            <div key={s.l} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0 text-xs">
              <span className="text-[rgba(186,230,253,0.45)]">{s.l}</span>
              <span className={`font-mono font-semibold ${s.c}`}>{s.v}</span>
            </div>
          ))}
        </div>

        {/* Capabilities */}
        <div className="card p-5">
          <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-3">AURA.AI Capabilities</div>
          {['📊 Live data analysis','📚 Personalized study plans','💰 Financial intelligence','🧘 Wellness coaching','🎯 Priority recommendations','⬡ Generate visual diagrams','🔬 Research assistant'].map(c=>(
            <div key={c} className="font-mono text-[10px] text-[rgba(186,230,253,0.45)] py-1.5 border-b border-white/[0.03] last:border-0">{c}</div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
