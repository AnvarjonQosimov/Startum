import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { realtime } from '../services/realtime';

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const { user, token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async (preferProjectId = null) => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.getProjects();
      setProjects(res.projects || []);

      if (res.projects && res.projects.length > 0) {
        const savedId = preferProjectId || localStorage.getItem('stratum_active_project_id');
        const match = res.projects.find(p => p.id === savedId) || res.projects[0];
        setCurrentProject(match);
        localStorage.setItem('stratum_active_project_id', match.id);
      } else {
        setCurrentProject(null);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadProjects();
      realtime.connect();
    }
  }, [token, loadProjects]);

  const selectProject = (projectId) => {
    const match = projects.find(p => p.id === projectId);
    if (match) {
      setCurrentProject(match);
      localStorage.setItem('stratum_active_project_id', match.id);
    }
  };

  const createProject = async ({ name, description, plan }) => {
    const res = await api.createProject({ name, description, plan });
    await loadProjects(res.project.id);
    return res.project;
  };

  const updateProject = async (projectId, updates) => {
    const res = await api.updateProject(projectId, updates);
    await loadProjects(projectId);
    return res.project;
  };

  const deleteProject = async (projectId) => {
    await api.deleteProject(projectId);
    const remaining = projects.filter(p => p.id !== projectId);
    const nextId = remaining.length > 0 ? remaining[0].id : null;
    await loadProjects(nextId);
  };

  const regenerateApiKey = async (projectId) => {
    const res = await api.regenerateApiKey(projectId);
    await loadProjects(projectId);
    return res;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        selectProject,
        loadProjects,
        createProject,
        updateProject,
        deleteProject,
        regenerateApiKey
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}

