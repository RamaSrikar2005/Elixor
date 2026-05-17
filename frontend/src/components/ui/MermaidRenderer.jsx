/**
 * MermaidRenderer — bullet-proof Mermaid diagram engine.
 *
 * ROOT CAUSE FIX: Mermaid v11 RESOLVES (not rejects) with an error-bomb SVG
 * when syntax is invalid. Our previous try/catch never fired.
 *
 * The fix: after m.render() resolves, inspect the SVG for Mermaid's
 * internal error markers. If found, throw manually → triggers our
 * sanitization + fallback pipeline.
 *
 * Pipeline:
 *   Attempt 0 — raw code
 *   Attempt 1 — sanitized (emoji strip, graph→flowchart, etc.)
 *   Attempt 2 — bare-bones (strip all labels, keep only structure)
 *   Attempt 3 — show raw code + Retry button (NEVER show the bomb)
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ZoomIn, ZoomOut, Copy, CheckCheck, RefreshCw, Maximize2, Code2 } from 'lucide-react';

/* ─── Singleton Mermaid instance ────────────────────────────── */
let _mermaid = null;
let _initId  = 0;

async function getMermaid() {
  if (_mermaid) return _mermaid;
  const m   = await import('mermaid');
  _mermaid  = m.default;
  _mermaid.initialize({
    startOnLoad:   false,
    theme:         'dark',
    darkMode:      true,
    fontFamily:    'JetBrains Mono, monospace',
    securityLevel: 'loose',
    suppressErrorRendering: true,   // v11: stop bomb SVGs appearing in DOM
    themeVariables: {
      primaryColor:        '#0ea5e9',
      primaryTextColor:    '#bae6fd',
      primaryBorderColor:  '#0284c7',
      lineColor:           '#38bdf8',
      secondaryColor:      '#0f172a',
      tertiaryColor:       '#1e293b',
      background:          '#020617',
      mainBkg:             '#0f172a',
      nodeBorder:          '#0ea5e9',
      clusterBkg:          '#1e293b',
      titleColor:          '#f0f9ff',
      edgeLabelBackground: '#0f172a',
    },
  });
  return _mermaid;
}

/* ─── Detect Mermaid error SVGs ──────────────────────────────
   Mermaid v11 resolves with an error SVG instead of throwing.
   We detect these and convert them into thrown errors.           */
function isErrorSvg(svg) {
  if (!svg || typeof svg !== 'string') return true;
  return (
    svg.includes('Syntax error') ||
    svg.includes('error-icon') ||
    svg.includes('classDef error') ||
    svg.includes('Parse error') ||
    svg.includes('Lexical error') ||
    (svg.includes('💣') || svg.includes('💣'))  // bomb emoji
  );
}

/* ─── Sanitization passes ────────────────────────────────────── */
function stripEmojis(str) {
  return str
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/️/gu, '');
}

