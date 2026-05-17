import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Zap } from 'lucide-react';
import { aiApi } from '../services/api.js';
import { useAuthStore } from '../store/authStore.js';
import { useAppStore }  from '../store/appStore.js';

const QUICK = [
  'How is my productivity trending?',
  'Where am I overspending?',
  'What habits should I add?',
  'Analyze my week',
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1">
      {[0,1,2].map(i => <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />)}
    </div>
  );
}

export default function AiPage() {
  const { token }     = useAuthStore();
  const { dashboard } = useAppStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [histLoading, setHL]    = useState(true);
  const chatRef = useRef(null);

  const scroll = () => setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);

  // Load history
  useEffect(() => {
    aiApi.history(30)
      .then(({ data }) => {
        const msgs = (data.data || []).filter(m => m.role !== 'system');
        setMessages(msgs.map(m => ({ role: m.role, content: m.content, id: m._id })));
        scroll();
      })
      .catch(() => {
        // Fresh start — show greeting
        const d = dashboard?.user;
        setMessages([{
          role:'assistant', id:'init',
          content: d
            ? `Hey **${d.name}** 👋 I'm Elixor AI — your personal intelligence layer. Productivity **${dashboard.scores?.productivity}/100**, Streak **${d.streak} days**. Ask me anything!`
            : `Hey! I'm Elixor AI — your personal intelligence layer. Ask me about your habits, productivity, finances, or goals.`,
        }]);
      })
      .finally(() => setHL(false));
  }, []);

  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text, id: Date.now() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    const botId = Date.now() + 1;
    setMessages(m => [...m, { role: 'assistant', content: '', id: botId, streaming: true }]);
    scroll();

    try {
      const res = await aiApi.stream(text, token);
      if (!res.ok) throw new Error('Stream failed');

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.delta) {
              full += json.delta;
              setMessages(m => m.map(msg => msg.id === botId ? { ...msg, content: full } : msg));
              scroll();
            }
            if (json.done) {
              setMessages(m => m.map(msg => msg.id === botId ? { ...msg, streaming: false } : msg));
            }
          } catch { /* skip bad lines */ }
        }
      }
    } catch {
      // Fallback to non-streaming
      try {
        const { data } = await aiApi.chat(text);
        setMessages(m => m.map(msg => msg.id === botId ? { ...msg, content: data.data.reply, streaming: false } : msg));
        scroll();
      } catch (err) {
        setMessages(m => m.map(msg => msg.id === botId ? { ...msg, content: `Error: ${err.message}. Make sure the backend is running.`, streaming: false } : msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    await aiApi.clear();
    setMessages([]);
  };

  const formatMd = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4 }}
      className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5 h-[calc(100vh-120px)]">

      {/* Chat */}
      <div className="card card-ion flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-[rgba(14,165,233,0.06)]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] flex items-center justify-center shadow-[0_0_16px_rgba(14,165,233,0.4)]">
            <Zap size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">Elixor AI</div>
            <div className="font-mono text-[10px] text-[#10b981]">● Online · GPT-4o via Node backend</div>
          </div>
          <button onClick={clearHistory} className="p-2 text-[rgba(186,230,253,0.3)] hover:text-[#f43f5e] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {histLoading && <div className="space-y-2">{[1,2].map(i=><div key={i} className="skeleton h-12"/>)}</div>}
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div key={msg.id}
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                className={msg.role==='user' ? 'ai-bubble-user' : 'ai-bubble-bot'}>
                {msg.streaming && !msg.content ? (
                  <TypingDots />
                ) : (
                  <span dangerouslySetInnerHTML={{ __html: formatMd(msg.content) }} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="flex gap-3 p-4 border-t border-[rgba(14,165,233,0.06)] bg-[rgba(1,2,3,0.3)]">
          <input
            className="input-field flex-1 py-2.5 text-sm"
            placeholder="Ask about your performance, finances, habits…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={loading}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] hover:scale-105 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(14,165,233,0.3)]">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4 overflow-hidden">
        <div className="card card-plasma p-5">
          <div className="label mb-3">Quick Prompts</div>
          <div className="space-y-2">
            {QUICK.map(q => (
              <button key={q} onClick={() => sendMessage(q)}
                className="w-full text-left btn-ghost btn-sm text-xs py-2 px-3">
                {q}
              </button>
            ))}
          </div>
        </div>
        <div className="card card-bio p-5">
          <div className="label mb-3">AI Activity</div>
          <div className="space-y-0">
            {[
              { l:'Productivity', v:`${dashboard?.scores?.productivity || '—'}/100`, c:'text-[#0ea5e9]' },
              { l:'Habit Score',  v:`${dashboard?.scores?.habit || '—'}/100`,        c:'text-[#a78bfa]' },
              { l:'Savings Rate', v:dashboard?.finance?.savingsRate || '—',          c:'text-[#10b981]' },
              { l:'Total XP',     v:dashboard?.user?.xp?.toLocaleString('en-IN') || '—', c:'text-[#f59e0b]' },
            ].map(s => (
              <div key={s.l} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0 text-xs">
                <span className="text-[rgba(186,230,253,0.45)]">{s.l}</span>
                <span className={`font-mono font-semibold ${s.c}`}>{s.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
