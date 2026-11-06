import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const JWT_SECRET = process.env.JWT_SECRET || 'stratum_platform_master_secret_2026_xyz987';

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export class AuthEngine {
  constructor() {
    ensureDir(DATA_DIR);
    this.platformUsersPath = path.join(DATA_DIR, 'platform_users.json');
    this.initPlatformUsers();
  }

  // Initialize platform developer accounts
  initPlatformUsers() {
    if (!fs.existsSync(this.platformUsersPath)) {
      const defaultSalt = bcrypt.genSaltSync(10);
      const defaultHash = bcrypt.hashSync('admin123456', defaultSalt);
      const initialUsers = [
        {
          id: 'dev_admin_001',
          email: 'admin@stratum.dev',
          passwordHash: defaultHash,
          name: 'Chief Cloud Architect',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          role: 'owner',
          createdAt: new Date().toISOString()
        }
      ];
      fs.writeFileSync(this.platformUsersPath, JSON.stringify(initialUsers, null, 2), 'utf-8');
    }
  }

  getPlatformUsers() {
    try {
      return JSON.parse(fs.readFileSync(this.platformUsersPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  // Platform Login
  loginPlatformDeveloper(email, password) {
    const users = this.getPlatformUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isPlatformDeveloper: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role
      }
    };
  }

  // Platform Developer Registration
  registerPlatformDeveloper(email, password, name) {
    const users = this.getPlatformUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists');
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUser = {
      id: `dev_${uuidv4().slice(0, 8)}`,
      email: email.trim().toLowerCase(),
      passwordHash,
      name: name || email.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(email)}`,
      role: 'developer',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    fs.writeFileSync(this.platformUsersPath, JSON.stringify(users, null, 2), 'utf-8');

    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isPlatformDeveloper: true
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        avatarUrl: newUser.avatarUrl,
        role: newUser.role
      }
    };
  }

  // -------------------------------------------------------------
  // PROJECT END-USERS MANAGEMENT (Isolated per project)
  // -------------------------------------------------------------

  getProjectUsersPath(projectId) {
    const projectDir = path.join(DATA_DIR, 'projects', projectId);
    ensureDir(projectDir);
    return path.join(projectDir, 'users.json');
  }

  getProjectAuthLogsPath(projectId) {
    const projectDir = path.join(DATA_DIR, 'projects', projectId);
    ensureDir(projectDir);
    return path.join(projectDir, 'auth_logs.json');
  }

  getProjectAuthSettingsPath(projectId) {
    const projectDir = path.join(DATA_DIR, 'projects', projectId);
    ensureDir(projectDir);
    return path.join(projectDir, 'auth_settings.json');
  }

  getProjectUsers(projectId) {
    const filePath = this.getProjectUsersPath(projectId);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  }

  writeProjectUsers(projectId, users) {
    const filePath = this.getProjectUsersPath(projectId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(users, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  // Auth Logs
  logAuthEvent(projectId, { eventType, email, uid, status, ip = '127.0.0.1', userAgent = 'Stratum-Client' }) {
    const logPath = this.getProjectAuthLogsPath(projectId);
    let logs = [];
    if (fs.existsSync(logPath)) {
      try {
        logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      } catch {}
    }

    const logEntry = {
      id: `alog_${uuidv4().slice(0, 8)}`,
      eventType,
      email,
      uid,
      status, // 'SUCCESS' | 'FAILED'
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    };

    logs.unshift(logEntry);
    if (logs.length > 500) logs = logs.slice(0, 500); // retain last 500
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
  }

  getAuthLogs(projectId, { limit = 50, offset = 0 } = {}) {
    const logPath = this.getProjectAuthLogsPath(projectId);
    if (!fs.existsSync(logPath)) return { logs: [], total: 0 };
    try {
      const logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      return {
        logs: logs.slice(offset, offset + limit),
        total: logs.length
      };
    } catch {
      return { logs: [], total: 0 };
    }
  }

  // Auth Settings per project
  getAuthSettings(projectId) {
    const settingsPath = this.getProjectAuthSettingsPath(projectId);
    if (!fs.existsSync(settingsPath)) {
      const defaultSettings = {
        allowUserSignups: true,
        requireEmailVerification: false,
        enableGoogleAuth: true,
        enableAnonymousAuth: false,
        minPasswordLength: 6,
        sessionTimeoutHours: 72
      };
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
      return defaultSettings;
    }
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch {
      return {};
    }
  }

  saveAuthSettings(projectId, newSettings) {
    const settingsPath = this.getProjectAuthSettingsPath(projectId);
    const current = this.getAuthSettings(projectId);
    const updated = { ...current, ...newSettings };
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  // End-User Registration
  registerProjectUser(projectId, { email, password, displayName = '', photoURL = '', customClaims = {}, providerId = 'password', ip, userAgent }) {
    const settings = this.getAuthSettings(projectId);
    if (!settings.allowUserSignups) {
      throw new Error('User signups are currently disabled by the project administrator');
    }

    const users = this.getProjectUsers(projectId);
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      this.logAuthEvent(projectId, { eventType: 'SIGN_UP', email: normalizedEmail, status: 'FAILED', ip, userAgent });
      throw new Error('A user with this email address already exists');
    }

    if (password && password.length < (settings.minPasswordLength || 6)) {
      throw new Error(`Password must be at least ${settings.minPasswordLength || 6} characters long`);
    }

    const uid = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const now = new Date().toISOString();
    const passwordHash = password ? bcrypt.hashSync(password, 10) : null;

    const newUser = {
      uid,
      email: normalizedEmail,
      displayName: displayName || normalizedEmail.split('@')[0],
      photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
      emailVerified: providerId === 'google.com' ? true : false,
      disabled: false,
      providerId,
      customClaims: customClaims || {},
      passwordHash,
      createdAt: now,
      lastSignInAt: now,
      tokens: {
        resetToken: null,
        resetTokenExpires: null,
        verificationToken: crypto.randomBytes(24).toString('hex')
      }
    };

    users.unshift(newUser);
    this.writeProjectUsers(projectId, users);

    this.logAuthEvent(projectId, { eventType: 'SIGN_UP', email: normalizedEmail, uid, status: 'SUCCESS', ip, userAgent });

    // Generate JWT for End-User
    const token = this.generateUserToken(projectId, newUser);

    // Return sanitized user object
    const sanitized = { ...newUser };
    delete sanitized.passwordHash;
    delete sanitized.tokens;

    return { token, user: sanitized };
  }

  // End-User Login
  loginProjectUser(projectId, { email, password, ip, userAgent }) {
    const users = this.getProjectUsers(projectId);
    const normalizedEmail = email.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      this.logAuthEvent(projectId, { eventType: 'SIGN_IN', email: normalizedEmail, status: 'FAILED', ip, userAgent });
      throw new Error('Invalid email or password');
    }

    if (user.disabled) {
      this.logAuthEvent(projectId, { eventType: 'SIGN_IN', email: normalizedEmail, uid: user.uid, status: 'FAILED', ip, userAgent });
      throw new Error('This user account has been disabled by an administrator');
    }

    if (!user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
      this.logAuthEvent(projectId, { eventType: 'SIGN_IN', email: normalizedEmail, uid: user.uid, status: 'FAILED', ip, userAgent });
      throw new Error('Invalid email or password');
    }

    user.lastSignInAt = new Date().toISOString();
    this.writeProjectUsers(projectId, users);

    this.logAuthEvent(projectId, { eventType: 'SIGN_IN', email: normalizedEmail, uid: user.uid, status: 'SUCCESS', ip, userAgent });

    const token = this.generateUserToken(projectId, user);

    const sanitized = { ...user };
    delete sanitized.passwordHash;
    delete sanitized.tokens;

    return { token, user: sanitized };
  }

  // Google OAuth Login Simulation
  loginWithGoogle(projectId, { email, displayName, photoURL, googleId, ip, userAgent }) {
    const users = this.getProjectUsers(projectId);
    const normalizedEmail = email.trim().toLowerCase();
    let user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      // Auto-register
      const uid = `usr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const now = new Date().toISOString();
      user = {
        uid,
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0],
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalizedEmail)}`,
        emailVerified: true,
        disabled: false,
        providerId: 'google.com',
        googleId,
        customClaims: { role: 'user' },
        passwordHash: null,
        createdAt: now,
        lastSignInAt: now,
        tokens: {}
      };
      users.unshift(user);
    } else {
      if (user.disabled) {
        throw new Error('This user account has been disabled');
      }
      user.lastSignInAt = new Date().toISOString();
      if (photoURL && !user.photoURL) user.photoURL = photoURL;
    }

    this.writeProjectUsers(projectId, users);
    this.logAuthEvent(projectId, { eventType: 'GOOGLE_SIGN_IN', email: normalizedEmail, uid: user.uid, status: 'SUCCESS', ip, userAgent });

    const token = this.generateUserToken(projectId, user);
    const sanitized = { ...user };
    delete sanitized.passwordHash;
    delete sanitized.tokens;

    return { token, user: sanitized };
  }

  // Token Generator for Project End-Users
  generateUserToken(projectId, user) {
    return jwt.sign(
      {
        projectId,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        claims: user.customClaims || {},
        role: user.customClaims?.role || 'user'
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  // Verify Project User Token
  verifyUserToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  // User Management
  updateProjectUser(projectId, uid, updates) {
    const users = this.getProjectUsers(projectId);
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) throw new Error('User not found');

    const user = users[index];
    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.photoURL !== undefined) user.photoURL = updates.photoURL;
    if (updates.emailVerified !== undefined) user.emailVerified = updates.emailVerified;
    if (updates.disabled !== undefined) user.disabled = updates.disabled;
    if (updates.customClaims !== undefined) user.customClaims = updates.customClaims;
    if (updates.password) {
      user.passwordHash = bcrypt.hashSync(updates.password, 10);
    }

    this.writeProjectUsers(projectId, users);

    const sanitized = { ...user };
    delete sanitized.passwordHash;
    delete sanitized.tokens;
    return sanitized;
  }

  deleteProjectUser(projectId, uid) {
    const users = this.getProjectUsers(projectId);
    const index = users.findIndex(u => u.uid === uid);
    if (index === -1) return false;

    users.splice(index, 1);
    this.writeProjectUsers(projectId, users);
    return true;
  }

  // Password reset flow
  requestPasswordReset(projectId, email) {
    const users = this.getProjectUsers(projectId);
    const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { message: 'If this email exists, a password reset link has been dispatched' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.tokens = user.tokens || {};
    user.tokens.resetToken = resetToken;
    user.tokens.resetTokenExpires = Date.now() + 3600000; // 1 hour

    this.writeProjectUsers(projectId, users);
    this.logAuthEvent(projectId, { eventType: 'PASSWORD_RESET_REQUEST', email: user.email, uid: user.uid, status: 'SUCCESS' });

    return {
      message: 'Password reset link generated',
      resetToken, // for testing / integration
      expiresAt: new Date(user.tokens.resetTokenExpires).toISOString()
    };
  }

  resetPasswordWithToken(projectId, { resetToken, newPassword }) {
    const users = this.getProjectUsers(projectId);
    const user = users.find(u => u.tokens?.resetToken === resetToken && u.tokens?.resetTokenExpires > Date.now());
    if (!user) {
      throw new Error('Invalid or expired password reset token');
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.tokens.resetToken = null;
    user.tokens.resetTokenExpires = null;

    this.writeProjectUsers(projectId, users);
    this.logAuthEvent(projectId, { eventType: 'PASSWORD_RESET_COMPLETE', email: user.email, uid: user.uid, status: 'SUCCESS' });

    return { success: true, message: 'Password has been successfully updated' };
  }

  // Stats
  getStats(projectId) {
    const users = this.getProjectUsers(projectId);
    const verified = users.filter(u => u.emailVerified).length;
    const disabled = users.filter(u => u.disabled).length;
    const active = users.length - disabled;

    const rolesCount = {};
    for (const u of users) {
      const role = u.customClaims?.role || 'user';
      rolesCount[role] = (rolesCount[role] || 0) + 1;
    }

    return {
      totalUsers: users.length,
      activeUsers: active,
      verifiedUsers: verified,
      disabledUsers: disabled,
      rolesDistribution: rolesCount
    };
  }
}

export const authEngine = new AuthEngine();

