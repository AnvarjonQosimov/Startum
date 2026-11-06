import jwt from 'jsonwebtoken';
import { projectManager } from '../projects/projectManager.js';
import { authEngine } from '../auth/authEngine.js';

const JWT_SECRET = process.env.JWT_SECRET || 'stratum_platform_master_secret_2026_xyz987';

export function authenticateProjectRequest(req, res, next) {
  const projectId = req.params.projectId || req.headers['x-project-id'];
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  const authHeader = req.headers.authorization;

  // 1. Check if caller has platform developer token (admin console access)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawToken = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(rawToken, JWT_SECRET);
      if (decoded.isPlatformDeveloper) {
        // Platform developer has root access to all their projects
        const project = projectManager.getProject(projectId);
        if (!project && projectId) {
          return res.status(404).json({ error: `Project '${projectId}' not found` });
        }
        req.project = project;
        req.auth = {
          uid: decoded.userId,
          email: decoded.email,
          role: 'admin',
          isRootDeveloper: true
        };
        return next();
      } else if (decoded.projectId) {
        // Project End-User JWT
        const project = projectManager.getProject(decoded.projectId);
        if (!project) {
          return res.status(404).json({ error: 'Project not found for this user token' });
        }
        req.project = project;
        req.auth = {
          uid: decoded.uid,
          email: decoded.email,
          role: decoded.role || 'user',
          claims: decoded.claims || {}
        };
        return next();
      }
    } catch (err) {
      // Continue to check API Key
    }
  }

  // 2. Validate by API Key (for SDK or direct API calls)
  if (apiKey) {
    const project = projectManager.getProjectByApiKey(apiKey);
    if (!project) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    if (projectId && project.id !== projectId) {
      return res.status(403).json({ error: 'API Key does not match the requested project ID' });
    }

    req.project = project;
    // SDK calls without user token have null auth (anonymous or server-side)
    req.auth = req.auth || null;
    return next();
  }

  // If no auth header and no API key, but projectId was supplied in public route
  if (projectId) {
    const project = projectManager.getProject(projectId);
    if (project) {
      req.project = project;
      req.auth = null;
      return next();
    }
  }

  return res.status(401).json({
    error: 'Authentication failed. Please provide a valid "x-api-key" or Authorization header.'
  });
}

