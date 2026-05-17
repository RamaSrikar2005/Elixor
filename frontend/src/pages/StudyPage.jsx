/**
 * StudyPage — Next-generation AI study OS.
 * Tabs: Overview · Session · AI Scholar · Notes · Analytics · Exam Mode
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, BarChart2, Plus, Play, Pause, Square,
  Send, X, Edit2, Trash2, Calendar, FileText,
  Lightbulb, Check, Shield, Zap,
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area,
} from 'recharts';
import { studyApi, aiApi } from '../services/api.js';
import { useAuthStore }    from '../store/authStore.js';
import MermaidRenderer, { parseMermaidBlocks } from '../components/ui/MermaidRenderer.jsx';
import ExamLockdown from '../components/ui/ExamLockdown.jsx';

/* ─── config ─────────────────────────────────────────────────── */
const TABS    = ['Overview', 'Session', 'AI Scholar', 'Notes', 'Analytics', 'Practice', 'Exam Mode'];
const TAB_ICONS = [Lightbulb, Play, Brain, FileText, BarChart2, Zap, Shield];
const TYPES   = [
  { id: 'study',     label: 'Study',     emoji: '📖', color: '#0ea5e9' },
  { id: 'revision',  label: 'Revision',  emoji: '🔄', color: '#10b981' },
  { id: 'practice',  label: 'Practice',  emoji: '✏️', color: '#a78bfa' },
  { id: 'mock_test', label: 'Mock Test', emoji: '📝', color: '#f59e0b' },
];
const DIFF    = ['easy','medium','hard'];
const CATS    = ['JEE','NEET','GATE','UPSC','CAT','GRE','IELTS','Board','Entrance','General'];
const EMOJIS  = ['📚','🔬','🧪','📐','📏','🧮','💡','🌍','📝','⚗️','🏛️','💊','⚙️','🖥️','🎓','📊'];
const COLORS  = ['#0ea5e9','#10b981','#f59e0b','#7c3aed','#f43f5e','#06e5d4','#a78bfa','#fb923c'];
const fmt     = (m) => m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`;
const tt      = { contentStyle:{background:'rgba(4,8,15,0.95)',border:'1px solid rgba(14,165,233,0.2)',borderRadius:8,padding:'8px 12px'}, itemStyle:{fontFamily:'JetBrains Mono',fontSize:11} };

/* ─── Motivational messages by score ────────────────────────── */
function getBoost(score) {
  if (score >= 90) return { emoji:'🏆', msg:'Exceptional mastery! You\'re in the top tier. Keep this momentum.', color:'#f59e0b' };
  if (score >= 75) return { emoji:'🔥', msg:'Strong performance. One more push session today will solidify this.', color:'#f97316' };
  if (score >= 60) return { emoji:'⚡', msg:'Good progress! Focus on your weakest subject for 45 mins to break through.', color:'#0ea5e9' };
  if (score >= 40) return { emoji:'🌱', msg:'You\'re building the foundation. Consistency beats intensity every time.', color:'#10b981' };
  return { emoji:'🎯', msg:'Every expert was once a beginner. Start with 20 minutes — just start.', color:'#a78bfa' };
}

/* ─── Mastery Ring ───────────────────────────────────────────── */
function MasteryRing({ value = 0, color = '#0ea5e9', size = 48 }) {
  const r = size * 0.42, circ = 2 * Math.PI * r, pct = Math.min(value / 100, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size*0.09} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.09}
        strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
}

/* ─── Subject Card ───────────────────────────────────────────── */
function SubjectCard({ s, selected, onSelect, onEdit, onDelete }) {
  const days    = s.examDate ? Math.ceil((new Date(s.examDate)-new Date())/86400000) : null;
  const urgent  = days != null && days < 14;
  const pct     = Math.min((s.studiedHours||0)/(s.targetHours||1)*100, 100);
  const mastery = s.mastery || 0;
  return (
    <motion.div layout whileHover={{ y: -2 }} onClick={() => onSelect(s._id)}
      className={`relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden ${
        selected===s._id
          ? 'border-[rgba(14,165,233,0.5)] shadow-[0_0_20px_rgba(14,165,233,0.1)]'
          : 'border-white/[0.06] hover:border-white/[0.15]'
      }`}
      style={{ background: selected===s._id ? `${s.color}08` : 'rgba(8,14,26,0.6)' }}>
      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: s.color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <MasteryRing value={mastery} color={s.color} size={44} />
            <div className="absolute inset-0 flex items-center justify-center text-base"
              style={{ transform: 'rotate(90deg) translateX(-2px)' }}>
              {s.emoji}
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm text-[#bae6fd] leading-tight">{s.name}</div>
            <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] mt-0.5 flex items-center gap-1">
              <span>{s.category}</span>
              {s.priority === 'critical' && <span className="text-[#f43f5e]">· CRITICAL</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e=>{e.stopPropagation();onEdit(s);}} className="p-1 text-[rgba(186,230,253,0.25)] hover:text-[#0ea5e9] transition-colors"><Edit2 size={10}/></button>
          <button onClick={e=>{e.stopPropagation();onDelete(s._id);}} className="p-1 text-[rgba(244,63,94,0.3)] hover:text-[#f43f5e] transition-colors"><Trash2 size={10}/></button>
        </div>
      </div>
      {/* Progress */}
      <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
        <span className="text-[rgba(186,230,253,0.4)]">{(s.studiedHours||0).toFixed(1)}h / {s.targetHours}h</span>
        <span style={{ color: s.color }}>{mastery}% mastery</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: s.color }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
      </div>
      {days != null && (
        <div className={`mt-2 flex items-center gap-1 font-mono text-[9px] ${urgent ? 'text-[#f43f5e]' : 'text-[rgba(186,230,253,0.3)]'}`}>
          <Calendar size={9} />
          {days <= 0 ? 'Exam today!' : days === 1 ? 'Exam tomorrow!' : `${days}d to exam`}
          {urgent && <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}>⚠</motion.span>}
        </div>
      )}
    </motion.div>
  );
}

/* ─── Live Session Timer ─────────────────────────────────────── */
function LiveSession({ subjects, onComplete }) {
  const [sel,      setSel]     = useState('');
  const [type,     setType]    = useState('study');
  const [diff,     setDiff]    = useState('medium');
  const [running,  setRun]     = useState(false);
  const [secs,     setSecs]    = useState(0);
  const [sessId,   setSessId]  = useState(null);
  const [score,    setScore]   = useState('');
  const [ending,   setEnding]  = useState(false);
  const [xpFlash,  setXpFlash] = useState('');
  const ref = useRef(null);
  const typeObj = TYPES.find(t=>t.id===type)||TYPES[0];
  const mm = String(Math.floor(secs/60)).padStart(2,'0');
  const ss = String(secs%60).padStart(2,'0');

  // Timer — only depends on `running`, not `secs`, to avoid creating a new
  // interval every tick (which caused the session to never advance properly).
  useEffect(() => {
    if (!running) { clearInterval(ref.current); document.title = 'Elixor OS'; return; }
    ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  // Separate effect: update tab title while running
  useEffect(() => {
    if (running) document.title = `${mm}:${ss} · ${typeObj.label}`;
  }, [running, mm, ss, typeObj.label]);

  const start = async () => {
    if (!sel) return;
    try { const {data} = await studyApi.startSession({subjectId:sel, type, difficulty:diff}); setSessId(data.data._id); }
    catch {}
    setSecs(0); setRun(true);
  };

  const end = async () => {
    clearInterval(ref.current); setRun(false); setEnding(false);
    if (sessId) {
      try {
        const {data} = await studyApi.endSession(sessId, { score: type==='mock_test' && score ? parseInt(score) : undefined });
        const xp = data.data?.xpAwarded||0;
        if (xp) { setXpFlash(`+${xp} XP 🎯`); setTimeout(()=>setXpFlash(''),3000); }
        onComplete?.();
      } catch {}
    }
    setSecs(0); setSessId(null); setScore('');
  };

  const subj = subjects.find(s=>s._id===sel);

  if (running) return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Subject pill */}
      {subj && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor:subj.color+'40', background:subj.color+'10', color:subj.color }}>
          <span>{subj.emoji}</span><span className="font-semibold text-sm">{subj.name}</span>
          <span className="font-mono text-[10px] opacity-60">· {typeObj.label}</span>
        </div>
      )}
      {/* Timer ring */}
      <div className="relative">
        <svg width="240" height="240" viewBox="0 0 240 240" style={{ transform:'rotate(-90deg)' }}>
          <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
          <motion.circle cx="120" cy="120" r="104" fill="none" stroke={typeObj.color}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2*Math.PI*104}
            strokeDashoffset={2*Math.PI*104 - (secs%3600)/3600*2*Math.PI*104}
            style={{ filter:`drop-shadow(0 0 16px ${typeObj.color}80)`, transition:'stroke-dashoffset 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display font-bold text-[56px] tracking-tight leading-none">{mm}:{ss}</div>
          <div className="font-mono text-xs mt-1" style={{ color:typeObj.color }}>{typeObj.emoji} {typeObj.label}</div>
          <AnimatePresence>
            {xpFlash && <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
              className="font-display font-bold text-[#f59e0b] text-xl mt-2">{xpFlash}</motion.div>}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={()=>setRun(r=>!r)} className="btn-ghost px-6 py-3 flex items-center gap-2">
          {running?<Pause size={15}/>:<Play size={15}/>} {running?'Pause':'Resume'}
        </button>
        <button onClick={()=>setEnding(true)} className="btn-ghost px-4 py-3 text-[#f43f5e] border-[rgba(244,63,94,0.2)]">
          <Square size={14}/>
        </button>
      </div>
      <AnimatePresence>
        {ending && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="card p-5 w-full max-w-sm space-y-3">
            <div className="font-semibold text-center">End session? ({mm}:{ss} logged)</div>
            {type==='mock_test' && (
              <input className="input-field py-2 text-sm" type="number" min="0" max="100"
                placeholder="Your score (0-100)" value={score} onChange={e=>setScore(e.target.value)}/>
            )}
            <div className="flex gap-2">
              <button onClick={end} className="btn-primary flex-1 justify-center">✓ Confirm</button>
              <button onClick={()=>setEnding(false)} className="btn-ghost">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="label mb-3">Choose Subject</div>
        <div className="grid grid-cols-2 gap-2">
          {subjects.map(s => (
            <button key={s._id} onClick={()=>setSel(s._id)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                sel===s._id ? 'border-[rgba(14,165,233,0.5)] bg-[rgba(14,165,233,0.08)]' : 'border-white/[0.06] hover:border-white/[0.15]'
              }`}>
              <span className="text-xl">{s.emoji}</span>
              <div><div className="text-xs font-semibold text-[rgba(186,230,253,0.7)] truncate">{s.name}</div>
                <div className="font-mono text-[9px]" style={{ color:s.color }}>{s.mastery||0}% mastery</div>
              </div>
            </button>
          ))}
          {!subjects.length && <div className="col-span-2 text-center font-mono text-xs text-[rgba(186,230,253,0.2)] py-6">Add a subject first</div>}
        </div>
      </div>
      <div>
        <div className="label mb-3">Session Type</div>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map(t => (
            <button key={t.id} onClick={()=>setType(t.id)}
              className="flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all"
              style={{ borderColor:type===t.id?t.color+'60':'rgba(255,255,255,0.06)', background:type===t.id?t.color+'12':'transparent', color:type===t.id?t.color:'rgba(186,230,253,0.5)' }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        {DIFF.map(d => (
          <button key={d} onClick={()=>setDiff(d)} className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize border transition-all"
            style={{ borderColor:diff===d?'rgba(14,165,233,0.4)':'rgba(255,255,255,0.06)', color:diff===d?'#0ea5e9':'rgba(186,230,253,0.4)', background:diff===d?'rgba(14,165,233,0.08)':'transparent' }}>
            {d==='easy'?'🟢':d==='medium'?'🟡':'🔴'} {d}
          </button>
        ))}
      </div>
      <button onClick={start} disabled={!sel} className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-40">
        <Play size={16}/> Start Session
      </button>
    </div>
  );
}

/* ─── AI Scholar with Mermaid ────────────────────────────────── */
const SCHOLAR_SYSTEM = `You are an elite AI Study Scholar inside Elixor OS — a futuristic AI productivity platform.
You help students understand concepts, solve problems, create study materials, and prepare for competitive exams.

DIAGRAM GENERATION:
- When asked for diagrams, flowcharts, mind maps, architecture, algorithms, or visual representations,
  generate Mermaid.js syntax wrapped in \`\`\`mermaid code blocks.
- For flowcharts use: graph TD, graph LR, or flowchart TD
- For mind maps use: mindmap
- For sequences use: sequenceDiagram
- For class diagrams use: classDiagram
- Always use dark-compatible colors and keep diagrams clean and informative.

TEACHING STYLE:
- Use clear, simple language
- Give examples
- Use **bold** for key terms
- Keep answers focused and actionable
- If generating code, wrap in code blocks with language specified`;

function AIScholar({ subjects }) {
  const { token }   = useAuthStore();
  const [msgs, setMsgs]       = useState([{
    role:'assistant', id:'init',
    content:`Hey there! 👋 I'm your **AI Study Scholar**, powered by Groq's fastest AI. I can:\n\n• Explain any concept clearly\n• Generate **flowcharts & diagrams** automatically\n• Create quizzes and flashcards\n• Summarize topics\n• Help with competitive exam prep\n\nWhat would you like to learn today?`,
  }]);
  const [input,  setInput]    = useState('');
  const [loading,setLoading]  = useState(false);
  const chatRef = useRef(null);
  const scroll  = () => setTimeout(() => chatRef.current?.scrollTo({ top:99999, behavior:'smooth' }), 50);

  const QUICK = [
    'Draw a flowchart of Binary Search algorithm',
    'Create a mind map for Photosynthesis',
    'Explain Newton\'s Laws with examples',
    'Generate 5 MCQs on Thermodynamics',
    'Draw a sequence diagram for HTTP request',
    'Summarize Organic Chemistry basics',
  ];

  const send = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput('');
    const uid = Date.now();
    setMsgs(m => [...m, { role:'user', content:text, id:uid }]);
    setLoading(true);
    const botId = uid+1;
    setMsgs(m => [...m, { role:'assistant', content:'', id:botId, streaming:true }]);
    scroll();
    const context = subjects.length
      ? `[Student's subjects: ${subjects.map(s=>s.name).join(', ')}. Category: ${subjects[0]?.category||'General'}]\n\n`
      : '';
    const fullMsg = `${SCHOLAR_SYSTEM}\n\n${context}${text}`;
    try {
      const res = await aiApi.stream(fullMsg, token);
      if (!res.ok) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value,{stream:true}).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const j = JSON.parse(line.slice(6));
            if (j.delta) { full+=j.delta; setMsgs(m=>m.map(x=>x.id===botId?{...x,content:full}:x)); scroll(); }
            if (j.done)  setMsgs(m=>m.map(x=>x.id===botId?{...x,streaming:false}:x));
          } catch {}
        }
      }
    } catch {
      setMsgs(m=>m.map(x=>x.id===botId?{...x,content:'⚠ AI unavailable. Check that the backend is running.',streaming:false}:x));
    } finally { setLoading(false); }
  };

  const renderContent = (text, streaming) => {
    if (streaming && !text) return (
      <div className="flex gap-1 py-1">{[0,1,2].map(i=><div key={i} className="typing-dot" style={{animationDelay:`${i*0.2}s`}}/>)}</div>
    );
    const parts = parseMermaidBlocks(text);
    return parts.map((p, i) => {
      if (p.type === 'mermaid') return <MermaidRenderer key={i} code={p.content} title={p.title} />;
      const html = p.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(14,165,233,0.1);padding:1px 5px;border-radius:4px;font-family:JetBrains Mono;font-size:11px">$1</code>')
        .replace(/\n/g, '<br>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
    });
  };

  return (
    <div className="flex flex-col" style={{ height: 520 }}>
      {/* Chat messages */}
      <div ref={chatRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 pb-2">
        <AnimatePresence initial={false}>
          {msgs.map(m => (
            <motion.div key={m.id} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role==='user'
                  ? 'self-end bg-[rgba(124,58,237,0.12)] border border-[rgba(124,58,237,0.2)]'
                  : 'self-start bg-[rgba(14,165,233,0.06)] border border-[rgba(14,165,233,0.1)]'
              }`}>
              {renderContent(m.content, m.streaming)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick prompt chips */}
      {msgs.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 py-2 border-t border-white/[0.04]">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-[rgba(14,165,233,0.15)] text-[rgba(186,230,253,0.5)] hover:text-[#0ea5e9] hover:border-[rgba(14,165,233,0.3)] transition-all whitespace-nowrap">
              {q.length > 35 ? q.slice(0,35)+'…' : q}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 pt-3 border-t border-white/[0.04] mt-auto">
        <input
          className="input-field flex-1 py-2.5 text-sm"
          placeholder="Ask anything — or say 'draw a flowchart of…'"
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
          disabled={loading}
        />
        <button onClick={()=>send()} disabled={loading||!input.trim()}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] hover:scale-105 transition-transform disabled:opacity-40 flex-shrink-0">
          <Send size={14} className="text-white"/>
        </button>
      </div>
    </div>
  );
}

/* ─── Smart Notes ────────────────────────────────────────────── */
function SmartNotes({ subjects }) {
  const { token } = useAuthStore();
  const STORAGE   = 'elixor_study_notes';
  const load      = () => { try { return JSON.parse(localStorage.getItem(STORAGE)||'[]'); } catch { return []; } };
  const save      = (n) => localStorage.setItem(STORAGE, JSON.stringify(n));

  const [notes,    setNotes]    = useState(load);
  const [sel,      setSel]      = useState(null);
  const [adding,   setAdding]   = useState(false);
  const [form,     setForm]     = useState({ title:'', content:'', subject:'General', tags:'' });
  const [aiLoading,setAiLoad]   = useState(false);
  const [aiResult, setAiResult] = useState('');

  const saveNote = () => {
    if (!form.title||!form.content) return;
    const updated = sel!=null
      ? notes.map((n,i) => i===sel ? {...form, id:n.id, updatedAt:Date.now()} : n)
      : [...notes, { ...form, id:Date.now(), createdAt:Date.now() }];
    setNotes(updated); save(updated);
    setAdding(false); setSel(null); setForm({ title:'', content:'', subject:'General', tags:'' });
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n=>n.id!==id);
    setNotes(updated); save(updated); setSel(null);
  };

  const aiSummarize = async (note) => {
    setAiLoad(true); setAiResult('');
    try {
      const res = await aiApi.stream(`Summarize these study notes into key bullet points, then list 3 flashcard Q&A pairs:\n\n${note.content}`, token);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value,{stream:true}).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const j=JSON.parse(line.slice(6)); if(j.delta){full+=j.delta;setAiResult(full);} } catch {}
        }
      }
    } catch { setAiResult('AI unavailable.'); }
    setAiLoad(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-4">
      {/* Notes list */}
      <div className="space-y-2">
        <button onClick={()=>{setAdding(true);setSel(null);setForm({title:'',content:'',subject:'General',tags:''});setAiResult('');}}
          className="btn-primary btn-sm w-full justify-center flex items-center gap-2">
          <Plus size={13}/> New Note
        </button>
        {notes.length === 0 && (
          <div className="text-center py-8 font-mono text-[10px] text-[rgba(186,230,253,0.2)]">No notes yet</div>
        )}
        {notes.map((n,i) => (
          <button key={n.id} onClick={()=>{setSel(i);setAdding(false);setForm(n);setAiResult('');}}
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              sel===i ? 'border-[rgba(14,165,233,0.35)] bg-[rgba(14,165,233,0.06)]' : 'border-white/[0.05] hover:border-white/[0.1]'
            }`}>
            <div className="font-semibold text-xs text-[rgba(186,230,253,0.7)] truncate">{n.title}</div>
            <div className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] mt-0.5">{n.subject}</div>
          </button>
        ))}
      </div>

      {/* Editor / Viewer */}
      <div className="card p-5">
        {(adding || sel!=null) ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field py-2 text-sm col-span-2" placeholder="Note title…"
                value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
              <select className="input-field py-2 text-sm" value={form.subject}
                onChange={e=>setForm(f=>({...f,subject:e.target.value}))}>
                <option value="General">General</option>
                {subjects.map(s=><option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
              <input className="input-field py-2 text-sm" placeholder="Tags (comma separated)"
                value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
            </div>
            <textarea className="input-field text-sm resize-none" rows={8}
              placeholder="Write your notes here… paste, type, or dictate."
              value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} />
            <div className="flex gap-2">
              <button onClick={saveNote} className="btn-primary btn-sm flex items-center gap-1.5">
                <Check size={12}/> Save
              </button>
              {sel!=null && (
                <>
                  <button onClick={()=>aiSummarize(form)} disabled={aiLoading}
                    className="btn-ghost btn-sm flex items-center gap-1.5 text-[#a78bfa]">
                    <Brain size={12}/> {aiLoading?'Summarizing…':'AI Summarize'}
                  </button>
                  <button onClick={()=>deleteNote(notes[sel].id)}
                    className="btn-ghost btn-sm text-[#f43f5e] ml-auto">
                    <Trash2 size={12}/>
                  </button>
                </>
              )}
              <button onClick={()=>{setAdding(false);setSel(null);setAiResult('');}} className="btn-ghost btn-sm">
                Cancel
              </button>
            </div>
            {aiResult && (
              <div className="mt-3 p-4 rounded-xl border border-[rgba(167,139,250,0.2)] bg-[rgba(124,58,237,0.05)]">
                <div className="font-mono text-[10px] text-[#a78bfa] mb-2 uppercase tracking-widest">AI Summary</div>
                <div className="text-xs text-[rgba(186,230,253,0.7)] leading-relaxed whitespace-pre-wrap">{aiResult}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-[rgba(186,230,253,0.2)] font-mono text-xs">
            Select a note or create one
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Analytics Tab ──────────────────────────────────────────── */
function StudyAnalytics({ stats, subjects }) {
  if (!stats) return <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-16"/>)}</div>;
  const radarData = subjects.map(s => ({ subject:s.name.slice(0,8), A:s.mastery||0 }));
  const bar = stats.subjects?.map(s=>({ name:s._id?.slice(0,8)||'?', min:s.totalMin||0 })) || [];
  const trend = stats.dailyTrend?.map(d=>({ name:d._id?.slice(5), min:d.totalMin||0 })) || [];
  const examReadiness = subjects.length > 0
    ? Math.round(subjects.reduce((acc,s) => {
        const base = s.mastery||0;
        const timeScore = Math.min(((s.studiedHours||0)/(s.targetHours||1))*100, 100);
        const days = s.examDate ? Math.max(0, Math.ceil((new Date(s.examDate)-new Date())/86400000)) : 30;
        const urgency = Math.min(100, 100 - days * 1.5);
        return acc + (base*0.5 + timeScore*0.3 + urgency*0.2);
      }, 0) / subjects.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Today",   v:fmt(stats.today?.minutes||0), c:'text-[#0ea5e9]', i:'⏱️' },
          { label:"Week",    v:fmt(stats.week?.minutes||0),  c:'text-[#10b981]', i:'📅' },
          { label:"Sessions",v:stats.week?.sessions||0,       c:'text-[#a78bfa]', i:'🎯' },
          { label:"Exam Ready",v:`${Math.round(examReadiness)}%`, c:examReadiness>70?'text-[#10b981]':examReadiness>40?'text-[#f59e0b]':'text-[#f43f5e]', i:'🎓' },
        ].map(s=>(
          <div key={s.label} className="card p-4 text-center">
            <div className="text-xl mb-1.5">{s.i}</div>
            <div className={`font-display font-bold text-2xl leading-none ${s.c}`}>{s.v}</div>
            <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Exam readiness meter */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display font-bold text-sm">Exam Readiness</div>
          <div className="font-display font-bold text-2xl" style={{ color:examReadiness>70?'#10b981':examReadiness>40?'#f59e0b':'#f43f5e' }}>
            {Math.round(examReadiness)}%
          </div>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
          <motion.div className="h-full rounded-full"
            style={{ background: examReadiness>70?'#10b981':examReadiness>40?'linear-gradient(90deg,#f59e0b,#f97316)':'#f43f5e' }}
            initial={{ width:0 }} animate={{ width:`${examReadiness}%` }} transition={{ duration:1, ease:'easeOut' }} />
        </div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)]">
          {examReadiness>80?'🎯 Well prepared! Keep reviewing key topics.'
            :examReadiness>60?'📚 Good progress. Increase daily study hours.'
            :examReadiness>40?'⚡ More practice needed. Focus on weak areas.'
            :'🚨 Urgent: Significantly increase study intensity.'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {radarData.length > 0 && (
          <div className="card card-plasma p-5">
            <div className="font-display font-bold text-sm mb-3">Subject Mastery Radar</div>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(14,165,233,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill:'rgba(186,230,253,0.5)', fontFamily:'JetBrains Mono', fontSize:9 }} />
                <Radar dataKey="A" stroke="#a78bfa" fill="rgba(124,58,237,0.15)" strokeWidth={2}
                  dot={{ fill:'#a78bfa', r:2.5, strokeWidth:0 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
        {trend.length > 0 && (
          <div className="card card-bio p-5">
            <div className="font-display font-bold text-sm mb-3">Daily Study Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="sAG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{fill:'rgba(186,230,253,0.3)',fontFamily:'JetBrains Mono',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:'rgba(186,230,253,0.3)',fontFamily:'JetBrains Mono',fontSize:9}} axisLine={false} tickLine={false}/>
                <Tooltip {...tt} formatter={v=>[fmt(v),'Time']}/>
                <Area type="monotone" dataKey="min" stroke="#10b981" strokeWidth={2} fill="url(#sAG)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {bar.length > 0 && (
        <div className="card card-ion p-5">
          <div className="font-display font-bold text-sm mb-3">Study Time by Subject (this week)</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={bar}>
              <XAxis dataKey="name" tick={{fill:'rgba(186,230,253,0.3)',fontFamily:'JetBrains Mono',fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'rgba(186,230,253,0.3)',fontFamily:'JetBrains Mono',fontSize:9}} axisLine={false} tickLine={false}/>
              <Tooltip {...tt} formatter={v=>[fmt(v),'Time']}/>
              <Bar dataKey="min" fill="url(#sBG)" radius={[5,5,0,0]}/>
              <defs><linearGradient id="sBG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.9}/>
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.1}/>
              </linearGradient></defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ─── Exam Mode ──────────────────────────────────────────────── */
function ExamMode({ subjects }) {
  const [active,   setActive]  = useState(false);
  const [duration, setDur]     = useState(180);
  const [selSubj,  setSubj]    = useState('');

  const subj = subjects.find(s => s._id === selSubj);

  // Render full-screen lockdown when active
  if (active) {
    return (
      <ExamLockdown
        duration={duration}
        subject={subj || null}
        onExit={() => setActive(false)}
      />
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-5 text-center">
      <div className="font-display font-bold text-lg">Exam Mode</div>
      <div className="font-mono text-xs text-[rgba(186,230,253,0.4)]">
        Full-screen lockdown · breathing guide · celebration on completion
      </div>

      <div>
        <div className="label mb-3">Duration</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {[30,60,90,120,180,240,300].map(m=>(
            <button key={m} onClick={()=>setDur(m)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
              style={{
                borderColor: duration===m ? '#f43f5e40' : 'rgba(255,255,255,0.08)',
                background:  duration===m ? 'rgba(244,63,94,0.1)' : 'transparent',
                color:       duration===m ? '#f43f5e' : 'rgba(186,230,253,0.4)',
              }}>
              {m>=60 ? `${m/60}h` : `${m}m`}
            </button>
          ))}
        </div>
      </div>

      {subjects.length > 0 && (
        <div>
          <div className="label mb-2">Subject (optional)</div>
          <select className="input-field py-2 text-sm text-center" value={selSubj}
            onChange={e=>setSubj(e.target.value)}>
            <option value="">No subject</option>
            {subjects.map(s=><option key={s._id} value={s._id}>{s.emoji} {s.name}</option>)}
          </select>
        </div>
      )}

      <button onClick={()=>setActive(true)}
        className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-3"
        style={{ background:'linear-gradient(135deg,#f43f5e,#dc2626)', boxShadow:'0 0 30px rgba(244,63,94,0.3)' }}>
        <Shield size={18}/> Enter Exam Mode
      </button>

      <div className="font-mono text-[10px] text-[rgba(186,230,253,0.2)]">
        Breathing warmup → full-screen timer → celebration on finish
      </div>
    </div>
  );
}

/* ─── AI Practice Quiz ───────────────────────────────────────── */
function AIPractice({ subjects, onStartExam }) {
  const { token } = useAuthStore();
  const [step,     setStep]    = useState('config'); // config|loading|quiz|results
  const [cfg,      setCfg]     = useState({ subjectId:'', topic:'', difficulty:'medium', count:10 });
  const [questions,setQs]      = useState([]);
  const [answers,  setAnswers] = useState({});
  const [qIdx,     setQIdx]    = useState(0);
  const [results,  setResults] = useState(null);
  const [err,      setErr]     = useState('');

  const selSub = subjects.find(s => s._id === cfg.subjectId);

  const generate = async () => {
    setStep('loading'); setErr('');
    const subName = selSub?.name || 'General Knowledge';
    const prompt  = `Generate ${cfg.count} multiple-choice questions for "${subName}"${cfg.topic ? ` on topic "${cfg.topic}"` : ''}. Difficulty: ${cfg.difficulty}.

Return ONLY a valid JSON array, no markdown fences, no explanation:
[{"q":"Question?","opts":["A","B","C","D"],"ans":0,"exp":"Brief explanation."}]

Rules: ans is 0-based correct index. All 4 options must be distinct. Make questions educational and accurate.`;
    try {
      const res = await aiApi.stream(prompt, token);
      if (!res.ok) throw new Error();
      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const j = JSON.parse(line.slice(6)); if (j.delta) full += j.delta; } catch {}
        }
      }
      const match = full.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON array');
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed) || !parsed.length) throw new Error('Empty');
      setQs(parsed.slice(0, cfg.count)); setAnswers({}); setQIdx(0); setStep('quiz');
    } catch {
      setErr('AI quiz generation failed. Make sure the backend is running.'); setStep('config');
    }
  };

  const answer  = (i) => setAnswers(a => ({ ...a, [qIdx]: i }));
  const next    = () => {
    if (qIdx < questions.length - 1) { setQIdx(i => i + 1); }
    else {
      const score = questions.reduce((s, q, i) => s + (answers[i] === q.ans ? 1 : 0), 0);
      setResults({ score, total: questions.length, pct: Math.round((score / questions.length) * 100) });
      setStep('results');
    }
  };
  const reset = () => { setStep('config'); setQs([]); setAnswers({}); setResults(null); setQIdx(0); };

  const q        = questions[qIdx];
  const answered = qIdx in answers;

  /* Config */
  if (step === 'config') return (
    <div className="space-y-5 max-w-lg">
      <div>
        <div className="font-display font-bold text-base mb-1">AI Practice Quiz</div>
        <div className="font-mono text-xs text-[rgba(186,230,253,0.4)]">Groq generates real MCQs tailored to your subject</div>
      </div>
      {err && <div className="p-3 rounded-xl bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-[#f43f5e] text-xs font-mono">⚠ {err}</div>}
      <div>
        <div className="label mb-2">Subject</div>
        <select className="input-field py-2 text-sm" value={cfg.subjectId} onChange={e=>setCfg(c=>({...c,subjectId:e.target.value}))}>
          <option value="">General Knowledge</option>
          {subjects.map(s=><option key={s._id} value={s._id}>{s.emoji} {s.name}</option>)}
        </select>
      </div>
      <div>
        <div className="label mb-2">Topic / Chapter (optional)</div>
        <input className="input-field py-2 text-sm" placeholder="e.g. Thermodynamics, Recursion, Integration…"
          value={cfg.topic} onChange={e=>setCfg(c=>({...c,topic:e.target.value}))}/>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="label mb-2">Difficulty</div>
          <div className="flex gap-1.5">
            {['easy','medium','hard'].map(d=>(
              <button key={d} onClick={()=>setCfg(c=>({...c,difficulty:d}))}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize border transition-all"
                style={{ borderColor:cfg.difficulty===d?'#a78bfa40':'rgba(255,255,255,0.06)', background:cfg.difficulty===d?'rgba(167,139,250,0.12)':'transparent', color:cfg.difficulty===d?'#a78bfa':'rgba(186,230,253,0.4)' }}>
                {d==='easy'?'🟢':d==='medium'?'🟡':'🔴'} {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-2">Questions</div>
          <div className="flex gap-1.5">
            {[5,10,15,20].map(n=>(
              <button key={n} onClick={()=>setCfg(c=>({...c,count:n}))}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
                style={{ borderColor:cfg.count===n?'#f59e0b40':'rgba(255,255,255,0.06)', background:cfg.count===n?'rgba(245,158,11,0.12)':'transparent', color:cfg.count===n?'#f59e0b':'rgba(186,230,253,0.4)' }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button onClick={generate}
        className="btn-primary w-full justify-center py-3.5 text-sm font-bold flex items-center gap-2">
        <Zap size={15}/> Generate Quiz with Groq AI
      </button>
      <div className="font-mono text-[9px] text-[rgba(186,230,253,0.2)] text-center">
        Powered by Llama 3.3 70B · Free · Instant
      </div>
    </div>
  );

  /* Loading */
  if (step === 'loading') return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <motion.div animate={{rotate:360}} transition={{duration:1.2,repeat:Infinity,ease:'linear'}}
        className="w-14 h-14 rounded-full border-2 border-[rgba(167,139,250,0.2)] border-t-[#a78bfa]"/>
      <div className="text-center">
        <div className="font-display font-bold text-lg mb-1">Generating Quiz…</div>
        <div className="font-mono text-xs text-[rgba(186,230,253,0.4)]">
          Groq is crafting {cfg.count} questions{selSub ? ` for ${selSub.name}` : ''}
        </div>
      </div>
    </div>
  );

  /* Quiz */
  if (step === 'quiz' && q) return (
    <div className="space-y-4 max-w-xl">
      {/* Progress dots */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs text-[rgba(186,230,253,0.4)]">Q {qIdx+1} / {questions.length}</div>
        <div className="flex items-center gap-1">
          {questions.map((_,i)=>(
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all" style={{
              background: i in answers
                ? answers[i]===questions[i].ans?'#10b981':'#f43f5e'
                : i===qIdx?'#0ea5e9':'rgba(255,255,255,0.1)',
            }}/>
          ))}
        </div>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#a78bfa]"
          animate={{width:`${((qIdx+1)/questions.length)*100}%`}} transition={{duration:0.4}}/>
      </div>
      {/* Question card */}
      <div className="p-5 rounded-2xl border border-[rgba(14,165,233,0.12)] bg-[rgba(14,165,233,0.04)]">
        <div className="font-mono text-[10px] text-[rgba(14,165,233,0.5)] uppercase tracking-widest mb-2">
          {cfg.difficulty} · {selSub?.name||'General'}
        </div>
        <div className="text-base font-semibold text-[#f0f9ff] leading-relaxed">{q.q}</div>
      </div>
      {/* Options */}
      <div className="space-y-2">
        {q.opts.map((opt,i)=>{
          const sel = answers[qIdx]===i, correct=i===q.ans;
          return (
            <button key={i} onClick={()=>!answered&&answer(i)}
              className="w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-center gap-3"
              style={{
                borderColor: answered?(correct?'rgba(16,185,129,0.5)':sel?'rgba(244,63,94,0.5)':'rgba(255,255,255,0.06)'):sel?'rgba(14,165,233,0.5)':'rgba(255,255,255,0.06)',
                background: answered?(correct?'rgba(16,185,129,0.08)':sel?'rgba(244,63,94,0.08)':'transparent'):sel?'rgba(14,165,233,0.08)':'transparent',
                cursor: answered?'default':'pointer',
              }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold border"
                style={{
                  borderColor: answered?(correct?'#10b981':sel?'#f43f5e':'rgba(255,255,255,0.1)'):sel?'#0ea5e9':'rgba(255,255,255,0.1)',
                  background: answered?(correct?'rgba(16,185,129,0.15)':sel?'rgba(244,63,94,0.15)':'transparent'):sel?'rgba(14,165,233,0.15)':'transparent',
                  color: answered?(correct?'#10b981':sel?'#f43f5e':'rgba(186,230,253,0.3)'):sel?'#0ea5e9':'rgba(186,230,253,0.3)',
                }}>
                {answered&&correct?'✓':answered&&sel?'✗':String.fromCharCode(65+i)}
              </div>
              <div className="text-sm text-[rgba(186,230,253,0.8)]">{opt}</div>
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {answered && q.exp && (
          <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
            className="p-4 rounded-xl border border-[rgba(167,139,250,0.2)] bg-[rgba(124,58,237,0.06)]">
            <div className="font-mono text-[10px] text-[#a78bfa] mb-1 uppercase tracking-widest">Explanation</div>
            <div className="text-sm text-[rgba(186,230,253,0.7)] leading-relaxed">{q.exp}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2 justify-between">
        <button onClick={()=>setQIdx(i=>Math.max(0,i-1))} disabled={qIdx===0} className="btn-ghost px-4 disabled:opacity-30">← Prev</button>
        <button onClick={next} disabled={!answered} className="btn-primary px-6 disabled:opacity-30">
          {qIdx===questions.length-1?'Finish Quiz':'Next →'}
        </button>
      </div>
    </div>
  );

  /* Results */
  if (step === 'results' && results) {
    const grade = results.pct>=90?{label:'Excellent!',color:'#10b981',emoji:'🏆'}
      :results.pct>=70?{label:'Good job!',color:'#0ea5e9',emoji:'🎯'}
      :results.pct>=50?{label:'Keep going!',color:'#f59e0b',emoji:'⚡'}
      :{label:'More practice needed',color:'#f43f5e',emoji:'📚'};
    return (
      <div className="space-y-5 max-w-md mx-auto text-center">
        <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:200}}>
          <div className="text-6xl mb-3">{grade.emoji}</div>
          <div className="font-display font-bold text-4xl" style={{color:grade.color}}>{results.pct}%</div>
          <div className="font-display font-semibold text-lg mt-1">{grade.label}</div>
          <div className="font-mono text-sm text-[rgba(186,230,253,0.4)] mt-1">{results.score}/{results.total} correct</div>
        </motion.div>
        <div className="text-left space-y-1.5">
          <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest mb-2">Question Review</div>
          {questions.map((qq,i)=>{
            const ok = answers[i]===qq.ans;
            return (
              <div key={i} className="p-3 rounded-xl border text-left"
                style={{borderColor:ok?'rgba(16,185,129,0.2)':'rgba(244,63,94,0.2)',background:ok?'rgba(16,185,129,0.04)':'rgba(244,63,94,0.04)'}}>
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{ok?'✅':'❌'}</span>
                  <div>
                    <div className="font-mono text-[10px] text-[rgba(186,230,253,0.6)] leading-relaxed">{qq.q}</div>
                    {!ok && <div className="font-mono text-[9px] text-[#10b981] mt-0.5">Correct: {qq.opts[qq.ans]}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="btn-primary px-6 py-3">New Quiz</button>
          {results.pct < 70 && onStartExam && selSub && (
            <button onClick={()=>onStartExam(selSub)} className="btn-ghost px-6 py-3 text-[#f43f5e] border-[rgba(244,63,94,0.2)]">
              Exam Mode →
            </button>
          )}
        </div>
      </div>
    );
  }
  return null;
}

/* ─── Subject Modal ──────────────────────────────────────────── */
function SubjectModal({ initial, onSave, onClose }) {
  const [form,setSaving]=useState(initial||{name:'',emoji:'📚',color:'#0ea5e9',category:'General',targetHours:100,priority:'medium',examDate:''});
  const [saving,setSave]=useState(false);
  const submit = async(e) => {
    e.preventDefault(); setSave(true);
    await onSave({...form,targetHours:parseInt(form.targetHours)||100,examDate:form.examDate||null});
    setSave(false);
  };
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.95,opacity:0}}
        className="card p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <div className="font-display font-bold text-lg">{initial?'Edit Subject':'Add Subject'}</div>
          <button onClick={onClose} className="text-[rgba(186,230,253,0.3)] hover:text-white transition-colors"><X size={18}/></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <div className="label">Emoji</div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e=>(
                <button key={e} type="button" onClick={()=>setSaving(f=>({...f,emoji:e}))}
                  className={`w-8 h-8 rounded-lg text-base transition-all ${form.emoji===e?'bg-[rgba(14,165,233,0.2)] ring-1 ring-[rgba(14,165,233,0.4)]':'bg-white/[0.04] hover:bg-white/[0.08]'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <input className="input-field" placeholder="Subject name" value={form.name} onChange={e=>setSaving(f=>({...f,name:e.target.value}))} required autoFocus/>
          <div className="grid grid-cols-2 gap-3">
            <select className="input-field py-2" value={form.category} onChange={e=>setSaving(f=>({...f,category:e.target.value}))}>
              {CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select className="input-field py-2" value={form.priority} onChange={e=>setSaving(f=>({...f,priority:e.target.value}))}>
              {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            <input type="number" min="1" className="input-field py-2" placeholder="Target hours" value={form.targetHours}
              onChange={e=>setSaving(f=>({...f,targetHours:e.target.value}))}/>
            <input type="date" className="input-field py-2" value={form.examDate?.split?.('T')?.[0]||''}
              onChange={e=>setSaving(f=>({...f,examDate:e.target.value}))}
              min={new Date().toISOString().split('T')[0]}/>
          </div>
          <div className="flex gap-2">
            {COLORS.map(c=>(
              <button key={c} type="button" onClick={()=>setSaving(f=>({...f,color:c}))}
                className={`w-7 h-7 rounded-full transition-all ${form.color===c?'scale-125 ring-2 ring-white/30':''}`}
                style={{background:c}}/>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving||!form.name.trim()} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {saving?'Saving…':initial?'Save Changes':'Add Subject'}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function StudyPage() {
  const [tab,      setTab]     = useState(0);
  const [subjects, setSubjs]   = useState([]);
  const [stats,    setStats]   = useState(null);
  const [selSub,   setSelSub]  = useState('');
  const [modal,    setModal]   = useState(false);
  const [editSub,  setEditSub] = useState(null);
  const [loading,  setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sr, st] = await Promise.all([studyApi.listSubjects(), studyApi.getStats()]);
      setSubjs(sr.data.data||[]);
      setStats(st.data.data||null);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (d) => {
    try { editSub ? await studyApi.updateSubject(editSub._id, d) : await studyApi.createSubject(d); }
    catch(e) { console.error(e); }
    setModal(false); setEditSub(null); load();
  };

  const handleDelete = async (id) => {
    try { await studyApi.deleteSubject(id); load(); } catch {}
  };

  const todayH   = ((stats?.today?.minutes||0)/60).toFixed(1);
  const avgMastery = subjects.length ? Math.round(subjects.reduce((s,x)=>s+(x.mastery||0),0)/subjects.length) : 0;
  const boost = getBoost(avgMastery);

  // Find most urgent exam
  const urgentExam = subjects.filter(s=>s.examDate&&new Date(s.examDate)>new Date())
    .sort((a,b)=>new Date(a.examDate)-new Date(b.examDate))[0];
  const urgentDays = urgentExam ? Math.ceil((new Date(urgentExam.examDate)-new Date())/86400000) : null;

  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
      className="max-w-6xl mx-auto">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 mb-5 border border-[rgba(14,165,233,0.12)]"
        style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.06) 0%, rgba(124,58,237,0.06) 50%, rgba(16,185,129,0.04) 100%)' }}>
        {/* Neural grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage:'linear-gradient(rgba(14,165,233,1) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,1) 1px,transparent 1px)',
          backgroundSize:'30px 30px',
        }}/>
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
          style={{ background:'radial-gradient(circle,#0ea5e9,transparent 70%)', filter:'blur(40px)' }}/>

        <div className="relative flex items-center justify-between flex-wrap gap-5">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[rgba(14,165,233,0.6)] mb-2">
              ⭐ Elixor Study Engine · AI-Powered
            </div>
            <h1 className="font-display font-bold text-3xl tracking-tight mb-1">
              Study Intelligence
            </h1>
            <p className="font-mono text-[11px] text-[rgba(186,230,253,0.4)]">
              Adaptive AI · Diagrams · Spaced Repetition · Exam Readiness
            </p>
          </div>

          {/* Right: KPI pills */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label:"Today",    val:`${todayH}h`,       color:'#0ea5e9' },
              { label:"Mastery",  val:`${avgMastery}%`,   color:'#a78bfa' },
              { label:"Subjects", val:String(subjects.length), color:'#10b981' },
              ...(urgentDays!=null
                ? [{ label:`${urgentExam.name.slice(0,8)}…`, val:`${urgentDays}d`, color:urgentDays<7?'#f43f5e':'#f59e0b' }]
                : []),
            ].map(k=>(
              <div key={k.label} className="text-center px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04]">
                <div className="font-display font-bold text-xl leading-none" style={{color:k.color}}>{k.val}</div>
                <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence boost bar */}
        <div className="relative mt-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.05]">
          <span className="text-2xl">{boost.emoji}</span>
          <div className="flex-1 text-sm text-[rgba(186,230,253,0.65)]">{boost.msg}</div>
          <button onClick={()=>setTab(0)} className="font-mono text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: boost.color+'20', color: boost.color, border:`1px solid ${boost.color}40` }}>
            View Plan
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">

        {/* Subject sidebar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)] uppercase tracking-widest">
              Subjects ({subjects.length})
            </div>
            <button onClick={()=>{setEditSub(null);setModal(true);}}
              className="btn-primary btn-xs flex items-center gap-1">
              <Plus size={10}/> Add
            </button>
          </div>

          {loading && <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-24"/>)}</div>}

          {!loading && subjects.length === 0 && (
            <div className="card p-6 text-center">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold text-sm text-[rgba(186,230,253,0.6)] mb-2">Start your journey</div>
              <div className="font-mono text-xs text-[rgba(186,230,253,0.3)] mb-4">Add your first subject to begin AI-powered study tracking</div>
              <button onClick={()=>setModal(true)} className="btn-primary btn-sm">+ Add Subject</button>
            </div>
          )}

          <div className="space-y-2 group">
            <AnimatePresence>
              {subjects.map(s=>(
                <SubjectCard key={s._id} s={s} selected={selSub}
                  onSelect={id=>setSelSub(id===selSub?'':id)}
                  onEdit={sub=>{setEditSub(sub);setModal(true);}}
                  onDelete={handleDelete}/>
              ))}
            </AnimatePresence>
          </div>

          {/* AI suggestion */}
          {subjects.length > 0 && (
            <div className="p-3 rounded-xl border border-[rgba(167,139,250,0.15)] bg-[rgba(124,58,237,0.05)] mt-2">
              <div className="font-mono text-[9px] text-[#a78bfa] uppercase tracking-widest mb-1.5">AI Tip</div>
              <div className="text-[11px] text-[rgba(186,230,253,0.55)] leading-relaxed">
                {(() => {
                  const low = [...subjects].sort((a,b)=>(a.mastery||0)-(b.mastery||0))[0];
                  const critical = subjects.find(s=>s.priority==='critical');
                  if (critical) return `🔴 ${critical.name} is critical priority. Study it first today.`;
                  return `📊 ${low?.name||'your subject'} has lowest mastery. 45-min focused session recommended.`;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Tab panel */}
        <div className="card card-ion overflow-hidden flex flex-col">
          {/* Tab nav */}
          <div className="flex border-b border-white/[0.05] overflow-x-auto flex-shrink-0">
            {TABS.map((t, i) => {
              const Icon = TAB_ICONS[i];
              return (
                <button key={t} onClick={()=>setTab(i)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    tab===i
                      ? 'text-[#0ea5e9] border-b-2 border-[#0ea5e9] bg-[rgba(14,165,233,0.05)]'
                      : 'text-[rgba(186,230,253,0.4)] hover:text-[rgba(186,230,253,0.7)]'
                  }`}>
                  <Icon size={12}/>{t}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">

              {tab === 0 && (
                <motion.div key="ov" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
                  <div className="font-display font-bold text-base">Today's Study Plan</div>
                  {subjects.length === 0 ? (
                    <div className="text-center py-12 font-mono text-xs text-[rgba(186,230,253,0.2)]">
                      Add a subject to activate your AI study plan
                    </div>
                  ) : (
                    <>
                      {/* Spaced repetition queue */}
                      <div className="space-y-2">
                        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.3)] uppercase tracking-widest">
                          Revision Queue · Spaced Repetition
                        </div>
                        {subjects.slice().sort((a,b)=>(a.mastery||0)-(b.mastery||0)).slice(0,4).map((s,i)=>(
                          <div key={s._id} className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] hover:border-white/[0.1] transition-all">
                            <div className="font-mono text-[10px] text-[rgba(186,230,253,0.2)] w-5 flex-shrink-0 text-center">{i+1}</div>
                            <span className="text-xl flex-shrink-0">{s.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[rgba(186,230,253,0.7)] truncate">{s.name}</div>
                              <div className="font-mono text-[9px]" style={{color:s.color}}>{s.mastery||0}% mastery · {s.priority}</div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="font-mono text-[9px] text-[rgba(186,230,253,0.3)]">
                                {i===0?'30m':i===1?'45m':i===2?'60m':'20m'}
                              </span>
                              <button onClick={()=>{setSelSub(s._id);setTab(1);}}
                                className="btn-primary btn-xs">Start</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Quick actions */}
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={()=>setTab(1)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-[rgba(14,165,233,0.2)] hover:bg-[rgba(14,165,233,0.04)] transition-all group">
                          <Play size={20} className="text-[#0ea5e9] group-hover:scale-110 transition-transform"/>
                          <span className="font-semibold text-xs text-[rgba(186,230,253,0.6)]">Start Session</span>
                        </button>
                        <button onClick={()=>setTab(2)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-[rgba(167,139,250,0.2)] hover:bg-[rgba(124,58,237,0.04)] transition-all group">
                          <Brain size={20} className="text-[#a78bfa] group-hover:scale-110 transition-transform"/>
                          <span className="font-semibold text-xs text-[rgba(186,230,253,0.6)]">Ask AI Scholar</span>
                        </button>
                        <button onClick={()=>setTab(3)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-[rgba(16,185,129,0.2)] hover:bg-[rgba(16,185,129,0.04)] transition-all group">
                          <FileText size={20} className="text-[#10b981] group-hover:scale-110 transition-transform"/>
                          <span className="font-semibold text-xs text-[rgba(186,230,253,0.6)]">Smart Notes</span>
                        </button>
                        <button onClick={()=>setTab(5)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.04)] transition-all group">
                          <Zap size={20} className="text-[#f59e0b] group-hover:scale-110 transition-transform"/>
                          <span className="font-semibold text-xs text-[rgba(186,230,253,0.6)]">Practice Quiz</span>
                        </button>
                        <button onClick={()=>setTab(6)}
                          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/[0.06] hover:border-[rgba(244,63,94,0.2)] hover:bg-[rgba(244,63,94,0.04)] transition-all group">
                          <Shield size={20} className="text-[#f43f5e] group-hover:scale-110 transition-transform"/>
                          <span className="font-semibold text-xs text-[rgba(186,230,253,0.6)]">Exam Mode</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {tab === 1 && (
                <motion.div key="sess" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div className="font-display font-bold text-base mb-5">Study Session</div>
                  <LiveSession subjects={subjects} onComplete={load}/>
                </motion.div>
              )}

              {tab === 2 && (
                <motion.div key="ai" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-[#a78bfa]"/>
                    <div className="font-display font-bold text-base">AI Scholar</div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-[rgba(16,185,129,0.7)] px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"/>
                      Groq · Diagrams enabled
                    </div>
                  </div>
                  <AIScholar subjects={subjects}/>
                </motion.div>
              )}

              {tab === 3 && (
                <motion.div key="notes" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div className="font-display font-bold text-base mb-4">Smart Notes</div>
                  <SmartNotes subjects={subjects}/>
                </motion.div>
              )}

              {tab === 4 && (
                <motion.div key="an" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div className="font-display font-bold text-base mb-4">Study Analytics</div>
                  <StudyAnalytics stats={stats} subjects={subjects}/>
                </motion.div>
              )}

              {tab === 5 && (
                <motion.div key="practice" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <AIPractice subjects={subjects} onStartExam={() => setTab(6)} />
                </motion.div>
              )}

              {tab === 6 && (
                <motion.div key="exam" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <ExamMode subjects={subjects}/>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Subject modal */}
      <AnimatePresence>
        {modal && (
          <SubjectModal
            initial={editSub?{...editSub,examDate:editSub.examDate?.split?.('T')?.[0]||''}:null}
            onSave={handleSave}
            onClose={()=>{setModal(false);setEditSub(null);}}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
