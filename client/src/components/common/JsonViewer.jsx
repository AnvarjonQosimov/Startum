import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

export function JsonViewer({ data, level = 0, initialExpanded = true }) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (val) => {
    if (val === null) return <span className="text-slate-500 italic">null</span>;
    if (val === undefined) return <span className="text-slate-500 italic">undefined</span>;

    const type = typeof val;
    if (type === 'string') {
      return <span className="text-emerald-400">"{val}"</span>;
    }
    if (type === 'number') {
      return <span className="text-amber-400">{val}</span>;
    }
    if (type === 'boolean') {
      return <span className="text-purple-400 font-semibold">{val ? 'true' : 'false'}</span>;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="text-slate-400">[]</span>;
      return <JsonViewer data={val} level={level + 1} initialExpanded={level < 2} />;
    }
    if (type === 'object') {
      if (Object.keys(val).length === 0) return <span className="text-slate-400">{'{}'}</span>;
      return <JsonViewer data={val} level={level + 1} initialExpanded={level < 2} />;
    }
    return <span className="text-slate-300">{String(val)}</span>;
  };

  const isObject = typeof data === 'object' && data !== null;
  const isArray = Array.isArray(data);
  const keys = isObject ? Object.keys(data) : [];

  if (!isObject) {
    return <div className="font-mono text-xs">{renderValue(data)}</div>;
  }

  return (
    <div className={`font-mono text-xs leading-relaxed ${level === 0 ? 'bg-stratum-950/80 p-3 rounded-xl border border-white/5 relative group' : ''}`}>
      {level === 0 && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-stratum-800 border border-white/10 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy raw JSON"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}

      <div className="flex items-center gap-1 cursor-pointer select-none py-0.5 text-slate-400 hover:text-slate-200" onClick={() => setExpanded(!expanded)}>
        {keys.length > 0 && (
          expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        )}
        <span className="text-slate-500">{isArray ? `Array(${keys.length})` : `Object {${keys.length}}`}</span>
      </div>

      {expanded && (
        <div className="pl-4 border-l border-white/5 space-y-0.5 mt-0.5">
          {keys.map((k) => (
            <div key={k} className="flex items-start gap-1.5 flex-wrap">
              <span className="text-cyan-400/90 font-medium">{isArray ? k : `"${k}"`}:</span>
              <div className="flex-1 min-w-0">{renderValue(data[k])}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

