import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Shield,
  Users,
  UserPlus,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  Globe,
  Save
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export function ProjectSettingsPage() {
  const { currentProject, updateProject, regenerateApiKey, deleteProject } = useProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [rateLimit, setRateLimit] = useState(600);

  const [revealSecret, setRevealSecret] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Members state
  const [members, setMembers] = useState([]);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentProject) {
      setName(currentProject.name || '');
      setDescription(currentProject.description || '');
      setWebhookUrl(currentProject.settings?.webhookUrl || '');
      setRateLimit(currentProject.settings?.rateLimitPerMinute || 600);
      setMembers(currentProject.members || []);
    }
  }, [currentProject]);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    if (!currentProject) return;
    try {
      setSaving(true);
      await updateProject(currentProject.id, {
        name,
        description,
        settings: {
          webhookUrl,
          rateLimitPerMinute: Number(rateLimit)
        }
      });
      alert('Project settings successfully saved.');
    } catch (err) {
      alert(`Error updating project: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKeys = async () => {
    if (!currentProject) return;
    if (confirm('Warning: Regenerating your API key will immediately invalidate current live clients. Continue?')) {
      try {
        await regenerateApiKey(currentProject.id);
        alert('API credentials refreshed successfully!');
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!currentProject || !newMemberEmail.trim()) return;
    try {
      const res = await api.addMember(currentProject.id, {
        email: newMemberEmail.trim(),
        role: newMemberRole
      });
      setMembers([...members, res.member]);
      setNewMemberEmail('');
      setAddMemberModalOpen(false);
    } catch (err) {
      alert(`Error adding member: ${err.message}`);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    if (!currentProject) return;
    try {
      await api.updateMember(currentProject.id, memberId, newRole);
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!currentProject) return;
    if (confirm('Remove this collaborator from the project?')) {
      try {
        await api.removeMember(currentProject.id, memberId);
        setMembers(members.filter(m => m.id !== memberId));
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    const confirmName = prompt(`To confirm deletion, type "${currentProject.name}":`);
    if (confirmName === currentProject.name) {
      try {
        await deleteProject(currentProject.id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(currentProject?.apiKey || '');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copySecret = () => {
    navigator.clipboard.writeText(currentProject?.apiSecret || '');
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  if (!currentProject) {
    return <div className="text-center py-20 text-slate-500">Please select an active project.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Project Settings</h1>
          <p className="text-xs text-slate-400">
            Configure project metadata, security credentials, team permissions, and limits.
          </p>
        </div>
      </div>

      {/* General Configuration */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-1">General Settings</h3>
        <p className="text-xs text-slate-400 mb-5">
          Basic project identifiers and webhook delivery endpoints.
        </p>

        <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Project Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Project Identifier (Immutable)</label>
            <input
              type="text"
              disabled
              value={currentProject.id}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950/50 border border-white/5 text-slate-500 font-mono select-all cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Webhook Dispatch URL (Optional)</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.yourdomain.com/webhooks/stratum"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Rate Limit (Requests / minute)</label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-slate-100 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="primary" type="submit" loading={saving} icon={Save}>
              Save Configuration
            </Button>
          </div>
        </form>
      </Card>

      {/* API Keys & Credentials */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-0.5">API Credentials</h3>
            <p className="text-xs text-slate-400">
              Keys required to authenticate REST requests and JavaScript SDK instances.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={handleRegenerateKeys}
          >
            Regenerate Keys
          </Button>
        </div>

        <div className="space-y-4">
          {/* Public API Key */}
          <div className="p-3.5 rounded-xl bg-stratum-950 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" /> Public API Key
              </span>
              <button
                onClick={copyKey}
                className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1"
              >
                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedKey ? 'Copied' : 'Copy Key'}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 bg-stratum-900 px-3 py-2 rounded-lg border border-white/5 select-all">
              {currentProject.apiKey}
            </div>
          </div>

          {/* Secret Key */}
          <div className="p-3.5 rounded-xl bg-stratum-950 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" /> Admin Secret Key
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setRevealSecret(!revealSecret)}
                  className="text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1"
                >
                  {revealSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {revealSecret ? 'Hide' : 'Reveal'}
                </button>
                <button
                  onClick={copySecret}
                  className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] flex items-center gap-1"
                >
                  {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSecret ? 'Copied' : 'Copy Secret'}
                </button>
              </div>
            </div>
            <div className="font-mono text-xs text-slate-300 bg-stratum-900 px-3 py-2 rounded-lg border border-white/5 select-all">
              {revealSecret ? currentProject.apiSecret : '••••••••••••••••••••••••••••••••••••••••••••'}
            </div>
          </div>
        </div>
      </Card>

      {/* Team Members & Access Permissions */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-0.5">Project Collaborators</h3>
            <p className="text-xs text-slate-400">
              Control developer access levels and project permissions.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            icon={UserPlus}
            onClick={() => setAddMemberModalOpen(true)}
          >
            Add Member
          </Button>
        </div>

        <div className="divide-y divide-white/5 text-xs">
          {members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stratum-800 flex items-center justify-center font-bold text-slate-300 font-mono">
                  {m.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">{m.email}</div>
                  <div className="font-mono text-[10px] text-slate-500">
                    Added: {new Date(m.addedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={m.role}
                  onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-stratum-950 border border-white/10 font-mono text-[11px] text-slate-200 focus:outline-none"
                >
                  <option value="owner">Owner</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>

                {m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger Zone: Delete Project */}
      <Card className="border-rose-500/20 bg-rose-500/[0.02]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Permanently delete this project, all collections, documents, storage objects, and end-user accounts.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Delete Project
          </Button>
        </div>
      </Card>

      {/* Modal: Add Member */}
      <Modal isOpen={addMemberModalOpen} onClose={() => setAddMemberModalOpen(false)} title="Invite Project Collaborator">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Developer Email</label>
            <input
              type="email"
              required
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Permission Role</label>
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="editor">Editor (Can read/write documents & files)</option>
              <option value="viewer">Viewer (Read-only access)</option>
              <option value="owner">Co-Owner (Full administrative permissions)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAddMemberModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Grant Access
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

