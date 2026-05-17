import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Send, X, Minimize2 } from 'lucide-react';
import { aiApi } from '../../services/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useAppStore }  from '../../store/appStore.js';

const QUICK = [
  'What should I focus on?',
  'How is my streak?',
  'Quick productivity tip',
];

function TypingDots() {
  return (
    <div className="flex gap-1 items-center py-1 px-1">
      {[0,1,2].map(i => (
        <div key={i} className="typing-dot" style={{ animationDelay: `${i*0.2}s` }} />
      ))}
    </div>
  );
}

export default function FloatingAI() {
  const { token }     = useAuthStore();
  const { dashboard } = useAppStore();
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pulse, setPulse]       = useState(true);
  const chatRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    if (open && messages.length === 0) {
      const hour = new Date().getHours();
      const timeGreet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const d = dashboard?.user;
      setMessages([{
        role: 'assistant', id: 'init',
        content: d
          ? `${timeGreet}, ${d.name.split(' ')[0]}! 👋 Productivity at **${dashboard.scores?.productivity || 0}/100** · Streak **${d.streak}d** · ${dashboard.tasks?.done || 0}/${dashboard.tasks?.total || 0} tasks done. How can I help?`
          : `${timeGreet}! I'm **AURA.AI** ⚡ Your AI layer inside ELIXOR. Ask me anything!`,
      }]);
    }
    setPulse(false);
  }, [open]);

  const scroll = () => {
    setTimeout(() => chatRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50);
  };

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
          } catch { /* skip */ }
        }
      }
    } catch {
      try {
        const { data } = await aiApi.chat(text);
        setMessages(m => m.map(msg => msg.id === botId ? { ...msg, content: data.data.reply, streaming: false } : msg));
        scroll();
      } catch (err) {
        setMessages(m => m.map(msg => msg.id === botId ? {
          ...msg,
          content: 'Ensure the backend is running to use AI features.',
          streaming: false,
        } : msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const fmt = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-80 card card-ion flex flex-col shadow-2xl"
            style={{ height: 420 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(14,165,233,0.08)] flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] flex items-center justify-center">
                <Zap size={13} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold">AURA.AI</div>
                <div className="font-mono text-[9px] text-[#10b981]">● Online</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-[rgba(186,230,253,0.3)] hover:text-[rgba(186,230,253,0.8)] transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {messages.map(msg => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={`text-xs leading-relaxed rounded-xl px-3 py-2 max-w-[90%] ${
                      msg.role === 'user'
                        ? 'self-end bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.2)]'
                        : 'self-start bg-[rgba(14,165,233,0.07)] border border-[rgba(14,165,233,0.12)]'
                    }`}>
                    {msg.streaming && !msg.content
                      ? <TypingDots />
                      : <span dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                    }
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                {QUICK.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="text-[9px] px-2 py-1 rounded-full border border-[rgba(14,165,233,0.15)] text-[rgba(186,230,253,0.5)] hover:text-[#0ea5e9] hover:border-[rgba(14,165,233,0.3)] transition-colors whitespace-nowrap">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-[rgba(14,165,233,0.06)] flex-shrink-0">
              <input
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(14,165,233,0.1)] rounded-lg px-3 py-2 text-xs text-[#f0f9ff] outline-none focus:border-[rgba(14,165,233,0.3)] placeholder-[rgba(186,230,253,0.2)]"
                placeholder="Ask anything…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={loading}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] hover:scale-105 transition-transform disabled:opacity-40 flex-shrink-0">
                <Send size={12} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl"
        style={{ background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)', boxShadow: '0 0 24px rgba(14,165,233,0.4), 0 8px 32px rgba(0,0,0,0.5)' }}
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <Minimize2 size={20} className="text-white" />
              </motion.div>
            : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Zap size={20} className="text-white" />
              </motion.div>
          }
        </AnimatePresence>
        {/* Pulse ring */}
        {pulse && (
          <span className="absolute inset-0 rounded-2xl border-2 border-[#0ea5e9] animate-ping opacity-30" />
        )}
        {!open && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#10b981] border-2 border-[#010203]" />
        )}
      </motion.button>
    </div>
  );
}
