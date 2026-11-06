import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Plus,
  Search,
  Radio,
  Sun,
  Moon,
  LogOut,
  FolderKanban,
  Check,
  Shield,
  ExternalLink
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { realtime } from '../../services/realtime';

export function TopBar({ onOpenSearch, onOpenCreateProject }) {
  const { projects, currentProject, selectProject } = useProject();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTED');

  const projectDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  useEffect(() => {
    return realtime.onStatusChange(status => setRealtimeStatus(status));
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b border-white/5 bg-stratum-950/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left side: Project Selector */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={projectDropdownRef}>
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-stratum-900 border border-white/10 hover:border-white/20 transition-all text-xs font-semibold text-slate-100 hover:bg-stratum-850"
          >
            <FolderKanban className="w-4 h-4 text-cyan-400" />
            <span className="max-w-[180px] truncate">
              {currentProject ? currentProject.name : 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-stratum-900 border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in duration-100">
              <div className="text-[10px] font-mono text-slate-500 uppercase px-3 py-1 font-semibold">
                Your Projects ({projects.length})
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 my-1">
                {projects.map((p) => {
                  const isSelected = currentProject?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        selectProject(p.id);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="truncate">
                        <div className="truncate">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">{p.id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 uppercase text-slate-400">
                          {p.plan}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setProjectDropdownOpen(false);
                    onOpenCreateProject();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search shortcut button */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-stratum-900/60 border border-white/5 hover:border-white/15 text-slate-400 hover:text-slate-200 transition-all text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick Search...</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right side: Realtime badge, theme switch, user profile */}
      <div className="flex items-center gap-3">
        {/* Realtime WebSocket status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-stratum-900 border border-white/5 text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              realtimeStatus === 'CONNECTED'
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-slate-300">
            {realtimeStatus === 'CONNECTED' ? 'Realtime Live' : 'Reconnecting...'}
          </span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User profile dropdown */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-white/5 transition-colors"
          >
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={user?.name || 'Developer'}
              className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10"
            />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-stratum-900 border border-white/10 shadow-2xl p-2 z-50 animate-in fade-in duration-100">
              <div className="px-3 py-2 border-b border-white/5">
                <div className="text-xs font-semibold text-slate-100 truncate">{user?.name}</div>
                <div className="text-[11px] font-mono text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyanGlow/10 text-cyanGlow uppercase">
                    {user?.role || 'Developer'}
                  </span>
                </div>
              </div>

              <div className="my-1 py-1">
                <a
                  href="/sdk/stratum-sdk.js"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <span>Download SDK</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                </a>
              </div>

              <div className="pt-1 border-t border-white/5">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

