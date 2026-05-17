import React from 'react';

const ACCENTS = {
  ion:    'card-ion',
  plasma: 'card-plasma',
  bio:    'card-bio',
  solar:  'card-solar',
  coral:  'card-coral',
};

export default function StatCard({ label, value, sub, accent = 'ion', icon }) {
  return (
    <div className={`card ${ACCENTS[accent]} p-5`}>
      <div className="label">{label}</div>
      <div className="flex items-end gap-2 mt-2 mb-1">
        {icon && <span className="text-2xl">{icon}</span>}
        <div className={`font-display font-bold text-3xl leading-none ${
          accent === 'ion'    ? 'text-[#0ea5e9]' :
          accent === 'plasma' ? 'text-[#a78bfa]' :
          accent === 'bio'    ? 'text-[#10b981]' :
          accent === 'solar'  ? 'text-[#f59e0b]' :
          accent === 'coral'  ? 'text-[#f43f5e]' : 'text-[#bae6fd]'
        }`}>{value}</div>
      </div>
      {sub && <div className="font-mono text-[11px] text-[rgba(186,230,253,0.4)]">{sub}</div>}
    </div>
  );
}
