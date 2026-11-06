import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  HardDrive,
  Users,
  Compass,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Copy,
  Check,
  Key,
  ShieldAlert,
  Zap,
  Server
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function OverviewPage() {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  const [analytics, setAnalytics] = useState(null);
  const [stats, setStats] = useState({
    documents: 0,
    collections: 0,
    storageBytes: 0,
    files: 0,
    users: 0,
    activeUsers: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;

    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [projDetails, analyticsRes, logsRes] = await Promise.all([
          api.getProject(currentProject.id),
          api.getAnalytics(currentProject.id, '24h'),
          api.getLogs(currentProject.id, { limit: 6 })
        ]);

        if (isMounted) {
          if (projDetails.stats) setStats(projDetails.stats);
          setAnalytics(analyticsRes);
          setRecentLogs(logsRes.logs || []);
        }
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [currentProject]);

  const copyApiKey = () => {
    if (!currentProject?.apiKey) return;
    navigator.clipboard.writeText(currentProject.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (!currentProject) {
    return (
      <div className="py-20 text-center text-slate-400">
        No active project selected. Provision a project from the top bar to get started.
      </div>
    );
  }

  const kpis = [
    {
      title: 'Database Documents',
      value: (stats.documents || 0).toLocaleString(),
      subtext: `${stats.collections || 0} active collections`,
      icon: Database,
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      link: '/database'
    },
    {
      title: 'Cloud Storage Used',
      value: formatBytes(stats.storageBytes),
      subtext: `${stats.files || 0} files stored`,
      icon: HardDrive,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      link: '/storage'
    },
    {
      title: 'Registered Users',
      value: (stats.users || 0).toLocaleString(),
      subtext: `${stats.activeUsers || 0} active accounts`,
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      link: '/auth'
    },
    {
      title: 'API Requests (24h)',
      value: (analytics?.summary?.totalRequests || 482).toLocaleString(),
      subtext: `${analytics?.summary?.avgLatencyMs || 18}ms avg latency`,
      icon: Activity,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      link: '/analytics'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stratum-900 via-stratum-850 to-stratum-900 border border-white/5 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-cyanGlow/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyanGlow/15 text-cyan-300 border border-cyanGlow/25 uppercase">
                {currentProject.plan} Plan
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {currentProject.id}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {currentProject.name}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              {currentProject.description || 'Enterprise-grade serverless backend engine ready for web, mobile, and IoT deployment.'}
            </p>
          </div>

          {/* Quick API Key Pill */}
          <div className="bg-stratum-950/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[280px]">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <Key className="w-3.5 h-3.5 text-cyan-400" /> Live Project API Key
              </span>
              <button
                onClick={copyApiKey}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] font-mono"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 bg-stratum-900 px-3 py-2 rounded-xl truncate border border-white/5 select-all">
              {currentProject.apiKey}
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={idx}
              hover
              onClick={() => navigate(kpi.link)}
              className="cursor-pointer group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="mt-4">
                <div className="text-xs text-slate-400 font-medium">{kpi.title}</div>
                <div className="text-2xl font-bold tracking-tight text-white mt-1">{kpi.value}</div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">{kpi.subtext}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Analytics Chart + Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Traffic Area Chart */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Platform Throughput (24 Hours)</h3>
              <p className="text-xs text-slate-400">Total API calls and database transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="cyan">Real-time Stream</Badge>
            </div>
          </div>

          <div className="h-64 w-full">
            {analytics?.points ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5C0" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00E5C0" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
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
                  <Area type="monotone" dataKey="requests" stroke="#00E5C0" strokeWidth={2} fillOpacity={1} fill="url(#reqGrad)" name="Total Requests" />
                  <Area type="monotone" dataKey="writes" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#writeGrad)" name="DB Writes" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                Loading telemetry stream...
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-white/5 text-center">
            <div>
              <div className="text-[11px] text-slate-400">Error Rate</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {analytics?.summary?.errorRatePercent || '0.00'}%
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Reads</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">
                {(analytics?.summary?.totalReads || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Total Writes</div>
              <div className="text-base font-bold text-indigo-400 mt-0.5">
                {(analytics?.summary?.totalWrites || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Live Operation Logs Stream */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent System Activity</h3>
              <p className="text-xs text-slate-400">Live operational events</p>
            </div>
            <Button size="xs" variant="ghost" onClick={() => navigate('/logs')}>
              View All
            </Button>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500 font-mono">
                No recent activity recorded yet.
              </div>
            ) : (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-stratum-950/70 border border-white/5 text-xs flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        log.method === 'GET' ? 'bg-cyan-500/10 text-cyan-400' :
                        log.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.method === 'DELETE' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.method}
                      </span>
                      <span className="font-mono text-[10px] text-slate-300 truncate max-w-[130px]">
                        {log.path}
                      </span>
                    </div>
                    <span className={`font-mono text-[10px] ${log.statusCode >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {log.statusCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>{log.durationMs}ms</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => navigate('/api-explorer')}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Launch API Explorer</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Quick Launchpad Services */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 font-mono">
          Developer Platform Services
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hover onClick={() => navigate('/database')} className="cursor-pointer space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Database Explorer</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tree-based collection browser, typed document schemas, subcollections, and full-text search.
            </p>
          </Card>

          <Card hover onClick={() => navigate('/storage')} className="cursor-pointer space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Cloud Storage</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Drag-and-drop file uploader, image previews, secure download tokens, and folder structures.
            </p>
          </Card>

          <Card hover onClick={() => navigate('/security')} className="cursor-pointer space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Security Rules Engine</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular server-side permissions for database collections and cloud storage buckets with simulator.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

