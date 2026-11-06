import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export const PLAN_LIMITS = {
  free: {
    name: 'Starter Developer',
    monthlyPrice: 0,
    maxDocuments: 25000,
    maxStorageBytes: 500 * 1024 * 1024, // 500 MB
    maxMonthlyRequests: 50000,
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    realtimeConnections: 100,
    features: [
      'Document Database (NoSQL)',
      'Built-in JWT Authentication',
      'Encrypted Cloud Storage',
      'Realtime WebSocket Subscriptions',
      'Dynamic Security Rules',
      'Standard REST API & JavaScript SDK'
    ]
  },
  pro: {
    name: 'Growth Scale',
    monthlyPrice: 29,
    maxDocuments: 1000000,
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxMonthlyRequests: 5000000,
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    realtimeConnections: 5000,
    features: [
      'Everything in Starter',
      'High-throughput read/write engine',
      'Automated daily backups',
      'Custom domain & SSL termination',
      'Priority WebSocket multiplexing',
      'Advanced audit logs & metrics retention'
    ]
  },
  enterprise: {
    name: 'Enterprise Dedicated',
    monthlyPrice: 199,
    maxDocuments: 50000000,
    maxStorageBytes: 1024 * 1024 * 1024 * 1024, // 1 TB
    maxMonthlyRequests: 100000000,
    maxFileSize: 5 * 1024 * 1024 * 1024, // 5 GB
    realtimeConnections: 100000,
    features: [
      'Everything in Growth',
      'Dedicated multi-region database cluster',
      'Custom VPC peering & SSO SAML/OIDC',
      '99.99% uptime guarantee SLA',
      '24/7 dedicated engineering support',
      'Custom security compliance (HIPAA, SOC2)'
    ]
  }
};

export class ProjectManager {
  constructor() {
    ensureDir(DATA_DIR);
    this.initProjects();
  }

  initProjects() {
    if (!fs.existsSync(PROJECTS_FILE)) {
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  readProjects() {
    try {
      return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    } catch {
      return [];
    }
  }

  writeProjects(projects) {
    const temp = `${PROJECTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(temp, JSON.stringify(projects, null, 2), 'utf-8');
    fs.renameSync(temp, PROJECTS_FILE);
  }

  listProjects() {
    return this.readProjects();
  }

  getProject(projectId) {
    const projects = this.readProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  getProjectByApiKey(apiKey) {
    const projects = this.readProjects();
    return projects.find(p => p.apiKey === apiKey) || null;
  }

  createProject({ name, description = '', plan = 'free', ownerEmail = 'admin@stratum.dev' }) {
    const projects = this.readProjects();
    
    // Generate clean human-readable slug + random suffix
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 18);
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const id = `${slug}-${randomSuffix}`;

    const apiKey = `st_key_${crypto.randomBytes(16).toString('hex')}`;
    const apiSecret = `st_sec_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    const newProject = {
      id,
      name: name.trim(),
      description: description.trim(),
      plan: plan.toLowerCase(),
      apiKey,
      apiSecret,
      createdAt: now,
      updatedAt: now,
      ownerEmail,
      members: [
        {
          id: `mem_1`,
          email: ownerEmail,
          name: 'Project Creator',
          role: 'owner',
          addedAt: now
        }
      ],
      settings: {
        rateLimitPerMinute: 600,
        corsAllowedOrigins: ['*'],
        webhookUrl: '',
        maintenanceMode: false
      }
    };

    projects.unshift(newProject);
    this.writeProjects(projects);

    // Initialize project directory structure
    const projectDir = path.join(DATA_DIR, 'projects', id);
    ensureDir(path.join(projectDir, 'db'));
    ensureDir(path.join(projectDir, 'storage', 'files'));

    return newProject;
  }

  updateProject(projectId, updates) {
    const projects = this.readProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) throw new Error('Project not found');

    const project = projects[index];
    if (updates.name) project.name = updates.name.trim();
    if (updates.description !== undefined) project.description = updates.description.trim();
    if (updates.plan && PLAN_LIMITS[updates.plan.toLowerCase()]) {
      project.plan = updates.plan.toLowerCase();
    }
    if (updates.settings) {
      project.settings = { ...project.settings, ...updates.settings };
    }

    project.updatedAt = new Date().toISOString();
    projects[index] = project;
    this.writeProjects(projects);
    return project;
  }

  regenerateApiKey(projectId) {
    const projects = this.readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    project.apiKey = `st_key_${crypto.randomBytes(16).toString('hex')}`;
    project.apiSecret = `st_sec_${crypto.randomBytes(24).toString('hex')}`;
    project.updatedAt = new Date().toISOString();

    this.writeProjects(projects);
    return {
      apiKey: project.apiKey,
      apiSecret: project.apiSecret
    };
  }

  deleteProject(projectId) {
    const projects = this.readProjects();
    const index = projects.findIndex(p => p.id === projectId);
    if (index === -1) return false;

    projects.splice(index, 1);
    this.writeProjects(projects);

    // Remove project files on disk
    const projectDir = path.join(DATA_DIR, 'projects', projectId);
    if (fs.existsSync(projectDir)) {
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Error removing project directory:', err);
      }
    }

    return true;
  }

  // Members
  addMember(projectId, { email, role = 'editor' }) {
    const projects = this.readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const normEmail = email.trim().toLowerCase();
    if (project.members.some(m => m.email.toLowerCase() === normEmail)) {
      throw new Error('This user is already a member of this project');
    }

    const member = {
      id: `mem_${uuidv4().slice(0, 8)}`,
      email: normEmail,
      name: normEmail.split('@')[0],
      role, // 'owner' | 'editor' | 'viewer'
      addedAt: new Date().toISOString()
    };

    project.members.push(member);
    project.updatedAt = new Date().toISOString();
    this.writeProjects(projects);
    return member;
  }

  updateMemberRole(projectId, memberId, newRole) {
    const projects = this.readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const member = project.members.find(m => m.id === memberId);
    if (!member) throw new Error('Member not found');

    member.role = newRole;
    project.updatedAt = new Date().toISOString();
    this.writeProjects(projects);
    return member;
  }

  removeMember(projectId, memberId) {
    const projects = this.readProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const index = project.members.findIndex(m => m.id === memberId);
    if (index === -1) return false;

    // Do not allow deleting the last owner
    const owners = project.members.filter(m => m.role === 'owner');
    if (project.members[index].role === 'owner' && owners.length <= 1) {
      throw new Error('Cannot remove the sole project owner');
    }

    project.members.splice(index, 1);
    project.updatedAt = new Date().toISOString();
    this.writeProjects(projects);
    return true;
  }
}

export const projectManager = new ProjectManager();

