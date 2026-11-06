import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Download,
  Clock,
  Sparkles,
  Info,
  AlertTriangle,
  AlertCircle,
  X,
  Copy,
  Check
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { realtime } from '../services/realtime';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

export function LogsPage() {
  const { currentProject } = useProject();

  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState('ALL'); // 'ALL' | 'INFO' | 'WARN' | 'ERROR'
  const [service, setService] = useState('ALL'); // 'ALL' | 'api' | 'database' | 'storage' | 'auth'
  const [search, setSearch] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const logsEndRef = useRef(null);

  const fetchLogs = async () => {
    if (!currentProject) return;
    try {
      const res = await api.getLogs(currentProject.id, {
        level: level !== 'ALL' ? level : undefined,
        service: service !== 'ALL' ? service : undefined,
        search,
        limit: 100
      });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentProject, level, service]);

  // Real-time log listener
  useEffect(() => {
    if (!currentProject || !isLive) return;

    const unsubscribe = realtime.subscribeLogs(currentProject.id, (newLog) => {
      // Check if new log matches filters
      const matchLevel = level === 'ALL' || newLog.level === level;
      const matchService = service === 'ALL' || newLog.service === service;
      const matchSearch = !search || newLog.message.toLowerCase().includes(search.toLowerCase());

      if (matchLevel && matchService && matchSearch) {
        setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentProject, isLive, level, service, search]);

  const copyLog = (log) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">System Logs & Monitoring</h1>
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> LIVE STREAM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Audit trails, API request status logs, storage mutations, and error tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isLive ? 'primary' : 'outline'}
            icon={isLive ? Pause : Play}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause Stream' : 'Resume Live'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setLogs([])}
          >
            Clear Screen
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search in log messages, paths, codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') fetchLogs(); }}
              className="w-full bg-stratum-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1 bg-stratum-950 p-1 rounded-xl border border-white/5 font-mono text-[11px]">
              {['ALL', 'INFO', 'WARN', 'ERROR'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(lvl)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    level === lvl
                      ? lvl === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                        lvl === 'WARN' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Service Filter */}
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-stratum-950 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Services</option>
              <option value="api">API Gateway</option>
              <option value="database">Database</option>
              <option value="storage">Storage</option>
              <option value="auth">Authentication</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs Stream Table / Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-0 overflow-hidden flex flex-col min-h-[550px]">
          <div className="p-3 border-b border-white/5 bg-stratum-850/40 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Buffer: {logs.length} events</span>
            <span>Target: {currentProject.id}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 font-mono text-xs max-h-[600px]">
            {logs.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                No logs matching filter criteria.
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isError = log.level === 'ERROR' || log.statusCode >= 500;
                const isWarn = log.level === 'WARN' || log.statusCode >= 400;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`px-4 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-200'
                        : 'hover:bg-white/[0.02] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>

                      {/* Level badge */}
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded flex-shrink-0 ${
                        isError ? 'bg-rose-500/20 text-rose-400' :
                        isWarn ? 'bg-amber-500/20 text-amber-400' :
                        'bg-cyan-500/20 text-cyan-400'
                      }`}>
                        {log.level}
                      </span>

                      {/* Method & Status */}
                      <span className="font-bold text-slate-200 flex-shrink-0">
                        {log.method}
                      </span>
                      <span className={`text-[11px] font-bold flex-shrink-0 ${
                        isError ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {log.statusCode}
                      </span>

                      {/* Path / Message */}
                      <span className="truncate text-slate-300 text-[11px]">
                        {log.path || log.message}
                      </span>
                    </div>

                    {/* Latency & Service */}
                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-slate-500">
                      <span>{log.durationMs}ms</span>
                      <span className="uppercase px-1.5 py-0.5 rounded bg-white/5">
                        {log.service}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </Card>

        {/* Selected Log Inspector */}
        <Card className="flex flex-col justify-between p-5 min-h-[550px]">
          {selectedLog ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    LOG INSPECTOR
                  </span>
                  <h3 className="text-sm font-bold text-white mt-1 break-all">
                    {selectedLog.method} {selectedLog.path}
                  </h3>
                </div>
                <button
                  onClick={() => copyLog(selectedLog)}
                  className="p-1.5 rounded-lg bg-stratum-800 text-slate-400 hover:text-white"
                  title="Copy log entry"
                >
                  {copiedId ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Log ID:</span>
                  <span className="text-slate-300">{selectedLog.id}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">HTTP Status:</span>
                  <span className={`font-bold ${selectedLog.statusCode >= 400 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedLog.statusCode}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Duration:</span>
                  <span className="text-slate-300">{selectedLog.durationMs} ms</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Client IP:</span>
                  <span className="text-slate-300">{selectedLog.ip}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">User Agent:</span>
                  <span className="text-slate-300 truncate max-w-[180px]">{selectedLog.userAgent}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Service:</span>
                  <span className="text-slate-300 uppercase">{selectedLog.service}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-300">{new Date(selectedLog.timestamp).toISOString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-semibold block mb-1.5">Raw Log Payload</span>
                <pre className="p-3 rounded-xl bg-stratum-950 border border-white/10 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
              <ScrollText className="w-10 h-10 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-400">No Log Entry Selected</div>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Click on any log event in the stream to inspect exact request duration, caller IP, headers, and payload.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

