import express from 'express';
import { authEngine } from '../auth/authEngine.js';
import { authenticateProjectRequest } from '../middleware/projectApiMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// All routes use project auth middleware to resolve project & end-user context
router.use(authenticateProjectRequest, rateLimiter);

// ---------------------------------------------------------
// Client-Facing Auth Endpoints (used by SDK & Applications)
// ---------------------------------------------------------

// Sign Up
router.post('/signup', (req, res) => {
  const projectId = req.project.id;
  const { email, password, displayName, photoURL, customClaims } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = authEngine.registerProjectUser(projectId, {
      email,
      password,
      displayName,
      photoURL,
      customClaims,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Sign In
router.post('/signin', (req, res) => {
  const projectId = req.project.id;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = authEngine.loginProjectUser(projectId, {
      email,
      password,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Google Sign-In Simulation
router.post('/google', (req, res) => {
  const projectId = req.project.id;
  const { email, displayName, photoURL, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Google account email is required' });
  }

  try {
    const result = authEngine.loginWithGoogle(projectId, {
      email,
      displayName,
      photoURL,
      googleId: googleId || `goog_${Date.now()}`,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Password Reset Request
router.post('/password-reset', (req, res) => {
  const projectId = req.project.id;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const result = authEngine.requestPasswordReset(projectId, email);
  res.json(result);
});

// Password Reset Confirm
router.post('/reset-confirm', (req, res) => {
  const projectId = req.project.id;
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'resetToken and newPassword are required' });
  }

  try {
    const result = authEngine.resetPasswordWithToken(projectId, { resetToken, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Verify Current Token & Get Profile
router.get('/me', (req, res) => {
  if (!req.auth || !req.auth.uid) {
    return res.status(401).json({ error: 'Not authenticated as a project end-user' });
  }
  const users = authEngine.getProjectUsers(req.project.id);
  const user = users.find(u => u.uid === req.auth.uid);
  if (!user) return res.status(404).json({ error: 'User profile not found' });

  const sanitized = { ...user };
  delete sanitized.passwordHash;
  delete sanitized.tokens;
  res.json({ user: sanitized });
});

// ---------------------------------------------------------
// Developer Console User Management Endpoints
// ---------------------------------------------------------

// List Users
router.get('/users', (req, res) => {
  const projectId = req.project.id;
  const { search, limit = 50, offset = 0 } = req.query;
  let users = authEngine.getProjectUsers(projectId);

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    users = users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.uid.toLowerCase().includes(q)
    );
  }

  const sanitized = users.map(u => {
    const copy = { ...u };
    delete copy.passwordHash;
    delete copy.tokens;
    return copy;
  });

  const parsedLimit = parseInt(limit, 10) || 50;
  const parsedOffset = parseInt(offset, 10) || 0;

  res.json({
    users: sanitized.slice(parsedOffset, parsedOffset + parsedLimit),
    total: sanitized.length,
    stats: authEngine.getStats(projectId)
  });
});

// Create User from Dashboard
router.post('/users', (req, res) => {
  const projectId = req.project.id;
  const { email, password, displayName, customClaims, emailVerified } = req.body;

  try {
    const result = authEngine.registerProjectUser(projectId, {
      email,
      password,
      displayName,
      customClaims,
      ip: req.ip,
      userAgent: 'Console Admin'
    });
    if (emailVerified) {
      authEngine.updateProjectUser(projectId, result.user.uid, { emailVerified: true });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update User (claims, verified, disabled, displayName)
router.put('/users/:uid', (req, res) => {
  const projectId = req.project.id;
  try {
    const updated = authEngine.updateProjectUser(projectId, req.params.uid, req.body);
    res.json({ user: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete User
router.delete('/users/:uid', (req, res) => {
  const projectId = req.project.id;
  const success = authEngine.deleteProjectUser(projectId, req.params.uid);
  res.json({ success });
});

// Auth Logs
router.get('/logs', (req, res) => {
  const projectId = req.project.id;
  const { limit, offset } = req.query;
  const result = authEngine.getAuthLogs(projectId, {
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0
  });
  res.json(result);
});

// Auth Settings
router.get('/settings', (req, res) => {
  const projectId = req.project.id;
  const settings = authEngine.getAuthSettings(projectId);
  res.json({ settings });
});

router.put('/settings', (req, res) => {
  const projectId = req.project.id;
  const updated = authEngine.saveAuthSettings(projectId, req.body);
  res.json({ settings: updated });
});

export default router;

