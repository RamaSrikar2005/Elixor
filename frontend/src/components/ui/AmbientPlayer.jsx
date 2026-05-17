/**
 * AmbientPlayer — Web Audio API sound engine. Zero external dependencies.
 * Generates all sounds mathematically in-browser.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, VolumeX, Volume2, ChevronUp, ChevronDown } from 'lucide-react';

const SOUNDS = [
  { id: 'off',     name: 'Off',         emoji: '🔇', desc: 'Silence'            },
  { id: 'white',   name: 'White Noise', emoji: '🌫️', desc: 'Equal-frequency noise' },
  { id: 'brown',   name: 'Brown Noise', emoji: '🌊', desc: 'Deep, warm rumble'  },
  { id: 'rain',    name: 'Rain',        emoji: '🌧️', desc: 'Filtered rainfall'  },
  { id: 'focus',   name: 'Focus Tone',  emoji: '🔮', desc: '40Hz gamma + drone' },
  { id: 'forest',  name: 'Forest',      emoji: '🌿', desc: 'Gentle wind + birds (noise)' },
];

/** Generate a white noise AudioBufferSourceNode (loops) */
function makeWhiteNoise(ctx) {
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src  = ctx.createBufferSource();
  src.buffer = buf;
  src.loop   = true;
  return src;
}

/** Brown noise (integrated white noise) */
function makeBrownNoise(ctx) {
  const buf  = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last   = 0;
  for (let i = 0; i < data.length; i++) {
    const w  = Math.random() * 2 - 1;
    last     = (last + 0.02 * w) / 1.02;
    data[i]  = last * 3.5;
  }
  const src  = ctx.createBufferSource();
  src.buffer = buf;
  src.loop   = true;
  return src;
}

/**
 * Build sound graph for the given soundId.
 * Returns { sources: AudioNode[], gain: GainNode }
 */
function buildSound(ctx, soundId, volume) {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  if (soundId === 'off') return { sources: [], gain: masterGain };

  if (soundId === 'white') {
    const src = makeWhiteNoise(ctx);
    src.connect(masterGain);
    src.start();
    return { sources: [src], gain: masterGain };
  }

  if (soundId === 'brown') {
    const src = makeBrownNoise(ctx);
    // Lowpass for warmth
    const lpf = ctx.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 400;
    src.connect(lpf);
    lpf.connect(masterGain);
    src.start();
    return { sources: [src], gain: masterGain };
  }

  if (soundId === 'rain') {
    // White noise through modulated bandpass → simulates rainfall
    const src  = makeWhiteNoise(ctx);
    const lpf  = ctx.createBiquadFilter();
    lpf.type            = 'lowpass';
    lpf.frequency.value = 1200;
    // LFO to modulate filter cutoff (gives "wave" effect)
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 600;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);
    src.connect(lpf);
    lpf.connect(masterGain);
    src.start();
    lfo.start();
    return { sources: [src, lfo], gain: masterGain };
  }

  if (soundId === 'focus') {
    // 40Hz binaural beat: left ear 200Hz, right ear 240Hz → perceived 40Hz gamma
    // Since we're mono, simulate with a subtle 40Hz amplitude oscillation
    const carrier = ctx.createOscillator();
    carrier.frequency.value = 100;
    carrier.type = 'sine';
    const carGain = ctx.createGain();
    carGain.gain.value = 0.05;
    carrier.connect(carGain);

    // AM modulator at 40Hz (gamma)
    const mod = ctx.createOscillator();
    mod.frequency.value = 40;
    const modGain = ctx.createGain();
    modGain.gain.value = 0.5;
    mod.connect(modGain);
    modGain.connect(carGain.gain);

    // Drone base tone
    const drone = ctx.createOscillator();
    drone.frequency.value = 60;
    drone.type = 'triangle';
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.04;
    drone.connect(droneGain);

    carGain.connect(masterGain);
    droneGain.connect(masterGain);
    carrier.start(); mod.start(); drone.start();
    return { sources: [carrier, mod, drone], gain: masterGain };
  }

  if (soundId === 'forest') {
    // Gentle wind: white noise through a slow-wobbling bandpass
    const src  = makeWhiteNoise(ctx);
    const bpf  = ctx.createBiquadFilter();
    bpf.type  = 'bandpass';
    bpf.frequency.value = 800;
    bpf.Q.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 400;
    lfo.connect(lfoG);
    lfoG.connect(bpf.frequency);
    // Occasional "bird chirp" — high-frequency blip every few seconds
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 3000;
    const src2 = makeWhiteNoise(ctx);
    const birdGain = ctx.createGain();
    birdGain.gain.value = 0.02;
    src2.connect(hpf);
    hpf.connect(birdGain);
    src.connect(bpf);
    bpf.connect(masterGain);
    birdGain.connect(masterGain);
    src.start(); src2.start(); lfo.start();
    return { sources: [src, src2, lfo], gain: masterGain };
  }

  return { sources: [], gain: masterGain };
}

