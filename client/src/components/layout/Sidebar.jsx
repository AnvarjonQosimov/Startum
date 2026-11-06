import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  HardDrive,
  Users,
  Compass,
  BarChart3,
  ScrollText,
  ShieldCheck,
  Settings,
  BookOpen,
  CreditCard,
  Zap,
  Radio
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const navigationItems = [
  { section: 'Workspace', items: [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Projects', path: '/projects', icon: FolderKanban }
  ]},
  { section: 'Build & Services', items: [
    { label: 'Database', path: '/database', icon: Database, badge: 'NoSQL' },
    { label: 'Cloud Storage', path: '/storage', icon: HardDrive },
    { label: 'Authentication', path: '/auth', icon: Users },
    { label: 'API Explorer', path: '/api-explorer', icon: Compass }
  ]},
  { section: 'Monitor & Protect', items: [
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Logs & Metrics', path: '/logs', icon: ScrollText, live: true },
    { label: 'Security Rules', path: '/security', icon: ShieldCheck }
  ]},
  { section: 'Platform', items: [
    { label: 'Project Settings', path: '/settings', icon: Settings },
    { label: 'Documentation', path: '/documentation', icon: BookOpen },
    { label: 'Billing & Limits', path: '/billing', icon: CreditCard }
  ]}
];

export function Sidebar() {
  const { currentProject } = useProject();

  return (
    <aside className="w-64 border-r border-white/5 bg-stratum-950 flex flex-col h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-stratum-950 rounded-[10px] flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            STRATUM
          </span>
          <span className="text-[10px] font-mono text-cyan-400 font-medium tracking-widest uppercase">
            Cloud Platform
          </span>
        </div>
      </div>

      {/* Active Project Banner */}
      {currentProject && (
        <div className="px-4 py-3 mx-3 my-2 rounded-xl bg-stratum-900 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div className="truncate">
              <div className="text-xs font-semibold text-slate-100 truncate">{currentProject.name}</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">{currentProject.plan.toUpperCase()} TIER</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
            v1.0
          </span>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navigationItems.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 text-cyan-300 border border-cyan-500/20 font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.live && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        LIVE
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stratum-800 text-slate-300 border border-white/5">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-white/5 bg-stratum-900/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 py-1">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>US-East (Active)</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">Node v22.16</span>
        </div>
      </div>
    </aside>
  );
}

