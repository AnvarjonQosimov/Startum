import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Save,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Code2,
  Lock,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

const RULE_TEMPLATES = {
  standard: {
    name: 'Public Read / Authenticated Write',
    desc: 'Anyone can query data, but only signed-in users can create or modify documents.',
    rules: {
      version: '2',
      rules: {
        database: {
          "*": {
            read: "true",
            create: "auth != null",
            update: "auth != null && (auth.uid == resource.userId || auth.role == 'admin')",
            delete: "auth != null && auth.role == 'admin'"
          }
        },
        storage: {
          "public/*": { read: "true", write: "auth != null" },
          "users/{userId}/*": { read: "true", write: "auth != null && auth.uid == userId" },
          "*": { read: "true", write: "auth != null && auth.role == 'admin'" }
        }
      }
    }
  },
  strictOwner: {
    name: 'Strict Owner Isolation',
    desc: 'Users can strictly only read and write their own documents and personal storage folder.',
    rules: {
      version: '2',
      rules: {
        database: {
          "*": {
            read: "auth != null && (auth.uid == resource.userId || auth.role == 'admin')",
            write: "auth != null && (auth.uid == resource.userId || auth.role == 'admin')"
          }
        },
        storage: {
          "users/{userId}/*": {
            read: "auth != null && auth.uid == userId",
            write: "auth != null && auth.uid == userId"
          }
        }
      }
    }
  },
  rbacAdmin: {
    name: 'Role-Based Access Control (RBAC)',
    desc: 'Public read for guests, write operations require explicit editor or admin role claims.',
    rules: {
      version: '2',
      rules: {
        database: {
          "*": {
            read: "true",
            create: "auth != null && (auth.role == 'admin' || auth.role == 'editor')",
            update: "auth != null && (auth.role == 'admin' || auth.role == 'editor')",
            delete: "auth != null && auth.role == 'admin'"
          }
        },
        storage: {
          "*": {
            read: "true",
            write: "auth != null && auth.role == 'admin'"
          }
        }
      }
    }
  },
  openDev: {
    name: 'Open Development (Testing Only)',
    desc: 'Completely unauthenticated read and write access across all collections and files.',
    rules: {
      version: '2',
      rules: {
        database: {
          "*": { read: "true", write: "true" }
        },
        storage: {
          "*": { read: "true", write: "true" }
        }
      }
    }
  }
};

export function SecurityRulesPage() {
  const { currentProject } = useProject();

  const [rawRulesText, setRawRulesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Simulator State
  const [testExpression, setTestExpression] = useState("auth != null && auth.role == 'admin'");
  const [mockAuthInput, setMockAuthInput] = useState('{\n  "uid": "usr_alpha_99",\n  "email": "developer@stratum.dev",\n  "role": "admin"\n}');
  const [mockResourceInput, setMockResourceInput] = useState('{\n  "userId": "usr_alpha_99",\n  "status": "PUBLISHED"\n}');
  const [simResult, setSimResult] = useState(null);

  useEffect(() => {
    if (!currentProject) return;

    async function loadRules() {
      try {
        setLoading(true);
        const res = await api.getRules(currentProject.id);
        setRawRulesText(JSON.stringify(res.rules, null, 2));
      } catch (err) {
        console.error('Error loading rules:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRules();
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject) return;
    try {
      setSaving(true);
      const parsed = JSON.parse(rawRulesText);
      await api.saveRules(currentProject.id, parsed);
      alert('Security rules successfully published to edge cluster!');
    } catch (err) {
      alert(`Invalid rules syntax: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = (tplKey) => {
    const tpl = RULE_TEMPLATES[tplKey];
    if (!tpl) return;
    if (confirm(`Apply template "${tpl.name}"? Current rules will be replaced.`)) {
      setRawRulesText(JSON.stringify(tpl.rules, null, 2));
    }
  };

  const handleRunSimulation = async () => {
    if (!currentProject || !testExpression.trim()) return;
    try {
      let authMock = null;
      let resMock = {};

      if (mockAuthInput.trim()) authMock = JSON.parse(mockAuthInput);
      if (mockResourceInput.trim()) resMock = JSON.parse(mockResourceInput);

      const res = await api.testRule(currentProject.id, {
        ruleExpression: testExpression.trim(),
        authMock,
        resourceMock: resMock
      });

      setSimResult(res);
    } catch (err) {
      setSimResult({ allowed: false, error: err.message });
    }
  };

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Security Rules Engine</h1>
            <p className="text-xs text-slate-400">
              Zero-trust server-side authorization definitions protecting databases and file storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={Save}
            loading={saving}
            onClick={handleSave}
          >
            Publish Rules
          </Button>
        </div>
      </div>

      {/* Preset Templates Quick Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(RULE_TEMPLATES).map(([key, tpl]) => (
          <Card
            key={key}
            hover
            onClick={() => handleApplyTemplate(key)}
            className="cursor-pointer p-3 space-y-1"
          >
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>{tpl.name}</span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
              {tpl.desc}
            </p>
          </Card>
        ))}
      </div>

      {/* Main 2-Pane: Editor & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Left Pane: Rules Editor (7 cols) */}
        <Card className="lg:col-span-7 flex flex-col p-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-cyan-400" /> Active Rules Definition
            </span>
            <span className="text-[11px] font-mono text-slate-500">JSON Schema v2.0</span>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              rows={22}
              value={rawRulesText}
              onChange={(e) => setRawRulesText(e.target.value)}
              className="w-full flex-1 bg-stratum-950 border border-white/10 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
            />
          </div>
        </Card>

        {/* Right Pane: Live Rule Simulator (5 cols) */}
        <Card className="lg:col-span-5 flex flex-col justify-between p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Play className="w-4 h-4 text-purple-400" /> Rule Simulator
              </span>
              <Badge variant="indigo">Edge Evaluator</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  Rule Expression to Evaluate
                </label>
                <input
                  type="text"
                  value={testExpression}
                  onChange={(e) => setTestExpression(e.target.value)}
                  className="w-full bg-stratum-950 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  Mock Authentication Token (auth)
                </label>
                <textarea
                  rows={4}
                  value={mockAuthInput}
                  onChange={(e) => setMockAuthInput(e.target.value)}
                  className="w-full bg-stratum-950 border border-white/10 rounded-xl p-2.5 font-mono text-xs text-slate-300 resize-none focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase font-bold mb-1">
                  Mock Document / Resource (resource)
                </label>
                <textarea
                  rows={4}
                  value={mockResourceInput}
                  onChange={(e) => setMockResourceInput(e.target.value)}
                  className="w-full bg-stratum-950 border border-white/10 rounded-xl p-2.5 font-mono text-xs text-slate-300 resize-none focus:outline-none focus:border-cyan-400"
                />
              </div>

              <Button
                variant="primary"
                icon={Play}
                size="sm"
                className="w-full justify-center mt-2"
                onClick={handleRunSimulation}
              >
                Run Test Simulation
              </Button>
            </div>
          </div>

          {/* Simulation Result Box */}
          {simResult && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-mono ${
              simResult.allowed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {simResult.allowed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {simResult.allowed ? 'PERMISSION ALLOWED' : 'PERMISSION DENIED'}
                </div>
                <div className="text-[11px] mt-0.5 opacity-80">
                  {simResult.allowed
                    ? 'Evaluated expression returned true.'
                    : simResult.error || 'Expression condition returned false.'}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

