import React from 'react';

/** Premium SVG logo for Elixor OS — hexagonal neural design */
export default function ElixorLogo({ size = 36, showName = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGradMain" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="logoGradGlow" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.1" />
          </linearGradient>
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer hexagon glow */}
        <polygon points="20,2 36,11 36,29 20,38 4,29 4,11"
          fill="url(#logoGradGlow)" stroke="url(#logoGradMain)" strokeWidth="0.5" opacity="0.4" />

        {/* Main hexagon */}
        <polygon points="20,4.5 34,13 34,27 20,35.5 6,27 6,13"
          fill="rgba(8,14,26,0.9)" stroke="url(#logoGradMain)" strokeWidth="1" />

        {/* Circuit nodes */}
        <circle cx="20" cy="4.5" r="1.2" fill="#0ea5e9" opacity="0.7" />
        <circle cx="34" cy="13" r="1.2" fill="#6366f1" opacity="0.7" />
        <circle cx="34" cy="27" r="1.2" fill="#7c3aed" opacity="0.7" />
        <circle cx="20" cy="35.5" r="1.2" fill="#0ea5e9" opacity="0.7" />
        <circle cx="6" cy="27" r="1.2" fill="#6366f1" opacity="0.7" />
        <circle cx="6" cy="13" r="1.2" fill="#7c3aed" opacity="0.7" />

        {/* E letterform — clean, geometric */}
        <g filter="url(#logoGlow)">
          {/* Horizontal bars of E */}
          <rect x="13" y="13" width="14" height="2.5" rx="1.2" fill="url(#logoGradMain)" />
          <rect x="13" y="18.8" width="10" height="2.4" rx="1.2" fill="url(#logoGradMain)" />
          <rect x="13" y="24.5" width="14" height="2.5" rx="1.2" fill="url(#logoGradMain)" />
          {/* Vertical spine of E */}
          <rect x="13" y="13" width="2.5" height="14" rx="1.2" fill="url(#logoGradMain)" />
        </g>

        {/* Neural dot accent */}
        <circle cx="28" cy="20" r="1.5" fill="#0ea5e9" opacity="0.5" />
        <line x1="25" y1="20" x2="28" y2="20" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.4" />
      </svg>

      {showName && (
        <div>
          <div className="font-display font-bold text-base tracking-tight leading-none bg-gradient-to-r from-[#f0f9ff] to-[#7dd3fc] bg-clip-text text-transparent">
            ELIXOR OS
          </div>
          <div className="font-mono text-[9px] text-[rgba(14,165,233,0.5)] mt-0.5">v2.0 · Intelligence Layer</div>
        </div>
      )}
    </div>
  );
}