function normalizeQuotes(s) {
  return s.replace(/['']/g, "'").replace(/[""]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...');
}

function upgradeGraphKeyword(code) {
  return code
    .replace(/^graph\s+TD\b/im,  'flowchart TD')
    .replace(/^graph\s+LR\b/im,  'flowchart LR')
    .replace(/^graph\s+RL\b/im,  'flowchart RL')
    .replace(/^graph\s+BT\b/im,  'flowchart BT')
    .replace(/^graph\s+TB\b/im,  'flowchart TB');
}

function sanitizeLabels(code) {
  return code
    .replace(/(\[|\(|\{)([^\]\)\}]+)(\]|\)|\})/g, (_, open, content, close) => {
      const clean = stripEmojis(content)
        .replace(/[&<>"]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'node';
      return `${open}${clean}${close}`;
    })
    .replace(/\|([^|]+)\|/g, (_, label) => {
      const clean = stripEmojis(label).replace(/[&<>"]/g, ' ').replace(/\s+/g, ' ').trim() || 'yes';
      return `|${clean}|`;
    });
}

function removeInlineCode(code) {
  return code.replace(/`([^`]+)`/g, (_, inner) => inner.replace(/[[\]{}()|&<>"]/g, ''));
}

function fixCommonSyntax(code) {
  return code
    .replace(/--\s*>/g, '-->')       // spaces in arrows
    .replace(/<\s*--/g, '<--')
    .replace(/\.\.\s*>/g, '..>')
    .replace(/={2,3}>/g, '==>')
    .replace(/#{1,6}\s/gm, '')       // markdown headers inside code
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1');    // italic
}

export function sanitizeMermaid(raw) {
  let code = raw.trim();
  code = normalizeQuotes(code);
  code = upgradeGraphKeyword(code);
  code = removeInlineCode(code);
  code = fixCommonSyntax(code);
  code = sanitizeLabels(code);
  code = code.split('\n').map(l => l.trimEnd()).join('\n');
  return code;
}

function stripToBareBones(code) {
  const lines  = code.split('\n');
  const header = lines[0].match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|gantt|pie|mindmap|journey|gitGraph)/i)
    ? lines[0] : 'flowchart TD';
  const bare   = lines.slice(1)
    .filter(l => l.trim() && !l.trim().startsWith('%') && !l.trim().startsWith('%%'))
    .map(l => l
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\|[^|]*\|/g, '')
      .replace(/:::[\w-]+/g, '')
      .trim()
    )
    .filter(l => l && l !== '-->');
  return [header, ...bare].join('\n');
}

/* ─── Pre-validation ─────────────────────────────────────────── */
function isLikelyValid(code) {
  if (!code || code.trim().length < 5) return false;
  const first = code.trim().split('\n')[0].trim().toLowerCase();
  const validStarters = ['flowchart', 'graph', 'sequence', 'class', 'state', 'gantt', 'pie', 'mindmap', 'journey', 'git', 'er', 'block', 'xychart', 'timeline'];
  return validStarters.some(s => first.startsWith(s));
}

/* ─── Component ───────────────────────────────────────────────── */
export default function MermaidRenderer({ code, title }) {
  const [svg,       setSvg]      = useState(null);
  const [error,     setError]    = useState(null);
  const [zoom,      setZoom]     = useState(1);
  const [copied,    setCopied]   = useState(false);
  const [loading,   setLoading]  = useState(true);
  const [retries,   setRetries]  = useState(0);
  const [fullscreen,setFs]       = useState(false);
  const [showRaw,   setShowRaw]  = useState(false);

  useEffect(() => {
    if (!code?.trim()) { setError('Empty diagram'); setLoading(false); return; }
    setLoading(true); setError(null); setSvg(null); setShowRaw(false);
    let cancelled = false;

    const tryRender = async (source, attempt = 0) => {
      if (cancelled) return;

      // Basic validity check before hitting Mermaid at all
      if (attempt === 0 && !isLikelyValid(source)) {
        const sanitized = sanitizeMermaid(source);
        return tryRender(sanitized, 1);
      }

      try {
        const m   = await getMermaid();
        const id  = `mmd-${++_initId}-${Date.now()}`;
        const out = await m.render(id, source);

        // ← KEY FIX: Mermaid v11 returns error-bomb SVG without throwing.
        //   We detect it here and convert to a real error to trigger retries.
        if (isErrorSvg(out?.svg)) {
          throw new Error('Mermaid returned error SVG');
        }

        if (!cancelled) { setSvg(out.svg); setLoading(false); }
      } catch {
        if (cancelled) return;
        if (attempt === 0) {
          const sanitized = sanitizeMermaid(source);
          return tryRender(sanitized, 1);
        }
        if (attempt === 1) {
          const bare = stripToBareBones(sanitizeMermaid(source));
          return tryRender(bare, 2);
        }
        // All attempts exhausted — show graceful fallback, NEVER the bomb
        setError('Diagram could not be rendered');
        setLoading(false);
      }
    };

    tryRender(code.trim());
    return () => { cancelled = true; };
  }, [code, retries]);

  const copyCode = () => {
    navigator.clipboard.writeText(code || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${title || 'diagram'}.svg` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const diagramTitle = title || inferTitle(code || '');

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl overflow-hidden border border-[rgba(14,165,233,0.15)] ${fullscreen ? 'fixed inset-4 z-[9000] flex flex-col' : ''}`}
        style={{ background: 'rgba(4,8,15,0.95)' }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(14,165,233,0.08)] flex-shrink-0">
          <div className="font-mono text-[10px] text-[rgba(14,165,233,0.6)] uppercase tracking-widest flex items-center gap-2">
            <span>⬡</span>
            {diagramTitle}
            {loading && <span className="w-3 h-3 rounded-full border border-[#0ea5e9] border-t-transparent animate-spin"/>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors"><ZoomOut size={11}/></button>
            <span className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] w-8 text-center">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors"><ZoomIn size={11}/></button>
            <button onClick={() => setZoom(1)}
              className="px-1.5 py-1 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.3)] hover:text-white transition-colors font-mono text-[9px]">1:1</button>
            <button onClick={() => setShowRaw(r => !r)}
              className={`p-1.5 rounded-lg bg-white/[0.04] transition-colors ${showRaw ? 'text-[#0ea5e9]' : 'text-[rgba(186,230,253,0.4)] hover:text-white'}`}>
              <Code2 size={11}/></button>
            <button onClick={copyCode}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
              {copied ? <CheckCheck size={11} className="text-[#10b981]"/> : <Copy size={11}/>}</button>
            {svg && <button onClick={downloadSvg}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors"><Download size={11}/></button>}
            <button onClick={() => setFs(f => !f)}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors"><Maximize2 size={11}/></button>
          </div>
        </div>

        {/* Content */}
        <div className={`overflow-auto p-4 ${fullscreen ? 'flex-1' : ''}`} style={{ maxHeight: fullscreen ? undefined : 520 }}>

          {loading && (
            <div className="flex flex-col items-center justify-center h-28 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 rounded-full border-2 border-[rgba(14,165,233,0.2)] border-t-[#0ea5e9]"/>
              <span className="font-mono text-xs text-[rgba(186,230,253,0.3)]">Rendering diagram…</span>
            </div>
          )}

          {/* Graceful error — no bomb, no raw Mermaid text */}
          {error && !loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)]">
                <div className="font-mono text-xs text-[#f59e0b]">⚠ Diagram preview unavailable</div>
                <button onClick={() => setRetries(r => r + 1)}
                  className="flex items-center gap-1.5 font-mono text-[10px] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors px-2 py-1 rounded-lg border border-white/[0.06]">
                  <RefreshCw size={10}/> Retry
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-white/[0.06]">
                <div className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] uppercase tracking-widest mb-2">Mermaid source</div>
                <pre className="font-mono text-[10px] text-[rgba(186,230,253,0.55)] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-48">{code}</pre>
              </div>
            </div>
          )}

          {/* Raw code toggle */}
          {showRaw && !error && (
            <pre className="font-mono text-[10px] text-[rgba(186,230,253,0.55)] whitespace-pre-wrap leading-relaxed overflow-x-auto mb-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">{code}</pre>
          )}

          {/* Rendered SVG */}
          {svg && !loading && !showRaw && (
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block', transition: 'transform 0.2s ease' }}
            />
          )}
          {svg && !loading && showRaw && (
            <div
              dangerouslySetInnerHTML={{ __html: svg }}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block', transition: 'transform 0.2s ease', marginTop: '0.75rem' }}
            />
          )}
        </div>
      </motion.div>

      {fullscreen && <div className="fixed inset-0 bg-black/80 z-[8999] backdrop-blur-sm" onClick={() => setFs(false)}/>}
    </>
  );
}

function inferTitle(code) {
  const f = code.trim().split('\n')[0].toLowerCase();
  if (f.includes('flowchart') || f.includes('graph'))  return 'Flowchart';
  if (f.includes('sequence'))  return 'Sequence Diagram';
  if (f.includes('class'))     return 'Class Diagram';
  if (f.includes('gantt'))     return 'Gantt Chart';
  if (f.includes('er'))        return 'ER Diagram';
  if (f.includes('mindmap'))   return 'Mind Map';
  if (f.includes('pie'))       return 'Pie Chart';
  if (f.includes('journey'))   return 'User Journey';
  if (f.includes('state'))     return 'State Diagram';
  if (f.includes('git'))       return 'Git Graph';
  if (f.includes('timeline'))  return 'Timeline';
  return 'Diagram';
}

export function parseMermaidBlocks(text) {
  const parts = [];
  const regex = /```mermaid\r?\n([\s\S]*?)```/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    const raw = match[1].trim();
    parts.push({ type: 'mermaid', content: raw, title: inferTitle(raw) });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