export default function AmbientPlayer() {
  const [active,  setActive]  = useState('off');
  const [volume,  setVolume]  = useState(0.3);
  const [expanded, setExp]    = useState(false);
  const ctxRef    = useRef(null);
  const soundRef  = useRef({ sources: [], gain: null });

  const stopCurrent = useCallback(() => {
    try {
      soundRef.current.sources.forEach(s => s.stop());
    } catch { /* already stopped */ }
    try { soundRef.current.gain?.disconnect(); } catch { /* ignore */ }
    soundRef.current = { sources: [], gain: null };
  }, []);

  const play = useCallback((soundId, vol) => {
    stopCurrent();
    if (soundId === 'off') return;

    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();

    soundRef.current = buildSound(ctxRef.current, soundId, vol);
  }, [stopCurrent]);

  const handleSelect = (id) => {
    setActive(id);
    play(id, volume);
  };

  const handleVolume = (v) => {
    setVolume(v);
    if (soundRef.current.gain) {
      soundRef.current.gain.gain.setValueAtTime(v, ctxRef.current.currentTime);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => { stopCurrent(); ctxRef.current?.close(); }, [stopCurrent]);

  const current = SOUNDS.find(s => s.id === active) || SOUNDS[0];

  return (
    <div className="fixed bottom-24 left-4 z-40">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            className="mb-2 w-52 card p-4"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}
          >
            <div className="font-mono text-[10px] tracking-widest uppercase text-[rgba(14,165,233,0.6)] mb-3">
              Ambient Sounds
            </div>

            {/* Sound selector */}
            <div className="space-y-1 mb-3">
              {SOUNDS.map(s => (
                <button key={s.id} onClick={() => handleSelect(s.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all ${
                    active === s.id
                      ? 'bg-[rgba(14,165,233,0.15)] border border-[rgba(14,165,233,0.3)]'
                      : 'hover:bg-white/[0.04]'
                  }`}>
                  <span className="text-base flex-shrink-0">{s.emoji}</span>
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${active===s.id?'text-[#0ea5e9]':'text-[rgba(186,230,253,0.6)]'}`}>
                      {s.name}
                    </div>
                  </div>
                  {active === s.id && s.id !== 'off' && (
                    <span className="ml-auto flex gap-0.5">
                      {[1,2,3].map(i=>(
                        <motion.span key={i} className="w-0.5 h-3 rounded-full bg-[#0ea5e9]"
                          animate={{ scaleY: [0.4,1,0.4] }}
                          transition={{ duration:0.8, delay:i*0.15, repeat:Infinity }} />
                      ))}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Volume slider */}
            {active !== 'off' && (
              <div>
                <div className="flex justify-between font-mono text-[9px] text-[rgba(186,230,253,0.3)] mb-1.5">
                  <VolumeX size={10} />
                  <span>{Math.round(volume * 100)}%</span>
                  <Volume2 size={10} />
                </div>
                <input type="range" min="0" max="1" step="0.02" value={volume}
                  onChange={e => handleVolume(parseFloat(e.target.value))}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#0ea5e9' }} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
        onClick={() => setExp(x => !x)}
        className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${
          active !== 'off'
            ? 'border-[rgba(14,165,233,0.4)] bg-[rgba(14,165,233,0.15)] text-[#0ea5e9]'
            : 'border-[rgba(186,230,253,0.08)] bg-[rgba(8,14,26,0.8)] text-[rgba(186,230,253,0.35)] hover:text-[rgba(186,230,253,0.7)]'
        }`}
        title="Ambient sounds"
      >
        <Music2 size={16} />
        {active !== 'off' && (
          <motion.span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] border border-[#010203]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.button>
    </div>
  );
}
