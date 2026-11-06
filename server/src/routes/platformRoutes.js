import express from 'express';
import { authEngine } from '../auth/authEngine.js';
import { projectManager, PLAN_LIMITS } from '../projects/projectManager.js';
import { dbEngine } from '../db/engine.js';
import { storageEngine } from '../storage/storageEngine.js';
import { requirePlatformAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Platform Developer Auth
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = authEngine.loginPlatformDeveloper(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/auth/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = authEngine.registerPlatformDeveloper(email, password, name);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/auth/me', requirePlatformAuth, (req, res) => {
  const users = authEngine.getPlatformUsers();
  const current = users.find(u => u.id === req.platformUser.userId);
  if (!current) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  const sanitized = { ...current };
  delete sanitized.passwordHash;
  res.json({ user: sanitized });
});

// Platform Projects Management (Requires Platform Developer Auth)
router.get('/projects', requirePlatformAuth, (req, res) => {
  const projects = projectManager.listProjects();
  // Enrich projects with quick stats
  const enriched = projects.map(p => {
    const dbStats = dbEngine.getStats(p.id);
    const storageStats = storageEngine.getStats(p.id);
    const authStats = authEngine.getStats(p.id);
    return {
      ...p,
      stats: {
        documents: dbStats.documentCount,
        collections: dbStats.collectionCount,
        dbBytes: dbStats.sizeBytes,
        files: storageStats.totalFiles,
        storageBytes: storageStats.totalBytes,
        users: authStats.totalUsers,
        activeUsers: authStats.activeUsers
      }
    };
  });
  res.json({ projects: enriched });
});

router.post('/projects', requirePlatformAuth, (req, res) => {
  try {
    const { name, description, plan } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const project = projectManager.createProject({
      name,
      description,
      plan: plan || 'free',
      ownerEmail: req.platformUser.email
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects/:projectId', requirePlatformAuth, (req, res) => {
  const project = projectManager.getProject(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const dbStats = dbEngine.getStats(project.id);
  const storageStats = storageEngine.getStats(project.id);
  const authStats = authEngine.getStats(project.id);

  res.json({
    project,
    planLimits: PLAN_LIMITS[project.plan] || PLAN_LIMITS.free,
    stats: {
      documents: dbStats.documentCount,
      collections: dbStats.collectionCount,
      dbBytes: dbStats.sizeBytes,
      files: storageStats.totalFiles,
      storageBytes: storageStats.totalBytes,
      users: authStats.totalUsers,
      activeUsers: authStats.activeUsers
    }
  });
});

router.put('/projects/:projectId', requirePlatformAuth, (req, res) => {
  try {
    const updated = projectManager.updateProject(req.params.projectId, req.body);
    res.json({ project: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/projects/:projectId', requirePlatformAuth, (req, res) => {
  const success = projectManager.deleteProject(req.params.projectId);
  if (!success) return res.status(404).json({ error: 'Project not found' });
  res.json({ success: true, message: 'Project and all associated resources deleted' });
});

router.post('/projects/:projectId/regenerate-keys', requirePlatformAuth, (req, res) => {
  try {
    const credentials = projectManager.regenerateApiKey(req.params.projectId);
    res.json(credentials);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Member management
router.post('/projects/:projectId/members', requirePlatformAuth, (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Member email is required' });
    const member = projectManager.addMember(req.params.projectId, { email, role });
    res.status(201).json({ member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:projectId/members/:memberId', requirePlatformAuth, (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: 'Role is required' });
    const member = projectManager.updateMemberRole(req.params.projectId, req.params.memberId, role);
    res.json({ member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/projects/:projectId/members/:memberId', requirePlatformAuth, (req, res) => {
  try {
    const success = projectManager.removeMember(req.params.projectId, req.params.memberId);
    res.json({ success });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// High-level workspace overview
router.get('/overview', requirePlatformAuth, (req, res) => {
  const projects = projectManager.listProjects();
  let totalDocs = 0;
  let totalStorageBytes = 0;
  let totalUsers = 0;
  let totalCollections = 0;

  for (const p of projects) {
    const dbStats = dbEngine.getStats(p.id);
    const storageStats = storageEngine.getStats(p.id);
    const authStats = authEngine.getStats(p.id);

    totalDocs += dbStats.documentCount;
    totalCollections += dbStats.collectionCount;
    totalStorageBytes += storageStats.totalBytes;
    totalUsers += authStats.totalUsers;
  }

  res.json({
    projectCount: projects.length,
    totalDocuments: totalDocs,
    totalCollections,
    totalStorageBytes,
    totalUsers,
    plans: PLAN_LIMITS
  });
});

export default router;

