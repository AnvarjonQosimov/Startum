import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  Database,
  HardDrive,
  Users,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function AnalyticsPage() {
  const { currentProject } = useProject();

  const [timeframe, setTimeframe] = useState('7d'); // '24h' | '7d' | '30d'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;

    let isMounted = true;
    async function loadMetrics() {
      try {
        setLoading(true);
        const res = await api.getAnalytics(currentProject.id, timeframe);
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMetrics();
    return () => { isMounted = false; };
  }, [currentProject, timeframe]);

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  const summary = data?.summary || {
    totalRequests: 0,
    totalErrors: 0,
    totalReads: 0,
    totalWrites: 0,
    avgLatencyMs: 0,
    errorRatePercent: 0
  };

  return (
    <div className="space-y-6">
      {/* Header with Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Performance & Analytics</h1>
            <p className="text-xs text-slate-400">
              Real-time telemetry, transaction volumes, response latency percentiles, and error rate tracking.
            </p>
          </div>
        </div>

        {/* Timeframe Picker */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stratum-900 border border-white/10 text-xs font-mono">
          {[
            { id: '24h', label: '24 Hours' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeframe === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Sums Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Total API Requests</div>
          <div className="text-xl font-bold text-white mt-1">
            {summary.totalRequests.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">Normal Volume</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Database Reads</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {summary.totalReads.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">78% of total traffic</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Database Writes</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">
            {summary.totalWrites.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">22% of total traffic</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Average Latency</div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {summary.avgLatencyMs} ms
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-1">p95 &lt; 45ms</div>
        </Card>

        <Card className="p-4">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Error Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {summary.errorRatePercent}%
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">{summary.totalErrors} failed calls</div>
        </Card>
      </div>

      {/* Chart 1: Request Volumes & Read/Write Ratio */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">API & Database Throughput</h3>
            <p className="text-xs text-slate-400">Total requests broken down by reads and write operations</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Reads
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> Writes
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {data?.points ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5C0" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00E5C0" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0C111C',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="reads" stroke="#00E5C0" strokeWidth={2} fillOpacity={1} fill="url(#readGrad)" name="Reads" />
                <Area type="monotone" dataKey="writes" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#writeGrad)" name="Writes" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              Aggregating metrics...
            </div>
          )}
        </div>
      </Card>

      {/* 2-Grid Charts: Latency Trends & Bandwidth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Latency Bar Chart */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Average Response Latency (ms)</h3>
              <p className="text-xs text-slate-400">Server response time distribution</p>
            </div>
            <Badge variant="amber">Performance</Badge>
          </div>

          <div className="h-60 w-full">
            {data?.points && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0C111C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="avgLatencyMs" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Avg Latency (ms)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Network Transfer / Bandwidth Line Chart */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Egress Bandwidth</h3>
              <p className="text-xs text-slate-400">Estimated data transfer bytes</p>
            </div>
            <Badge variant="indigo">Network</Badge>
          </div>

          <div className="h-60 w-full">
            {data?.points && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} tickFormatter={(v) => formatBytes(v)} />
                  <Tooltip
                    formatter={(v) => formatBytes(v)}
                    contentStyle={{
                      backgroundColor: '#0C111C',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  />
                  <Line type="monotone" dataKey="bandwidthBytes" stroke="#818CF8" strokeWidth={2} dot={{ r: 2 }} name="Bandwidth" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

