/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void:   { 0:'#010203', 1:'#04080f', 2:'#080e1a', 3:'#0c1424', 4:'#111c30', 5:'#16243c' },
        ion:    { blue:'#0ea5e9', cyan:'#06e5d4', plasma:'#7c3aed', solar:'#f59e0b', bio:'#10b981', coral:'#f43f5e', ice:'#bae6fd' },
        lum:    { 100:'#f0f9ff', 200:'#bae6fd', 300:'#7dd3fc', 400:'#38bdf8', 500:'#0ea5e9' },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        system:  ['Cabinet Grotesk', 'sans-serif'],
        code:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease',
        'slide-up':  'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
        'pulse-glow':'pulseGlow 2s ease-in-out infinite',
        'breathe':   'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from:{ opacity:0 }, to:{ opacity:1 } },
        slideUp:   { from:{ opacity:0, transform:'translateY(16px)' }, to:{ opacity:1, transform:'none' } },
        pulseGlow: { '0%,100%':{ opacity:0.6 }, '50%':{ opacity:1 } },
        breathe:   { '0%,100%':{ boxShadow:'0 4px 24px rgba(0,0,0,0.6)' }, '50%':{ boxShadow:'0 4px 24px rgba(0,0,0,0.6), 0 0 20px rgba(14,165,233,0.1)' } },
      },
      backdropBlur: { xs:'2px' },
    },
  },
  plugins: [],
};
