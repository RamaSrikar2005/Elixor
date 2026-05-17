/**
 * StudyDashWidget — Compact study status card for the main Dashboard.
 * Shows today's hours, top subjects, nearest exam countdown, and quick action.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Play, TrendingUp } from 'lucide-react';
import { studyApi } from '../../services/api.js';

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function StudyDashWidget() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    studyApi.getStats()
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-12" />
        <div className="skeleton h-8" />
      </div>
    );
  }

  if (!data || !data.totalSubjects) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} className="text-[#0ea5e9]" />
          <div className="font-display font-bold text-sm">Study Engine</div>
        </div>
        <div className="text-center py-4">
          <div className="text-3xl mb-2">📚</div>
          <div className="font-mono text-xs text-[rgba(186,230,253,0.3)] mb-3">
            No subjects added yet
          </div>
          <button onClick={() => navigate('/study')} className="btn-primary btn-sm">
            Set Up Study Plan
          </button>
        </div>
      </div>
    );
  }

  const todayH    = ((data.today?.minutes || 0) / 60).toFixed(1);
  const weekH     = ((data.week?.minutes  || 0) / 60).toFixed(1);
  const subjects  = data.subjectList || [];
  const topSubjs  = [...subjects].sort((a,b) => (b.studiedHours||0) - (a.studiedHours||0)).slice(0,3);

  // Find nearest exam
  const urgentExam = subjects
    .filter(s => s.examDate && new Date(s.examDate) > new Date())
    .sort((a,b) => new Date(a.examDate) - new Date(b.examDate))[0];
  const daysLeft = urgentExam
    ? Math.ceil((new Date(urgentExam.examDate) - new Date()) / 86400000)
    : null;

  const avgMastery = subjects.length
    ? Math.round(subjects.reduce((s,x) => s+(x.mastery||0), 0) / subjects.length)
    : 0;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[#0ea5e9]" />
          <div className="font-display font-bold text-sm">Study Engine</div>
        </div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.35)]">
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Today',   value: `${todayH}h`, color: 'text-[#0ea5e9]'  },
          { label: 'Week',    value: `${weekH}h`,  color: 'text-[#10b981]'  },
          { label: 'Mastery', value: `${avgMastery}%`, color: 'text-[#a78bfa]' },
        ].map(k => (
          <div key={k.label}>
            <div className={`font-display font-bold text-xl leading-none ${k.color}`}>{k.value}</div>
            <div className="font-mono text-[9px] text-[rgba(186,230,253,0.35)] mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Subject mini-bars */}
      {topSubjs.length > 0 && (
        <div className="space-y-2">
          {topSubjs.map(s => (
            <div key={s._id}>
              <div className="flex justify-between font-mono text-[9px] mb-1">
                <span className="text-[rgba(186,230,253,0.5)]">{s.emoji} {s.name}</span>
                <span style={{ color: s.color }}>{s.mastery||0}%</span>
              </div>
              <MiniBar value={s.mastery||0} max={100} color={s.color||'#0ea5e9'} />
            </div>
          ))}
        </div>
      )}

      {/* Exam countdown */}
      {urgentExam && (
        <motion.div
          animate={{ borderColor: daysLeft < 7 ? ['rgba(244,63,94,0.3)', 'rgba(244,63,94,0.6)', 'rgba(244,63,94,0.3)'] : ['rgba(245,158,11,0.2)', 'rgba(245,158,11,0.2)'] }}
          transition={{ duration: 2, repeat: daysLeft < 7 ? Infinity : 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{ background: daysLeft < 7 ? 'rgba(244,63,94,0.06)' : 'rgba(245,158,11,0.06)' }}
        >
          <Calendar size={12} className={daysLeft < 7 ? 'text-[#f43f5e]' : 'text-[#f59e0b]'} />
          <div className="flex-1 font-mono text-[10px]">
            <span className={daysLeft < 7 ? 'text-[#f43f5e]' : 'text-[#f59e0b]'}>
              {urgentExam.emoji} {urgentExam.name}
            </span>
            <span className="text-[rgba(186,230,253,0.3)] ml-1">
              — {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `${daysLeft} days`}
            </span>
          </div>
        </motion.div>
      )}

      {/* CTA */}
      <button onClick={() => navigate('/study')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-[rgba(14,165,233,0.2)] text-[#0ea5e9] bg-[rgba(14,165,233,0.06)] hover:bg-[rgba(14,165,233,0.12)] transition-all">
        <Play size={12}/> Start Studying
      </button>
    </div>
  );
}
