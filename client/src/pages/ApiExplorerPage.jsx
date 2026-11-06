import React, { useState, useEffect } from 'react';
import {
  Compass,
  Send,
  Copy,
  Check,
  Code2,
  Clock,
  HardDrive,
  FileCode,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { JsonViewer } from '../components/common/JsonViewer';

export function ApiExplorerPage() {
  const { currentProject } = useProject();

  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('');
  const [requestBody, setRequestBody] = useState('{\n  \n}');
  const [headers, setHeaders] = useState([
    { key: 'Content-Type', value: 'application/json' },
    { key: 'x-api-key', value: '' }
  ]);

  const [activeTab, setActiveTab] = useState('body'); // 'body' | 'headers' | 'snippets'
  const [snippetLang, setSnippetLang] = useState('js-sdk'); // 'js-sdk' | 'curl' | 'fetch' | 'python'

  // Response state
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Set default path and API key when project loads
  useEffect(() => {
    if (currentProject) {
      setPath(`/db/products`);
      setHeaders([
        { key: 'Content-Type', value: 'application/json' },
        { key: 'x-api-key', value: currentProject.apiKey }
      ]);
    }
  }, [currentProject]);

  // Pre-configured endpoint templates
  const presets = [
    { label: 'Query DB Collection (GET)', method: 'GET', path: '/db/products?limit=10', body: '' },
    { label: 'Create Document (POST)', method: 'POST', path: '/db/products', body: '{\n  "title": "Quantum Precision Gaming Mouse",\n  "price": 129.99,\n  "inStock": true,\n  "tags": ["gaming", "wireless"]\n}' },
    { label: 'List Cloud Storage Files (GET)', method: 'GET', path: '/storage/files?folder=/', body: '' },
    { label: 'End-User Sign In (POST)', method: 'POST', path: '/auth/signin', body: '{\n  "email": "alex.chen@cybertech.io",\n  "password": "Password123!"\n}' },
    { label: 'Check Security Rules (GET)', method: 'GET', path: '/security/rules', body: '' }
  ];

  const handleApplyPreset = (preset) => {
    setMethod(preset.method);
    setPath(preset.path);
    if (preset.body) {
      setRequestBody(preset.body);
      setActiveTab('body');
    }
  };

  const handleSendRequest = async () => {
    if (!currentProject || !path) return;
    setLoading(true);
    setResponse(null);

    const fullUrl = `/api/v1/projects/${currentProject.id}${path.startsWith('/') ? path : '/' + path}`;
    const headerObj = {};
    headers.forEach(h => {
      if (h.key && h.value) headerObj[h.key] = h.value;
    });

    const options = {
      method,
      headers: headerObj
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim()) {
      options.body = requestBody;
    }

    const start = performance.now();
    try {
      const res = await fetch(fullUrl, options);
      const latencyMs = Math.round(performance.now() - start);

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      const sizeBytes = new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;

      setResponse({
        status: res.status,
        statusText: res.statusText || (res.status === 200 ? 'OK' : ''),
        latencyMs,
        sizeBytes,
        data,
        headers: Object.fromEntries(res.headers.entries())
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      setResponse({
        status: 500,
        statusText: 'Client Request Error',
        latencyMs,
        sizeBytes: 0,
        data: { error: err.message }
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate code snippet
  const getCodeSnippet = () => {
    if (!currentProject) return '';
    const fullUrl = `${window.location.origin}/api/v1/projects/${currentProject.id}${path}`;

    if (snippetLang === 'js-sdk') {
      return `import { initializeApp, getDatabase, getDocs, collection } from "stratum-sdk";

const app = initializeApp({
  projectId: "${currentProject.id}",
  apiKey: "${currentProject.apiKey}"
});

const db = getDatabase(app);
const snapshot = await getDocs(collection(db, "${path.replace(/^\/db\//, '').split('?')[0]}"));
console.log(snapshot);`;
    }

    if (snippetLang === 'curl') {
      const hasBody = ['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim();
      return `curl -X ${method} "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentProject.apiKey}"${hasBody ? ` \\\n  -d '${requestBody.replace(/\n/g, ' ')}'` : ''}`;
    }

    if (snippetLang === 'fetch') {
      return `const response = await fetch("${fullUrl}", {
  method: "${method}",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${currentProject.apiKey}"
  }${['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim() ? `,\n  body: JSON.stringify(${requestBody})` : ''}
});

const data = await response.json();
console.log(data);`;
    }

    if (snippetLang === 'python') {
      return `import requests

url = "${fullUrl}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${currentProject.apiKey}"
}
${['POST', 'PUT', 'PATCH'].includes(method) && requestBody.trim() ? `payload = ${requestBody}\nresponse = requests.${method.toLowerCase()}(url, json=payload, headers=headers)` : `response = requests.${method.toLowerCase()}(url, headers=headers)`}

print(response.status_code)
print(response.json())`;
    }

    return '';
  };

  const copyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Interactive API Explorer</h1>
            <p className="text-xs text-slate-400">
              Test project endpoints, inspect live payloads, evaluate response headers, and generate client SDK code.
            </p>
          </div>
        </div>

        {/* Quick Presets Picker */}
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => {
              const selected = presets.find(p => p.label === e.target.value);
              if (selected) handleApplyPreset(selected);
            }}
            className="px-3 py-1.5 rounded-xl bg-stratum-900 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="">⚡ Quick Endpoint Presets...</option>
            {presets.map((p, idx) => (
              <option key={idx} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Request Builder Bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-stretch gap-2 font-mono text-xs">
          {/* Method selector */}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`px-3 py-2.5 rounded-xl font-bold text-center border focus:outline-none ${
              method === 'GET' ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30' :
              method === 'POST' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' :
              method === 'PUT' ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' :
              method === 'DELETE' ? 'bg-rose-500/15 text-rose-300 border-rose-400/30' :
              'bg-slate-800 text-slate-300 border-white/10'
            }`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          {/* URL Input */}
          <div className="flex-1 flex items-center bg-stratum-950 border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus-within:border-cyan-400">
            <span className="text-slate-500 select-none mr-1.5 truncate hidden sm:inline">
              /api/v1/projects/{currentProject.id}
            </span>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendRequest(); }}
              placeholder="/db/collection_name"
              className="w-full bg-transparent text-slate-100 focus:outline-none"
            />
          </div>

          {/* Send Button */}
          <Button
            variant="primary"
            icon={Send}
            onClick={handleSendRequest}
            loading={loading}
            className="sm:w-36 justify-center"
          >
            Send Request
          </Button>
        </div>
      </Card>

      {/* 2-Pane: Request Configuration & Live Response */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* Left Pane: Request Details (Tabs: Body, Headers, Snippets) */}
        <Card className="flex flex-col p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('body')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'body'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Request Body
              </button>
              <button
                onClick={() => setActiveTab('headers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'headers'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Headers ({headers.length})
              </button>
              <button
                onClick={() => setActiveTab('snippets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'snippets'
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Code Snippets
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            {activeTab === 'body' && (
              <div className="flex-1 flex flex-col">
                <div className="text-[11px] text-slate-400 font-mono mb-2">
                  JSON payload (Sent with POST, PUT, PATCH):
                </div>
                <textarea
                  rows={14}
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  className="w-full flex-1 bg-stratum-950 border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'headers' && (
              <div className="space-y-3 font-mono text-xs">
                {headers.map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Header Key"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[i].key = e.target.value;
                        setHeaders(copy);
                      }}
                      className="w-1/2 bg-stratum-950 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200"
                    />
                    <input
                      type="text"
                      placeholder="Header Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[i].value = e.target.value;
                        setHeaders(copy);
                      }}
                      className="w-1/2 bg-stratum-950 border border-white/10 rounded-lg px-3 py-1.5 text-slate-200"
                    />
                  </div>
                ))}
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setHeaders([...headers, { key: '', value: '' }])}
                >
                  + Add Header
                </Button>
              </div>
            )}

            {activeTab === 'snippets' && (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {['js-sdk', 'curl', 'fetch', 'python'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSnippetLang(lang)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase ${
                          snippetLang === lang
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {lang === 'js-sdk' ? 'Stratum SDK' : lang}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="flex-1 p-3.5 rounded-xl bg-stratum-950 border border-white/10 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-all">
                  {getCodeSnippet()}
                </pre>
              </div>
            )}
          </div>
        </Card>

        {/* Right Pane: Live Response Viewer */}
        <Card className="flex flex-col p-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Response
            </span>

            {response && (
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className={`px-2 py-0.5 rounded-md font-bold ${
                  response.status < 300 ? 'bg-emerald-500/20 text-emerald-400' :
                  response.status < 500 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-rose-500/20 text-rose-400'
                }`}>
                  {response.status} {response.statusText}
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" /> {response.latencyMs}ms
                </span>
                <span className="text-slate-500">
                  {(response.sizeBytes / 1024).toFixed(2)} KB
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500 font-mono">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
                Executing cloud request...
              </div>
            ) : response ? (
              <div className="space-y-4">
                <JsonViewer data={response.data} initialExpanded={true} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-500">
                <Compass className="w-10 h-10 text-slate-600 mb-3" />
                <div className="text-sm font-semibold text-slate-400">Awaiting Request</div>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  Choose an endpoint above and click "Send Request" to inspect the live response.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

