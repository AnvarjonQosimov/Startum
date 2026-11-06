import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
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
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

const commands = [
  { title: 'Overview Dashboard', category: 'Navigation', path: '/', icon: BarChart3 },
  { title: 'Database Collections & Docs', category: 'Database', path: '/database', icon: Database },
  { title: 'Cloud File Storage', category: 'Storage', path: '/storage', icon: HardDrive },
  { title: 'Authentication & Users', category: 'Auth', path: '/auth', icon: Users },
  { title: 'Interactive API Explorer', category: 'API', path: '/api-explorer', icon: Compass },
  { title: 'Analytics & Traffic', category: 'Monitoring', path: '/analytics', icon: BarChart3 },
  { title: 'Live Logs & Errors', category: 'Monitoring', path: '/logs', icon: ScrollText },
  { title: 'Security Rules Editor', category: 'Security', path: '/security', icon: ShieldCheck },
  { title: 'Project Settings & API Keys', category: 'Settings', path: '/settings', icon: Settings },
  { title: 'Documentation & SDK Quickstart', category: 'Help', path: '/documentation', icon: BookOpen },
  { title: 'Billing & Plan Limits', category: 'Billing', path: '/billing', icon: CreditCard }
];

export function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { currentProject } = useProject();

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = commands.filter(c =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-100">
      <div
        className="w-full max-w-xl bg-stratum-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-stratum-850">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-stratum-950 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Target Project: {currentProject?.name}</span>
          <div className="flex items-center gap-2">
            <span>ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

