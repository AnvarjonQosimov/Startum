import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  ArrowRight,
  Database,
  HardDrive,
  Users,
  Key,
  Trash2,
  Edit2,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, currentProject, selectProject, createProject, deleteProject, updateProject } = useProject();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPlan, setNewPlan] = useState('free');
  const [copiedId, setCopiedId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createProject({ name: newName.trim(), description: newDesc.trim(), plan: newPlan });
      setNewName('');
      setNewDesc('');
      setNewPlan('free');
      setCreateModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!targetProject || !newName.trim()) return;
    try {
      await updateProject(targetProject.id, { name: newName.trim(), description: newDesc.trim() });
      setRenameModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (project) => {
    if (confirm(`Are you sure you want to permanently delete project "${project.name}"? This action cannot be undone.`)) {
      try {
        await deleteProject(project.id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const copyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cloud Projects</h1>
          <p className="text-sm text-slate-400">
            Manage your isolated application environments, database instances, and API credentials.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCreateModalOpen(true)}>
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p) => {
          const isCurrent = currentProject?.id === p.id;
          return (
            <Card
              key={p.id}
              className={`flex flex-col justify-between transition-all duration-200 ${
                isCurrent ? 'ring-2 ring-cyan-500/50 bg-stratum-850/80' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-stratum-800 border border-white/10 flex items-center justify-center text-cyan-400">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500">{p.id}</span>
                        <button
                          onClick={() => copyId(p.id)}
                          className="text-slate-500 hover:text-slate-300"
                          title="Copy project ID"
                        >
                          {copiedId === p.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Badge variant={p.plan === 'pro' ? 'indigo' : p.plan === 'enterprise' ? 'cyan' : 'neutral'}>
                    {p.plan.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 min-h-[32px]">
                  {p.description || 'No description provided.'}
                </p>

                {/* Resource Stats */}
                <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-stratum-950/60 border border-white/5 mb-4 text-center">
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">Docs</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      {(p.stats?.documents || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">Storage</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      {formatBytes(p.stats?.storageBytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-500">Users</div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      {(p.stats?.users || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setTargetProject(p);
                      setNewName(p.name);
                      setNewDesc(p.description || '');
                      setRenameModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Edit project"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {projects.length > 1 && (
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={isCurrent ? 'outline' : 'secondary'}
                  onClick={() => {
                    selectProject(p.id);
                    navigate('/');
                  }}
                  icon={ArrowRight}
                >
                  {isCurrent ? 'Active Project' : 'Open Console'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Project Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Neo Wallet App"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Application purpose or environment"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tier Plan</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="free">Starter Free ($0/mo)</option>
              <option value="pro">Growth Pro ($29/mo)</option>
              <option value="enterprise">Enterprise Dedicated ($199/mo)</option>
            </select>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Provision Project
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal isOpen={renameModalOpen} onClose={() => setRenameModalOpen(false)} title="Update Project">
        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

