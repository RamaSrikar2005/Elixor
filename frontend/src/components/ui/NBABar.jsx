import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MESSAGES = [
  (d) => `Start your deep work block — productivity score at ${d?.scores?.productivity || 0}/100 today`,
  (d) => `${d?.habits?.checkedToday || 0}/${d?.habits?.total || 0} habits checked — keep your streak alive 🔥`,
  (d) => `Saving at ${d?.finance?.savingsRate || '0%'} this month — you're on track`,
  (d) => `${d?.tasks?.done || 0} of ${d?.tasks?.total || 0} missions complete — keep the momentum`,
];

export default function NBABar({ dashboard: d }) {
  const [idx, setIdx] = useState(0);
  const navigate      = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(14,165,233,0.15)] p-5"
      style={{ background: 'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(124,58,237,0.08))' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0ea5e9] to-transparent opacity-60" />
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(14,165,233,0.4)]"
            style={{ background: 'linear-gradient(135deg,#0ea5e9,#7c3aed)' }}>
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-[#0ea5e9] mb-1">AI · NEXT BEST ACTION</div>
            <div className="font-display font-bold text-lg tracking-tight">
              {d ? MESSAGES[idx % MESSAGES.length](d) : 'Loading your intelligence…'}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate('/focus')} className="btn-primary btn-sm">Enter Focus →</button>
          <button onClick={() => setIdx(i => i + 1)} className="btn-ghost btn-sm">Next insight</button>
        </div>
      </div>
    </div>
  );
}
