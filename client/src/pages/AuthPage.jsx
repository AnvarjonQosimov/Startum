import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Key,
  Mail,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
  Edit2,
  ScrollText,
  Settings,
  Sparkles,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export function AuthPage() {
  const { currentProject } = useProject();

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'logs' | 'settings'
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formCustomClaims, setFormCustomClaims] = useState('{}');
  const [formEmailVerified, setFormEmailVerified] = useState(true);

  const [copiedToken, setCopiedToken] = useState(false);

  const loadUsers = async () => {
    if (!currentProject) return;
    try {
      setLoading(true);
      const res = await api.getUsers(currentProject.id, { search });
      setUsers(res.users || []);
      setUserStats(res.stats);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    if (!currentProject) return;
    try {
      const res = await api.getAuthLogs(currentProject.id, { limit: 50 });
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error fetching auth logs:', err);
    }
  };

  const loadSettings = async () => {
    if (!currentProject) return;
    try {
      const res = await api.getAuthSettings(currentProject.id);
      setSettings(res.settings);
    } catch (err) {
      console.error('Error fetching auth settings:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'logs') loadLogs();
    else if (activeTab === 'settings') loadSettings();
  }, [currentProject, activeTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!currentProject || !formEmail.trim()) return;
    try {
      let claims = {};
      try {
        claims = JSON.parse(formCustomClaims);
      } catch (e) {
        alert('Invalid JSON in custom claims');
        return;
      }
      claims.role = formRole;

      await api.createUser(currentProject.id, {
        email: formEmail.trim(),
        password: formPassword,
        displayName: formDisplayName.trim(),
        customClaims: claims,
        emailVerified: formEmailVerified
      });

      setAddUserModalOpen(false);
      setFormEmail('');
      setFormPassword('');
      setFormDisplayName('');
      setFormRole('user');
      setFormCustomClaims('{}');
      loadUsers();
    } catch (err) {
      alert(`Error creating user: ${err.message}`);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!currentProject || !selectedUser) return;
    try {
      let claims = {};
      try {
        claims = JSON.parse(formCustomClaims);
      } catch (e) {
        alert('Invalid JSON in custom claims');
        return;
      }
      claims.role = formRole;

      await api.updateUser(currentProject.id, selectedUser.uid, {
        displayName: formDisplayName.trim(),
        emailVerified: formEmailVerified,
        customClaims: claims,
        password: formPassword ? formPassword : undefined
      });

      setEditUserModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleDisable = async (user) => {
    if (!currentProject) return;
    try {
      await api.updateUser(currentProject.id, user.uid, { disabled: !user.disabled });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (!confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.deleteUser(currentProject.id, uid);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!currentProject || !settings) return;
    try {
      await api.updateAuthSettings(currentProject.id, settings);
      alert('Authentication policies saved successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendReset = async (email) => {
    try {
      const res = await api.requestPasswordReset(currentProject.id, email);
      alert(`Reset token created: ${res.resetToken || 'Sent'}`);
    } catch (err) {
      alert(err.message);
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
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Authentication & Identity</h1>
            <p className="text-xs text-slate-400">
              Manage end-users, roles, custom claims, OAuth providers, and access security policies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={UserPlus}
            onClick={() => {
              setFormEmail('');
              setFormPassword('');
              setFormDisplayName('');
              setFormRole('user');
              setFormCustomClaims('{}');
              setFormEmailVerified(true);
              setAddUserModalOpen(true);
            }}
          >
            Add User
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      {userStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Total Users</div>
              <div className="text-sm font-bold text-white mt-0.5">{userStats.totalUsers}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-400/10 text-cyan-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Verified Accounts</div>
              <div className="text-sm font-bold text-white mt-0.5">{userStats.verifiedUsers}</div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Admin / Creators</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {(userStats.rolesDistribution?.admin || 0) + (userStats.rolesDistribution?.creator || 0)}
              </div>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Disabled Accounts</div>
              <div className="text-sm font-bold text-white mt-0.5">{userStats.disabledUsers}</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'users'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users Table</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'logs'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            activeTab === 'settings'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Security Policies</span>
        </button>
      </div>

      {/* Tab 1: Users Table */}
      {activeTab === 'users' && (
        <Card className="p-0 overflow-hidden">
          {/* Search bar */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search user email, name, or UID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadUsers(); }}
                className="w-full bg-stratum-950 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <div className="text-xs font-mono text-slate-500">{users.length} accounts</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stratum-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">User / Identity</th>
                  <th className="py-3 px-4">UID</th>
                  <th className="py-3 px-4">Role & Claims</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Created / Signed In</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                      No users registered in this project yet.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const role = u.customClaims?.role || 'user';
                    return (
                      <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`}
                              alt={u.displayName}
                              className="w-8 h-8 rounded-full bg-stratum-800 ring-1 ring-white/10"
                            />
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <span>{u.displayName || 'No Name'}</span>
                                {u.emailVerified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" title="Email verified" />
                                )}
                                {u.disabled && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-rose-500/20 text-rose-400 font-bold">
                                    DISABLED
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[11px] text-slate-400">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {u.uid}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant={role === 'admin' ? 'indigo' : role === 'creator' ? 'cyan' : 'neutral'}>
                              {role.toUpperCase()}
                            </Badge>
                            {Object.keys(u.customClaims || {})
                              .filter(k => k !== 'role')
                              .map(k => (
                                <span key={k} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                  {k}: {String(u.customClaims[k])}
                                </span>
                              ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-[11px] capitalize">
                          {u.providerId || 'password'}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">
                          <div>Created: {new Date(u.createdAt).toLocaleDateString()}</div>
                          <div>Active: {new Date(u.lastSignInAt).toLocaleDateString()}</div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedUser(u);
                                setFormDisplayName(u.displayName || '');
                                setFormRole(u.customClaims?.role || 'user');
                                setFormCustomClaims(JSON.stringify(u.customClaims || {}, null, 2));
                                setFormEmailVerified(u.emailVerified);
                                setFormPassword('');
                                setEditUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                              title="Edit user & claims"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleDisable(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.disabled
                                  ? 'text-emerald-400 hover:bg-emerald-500/10'
                                  : 'text-amber-400 hover:bg-amber-500/10'
                              }`}
                              title={u.disabled ? 'Enable account' : 'Disable account'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleSendReset(u.email)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
                              title="Generate password reset token"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Auth Audit Logs */}
      {activeTab === 'logs' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Authentication Audit Trail</h3>
            <span className="text-xs font-mono text-slate-500">{logs.length} logged events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-stratum-950/80 text-slate-400 uppercase text-[10px] border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Account Email</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No authentication logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <tr key={l.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-bold text-slate-200">{l.eventType}</td>
                      <td className="py-3 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{l.email}</td>
                      <td className="py-3 px-4 text-slate-500">{l.ip}</td>
                      <td className="py-3 px-4 text-slate-500">{new Date(l.timestamp).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Security Policies */}
      {activeTab === 'settings' && settings && (
        <Card className="max-w-2xl">
          <h3 className="text-sm font-bold text-white mb-1">Authentication Policies</h3>
          <p className="text-xs text-slate-400 mb-6">
            Configure registration security, session lifetimes, and multi-factor guardrails.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stratum-950 border border-white/5">
              <div>
                <div className="font-semibold text-slate-200">Allow Public User Signups</div>
                <div className="text-[11px] text-slate-400">Permit new end-users to register via the SDK or API.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.allowUserSignups}
                onChange={(e) => setSettings({ ...settings, allowUserSignups: e.target.checked })}
                className="w-4 h-4 accent-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stratum-950 border border-white/5">
              <div>
                <div className="font-semibold text-slate-200">Enforce Email Verification</div>
                <div className="text-[11px] text-slate-400">Require email address verification before login.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                className="w-4 h-4 accent-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-stratum-950 border border-white/5">
              <div>
                <div className="font-semibold text-slate-200">Enable Google Single Sign-On</div>
                <div className="text-[11px] text-slate-400">Allow sign-in through Google OAuth tokens.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.enableGoogleAuth}
                onChange={(e) => setSettings({ ...settings, enableGoogleAuth: e.target.checked })}
                className="w-4 h-4 accent-cyan-400"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-stratum-950 border border-white/5 space-y-2">
              <label className="block font-semibold text-slate-200">Minimum Password Length</label>
              <input
                type="number"
                min={6}
                max={32}
                value={settings.minPasswordLength || 6}
                onChange={(e) => setSettings({ ...settings, minPasswordLength: parseInt(e.target.value, 10) })}
                className="w-32 px-3 py-1.5 rounded-lg bg-stratum-900 border border-white/10 text-slate-100 font-mono"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button variant="primary" type="submit">
                Save Policies
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Modal: Add User */}
      <Modal isOpen={addUserModalOpen} onClose={() => setAddUserModalOpen(false)} title="Create End-User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name (Optional)</label>
            <input
              type="text"
              value={formDisplayName}
              onChange={(e) => setFormDisplayName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="user">User (Standard)</option>
                <option value="creator">Creator</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEmailVerified}
                  onChange={(e) => setFormEmailVerified(e.target.checked)}
                  className="accent-cyan-400"
                />
                Mark as Email Verified
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Claims (JSON)
            </label>
            <textarea
              rows={3}
              value={formCustomClaims}
              onChange={(e) => setFormCustomClaims(e.target.value)}
              className="w-full bg-stratum-950 border border-white/10 rounded-xl p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Register User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit User */}
      <Modal isOpen={editUserModalOpen} onClose={() => setEditUserModalOpen(false)} title={`Edit Account: ${selectedUser?.email}`}>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Display Name</label>
            <input
              type="text"
              value={formDisplayName}
              onChange={(e) => setFormDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Set New Password (Leave blank to keep current)
            </label>
            <input
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Role</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stratum-950 border border-white/10 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                <option value="user">User</option>
                <option value="creator">Creator</option>
                <option value="editor">Editor</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formEmailVerified}
                  onChange={(e) => setFormEmailVerified(e.target.checked)}
                  className="accent-cyan-400"
                />
                Email Verified
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Claims (JSON)
            </label>
            <textarea
              rows={4}
              value={formCustomClaims}
              onChange={(e) => setFormCustomClaims(e.target.value)}
              className="w-full bg-stratum-950 border border-white/10 rounded-xl p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditUserModalOpen(false)}>
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

