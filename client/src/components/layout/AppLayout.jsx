import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useProject } from '../../context/ProjectContext';

export function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectPlan, setNewProjectPlan] = useState('free');
  const [submitting, setSubmitting] = useState(false);

  const { createProject } = useProject();

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      setSubmitting(true);
      await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        plan: newProjectPlan
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setNewProjectPlan('free');
      setCreateProjectOpen(false);
    } catch (err) {
      alert(`Error creating project: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stratum-950 text-slate-100 font-sans selection:bg-cyanGlow/20 selection:text-cyanGlow">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenCreateProject={() => setCreateProjectOpen(true)}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Global Create Project Modal */}
      <Modal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        title="Provision New Cloud Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Project Name</label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Apex Commerce Cloud, Neon Analytics"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Description (Optional)</label>
            <textarea
              rows={2}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Brief description of application scope or environment"
              className="w-full px-3.5 py-2.5 rounded-xl bg-stratum-950 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Subscription Plan</label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'free', name: 'Starter', price: '$0 / mo' },
                { id: 'pro', name: 'Growth', price: '$29 / mo' },
                { id: 'enterprise', name: 'Enterprise', price: '$199 / mo' }
              ].map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setNewProjectPlan(plan.id)}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                    newProjectPlan === plan.id
                      ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/10 bg-stratum-950 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{plan.name}</div>
                  <div className="text-[11px] font-mono mt-0.5">{plan.price}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
            <Button variant="ghost" type="button" onClick={() => setCreateProjectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              Provision Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

