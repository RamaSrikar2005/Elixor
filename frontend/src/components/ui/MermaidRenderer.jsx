/**
 * MermaidRenderer — renders Mermaid.js diagram syntax into SVG.
 * Lazy-loads the mermaid library to keep initial bundle small.
 * Supports: flowchart, sequence, class, er, gantt, mindmap, state, etc.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, ZoomIn, ZoomOut, Copy, CheckCheck } from 'lucide-react';

let _mermaid = null;
let _initId   = 0;

async function getMermaid() {
  if (_mermaid) return _mermaid;
  const m = await import('mermaid');
  _mermaid = m.default;
  _mermaid.initialize({
    startOnLoad: false,
    theme:       'dark',
    darkMode:    true,
    fontFamily:  'JetBrains Mono, monospace',
    themeVariables: {
      primaryColor:       '#0ea5e9',
      primaryTextColor:   '#bae6fd',
      primaryBorderColor: '#0284c7',
      lineColor:          '#38bdf8',
      secondaryColor:     '#0f172a',
      tertiaryColor:      '#1e293b',
      background:         '#020617',
      mainBkg:            '#0f172a',
      nodeBorder:         '#0ea5e9',
      clusterBkg:         '#1e293b',
      titleColor:         '#f0f9ff',
      edgeLabelBackground:'#0f172a',
      activeTaskBkgColor: '#0ea5e9',
      activeTaskBorderColor:'#7c3aed',
    },
  });
  return _mermaid;
}

export default function MermaidRenderer({ code, title }) {
  const [svg,     setSvg]     = useState(null);
  const [error,   setError]   = useState(null);
  const [zoom,    setZoom]    = useState(1);
  const [copied,  setCopied]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let cancelled = false;

    const render = async () => {
      try {
        const m   = await getMermaid();
        const id  = `mmd-${++_initId}`;
        const out = await m.render(id, code.trim());
        if (!cancelled) { setSvg(out.svg); setLoading(false); }
      } catch (e) {
        if (!cancelled) { setError(e.message || 'Render failed'); setLoading(false); }
      }
    };

    render();
    return () => { cancelled = true; };
  }, [code]);

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadSvg = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${title || 'diagram'}.svg` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden border border-[rgba(14,165,233,0.15)]"
      style={{ background: 'rgba(4,8,15,0.9)' }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(14,165,233,0.08)]">
        <div className="font-mono text-[10px] text-[rgba(14,165,233,0.6)] uppercase tracking-widest">
          ⬡ {title || 'Diagram'}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))}
            className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
            <ZoomOut size={11} />
          </button>
          <span className="font-mono text-[9px] text-[rgba(186,230,253,0.3)] w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
            className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
            <ZoomIn size={11} />
          </button>
          <button onClick={copyCode}
            className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
            {copied ? <CheckCheck size={11} className="text-[#10b981]" /> : <Copy size={11} />}
          </button>
          {svg && (
            <button onClick={downloadSvg}
              className="p-1.5 rounded-lg bg-white/[0.04] text-[rgba(186,230,253,0.4)] hover:text-white transition-colors">
              <Download size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Diagram area */}
      <div className="overflow-auto p-4" style={{ maxHeight: 480 }}>
        {loading && (
          <div className="flex items-center justify-center h-24 gap-2 font-mono text-xs text-[rgba(186,230,253,0.3)]">
            <div className="w-3 h-3 rounded-full border-2 border-[#0ea5e9] border-t-transparent animate-spin" />
            Rendering diagram…
          </div>
        )}
        {error && (
          <div className="p-3">
            <div className="font-mono text-xs text-[#f43f5e] mb-2">⚠ Render error: {error}</div>
            <pre className="font-mono text-[10px] text-[rgba(186,230,253,0.4)] whitespace-pre-wrap">{code}</pre>
          </div>
        )}
        {svg && !loading && (
          <div
            dangerouslySetInnerHTML={{ __html: svg }}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'inline-block', transition: 'transform 0.2s ease' }}
          />
        )}
      </div>
    </motion.div>
  );
}

/** Detect Mermaid code blocks in AI response text */
export function parseMermaidBlocks(text) {
  const parts = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    // Infer title from first line of diagram
    const firstLine = match[1].trim().split('\n')[0];
    const title = firstLine.includes('graph') ? 'Flowchart'
      : firstLine.includes('sequence') ? 'Sequence Diagram'
      : firstLine.includes('class') ? 'Class Diagram'
      : firstLine.includes('gantt') ? 'Gantt Chart'
      : firstLine.includes('er') ? 'ER Diagram'
      : firstLine.includes('mindmap') ? 'Mind Map'
      : 'Diagram';
    parts.push({ type: 'mermaid', content: match[1].trim(), title });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
}
