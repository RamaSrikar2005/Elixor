import { motion } from 'framer-motion';

/**
 * FocusScoreLogo — Premium animated SVG icon for the Focus Score system.
 * Design: Cyberpunk neural-energy radar ring with pulsing core.
 */
export default function FocusScoreLogo({ size = 48, score = 0, animate: shouldAnimate = true }) {
  const r1 = size * 0.42;  // outer ring
  const r2 = size * 0.30;  // mid ring
  const r3 = size * 0.16;  // core
  const cx  = size / 2;
  const circ1 = 2 * Math.PI * r1;
  const circ2 = 2 * Math.PI * r2;
  const pct   = Math.min(score / 100, 1);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="fsGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="fsGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#06e5d4" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <filter id="fsGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="fsCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {/* Outer track */}
        <circle cx={cx} cy={cx} r={r1} fill="none" stroke="rgba(14,165,233,0.08)" strokeWidth="2.5" />
        {/* Outer progress arc */}
        <circle cx={cx} cy={cx} r={r1} fill="none" stroke="url(#fsGrad1)" strokeWidth="2.5"
          strokeDasharray={circ1} strokeDashoffset={circ1 - pct * circ1}
          strokeLinecap="round" filter="url(#fsGlow)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />

        {/* Tick marks on outer ring */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = cx + (r1 - 3) * Math.cos(angle);
          const y1 = cx + (r1 - 3) * Math.sin(angle);
          const x2 = cx + (r1 + 3) * Math.cos(angle);
          const y2 = cx + (r1 + 3) * Math.sin(angle);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(14,165,233,0.2)" strokeWidth="1" />;
        })}

        {/* Mid ring */}
        <circle cx={cx} cy={cx} r={r2} fill="none" stroke="rgba(14,165,233,0.06)" strokeWidth="1.5" />
        <circle cx={cx} cy={cx} r={r2} fill="none" stroke="url(#fsGrad2)" strokeWidth="1.5"
          strokeDasharray={circ2}
          strokeDashoffset={circ2 - Math.min(pct * 1.3, 1) * circ2}
          strokeLinecap="round" opacity="0.6"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />

        {/* Core glow */}
        <circle cx={cx} cy={cx} r={r3} fill="url(#fsCore)" filter="url(#fsGlow)" />
        <circle cx={cx} cy={cx} r={r3 * 0.5} fill="rgba(14,165,233,0.9)" filter="url(#fsGlow)" />

        {/* Neural spokes */}
        {[45, 135, 225, 315].map((deg, i) => {
          const angle = (deg * Math.PI) / 180;
          return (
            <line key={i}
              x1={cx + r3 * Math.cos(angle)} y1={cx + r3 * Math.sin(angle)}
              x2={cx + r2 * 0.8 * Math.cos(angle)} y2={cx + r2 * 0.8 * Math.sin(angle)}
              stroke="rgba(14,165,233,0.3)" strokeWidth="0.8" />
          );
        })}
      </svg>

      {/* Pulse ring animation */}
      {shouldAnimate && (
        <motion.div
          className="absolute inset-0 rounded-full border border-[rgba(14,165,233,0.3)]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}

/** Inline stat card variant with score display */
export function FocusScoreCard({ score = 0, hours = '0', sessions = 0 }) {
  return (
    <div className="flex items-center gap-4">
      <FocusScoreLogo size={56} score={score} />
      <div>
        <div className="font-display font-bold text-3xl text-[#a78bfa] leading-none">
          {score}<span className="text-sm text-[rgba(186,230,253,0.35)] font-normal">/100</span>
        </div>
        <div className="font-mono text-[10px] text-[rgba(186,230,253,0.4)] mt-1">
          {hours}h · {sessions} sessions
        </div>
      </div>
    </div>
  );
}
