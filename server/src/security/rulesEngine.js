import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data', 'projects');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getRulesPath(projectId) {
  const projectDir = path.join(DATA_DIR, projectId);
  ensureDir(projectDir);
  return path.join(projectDir, 'rules.json');
}

const DEFAULT_RULES = {
  version: '2',
  rules: {
    database: {
      "*": {
        read: "true",
        create: "auth != null",
        update: "auth != null && (auth.uid == resource.userId || auth.role == 'admin')",
        delete: "auth != null && (auth.uid == resource.userId || auth.role == 'admin')"
      }
    },
    storage: {
      "public/*": {
        read: "true",
        write: "auth != null"
      },
      "users/{userId}/*": {
        read: "true",
        write: "auth != null && auth.uid == userId"
      },
      "*": {
        read: "true",
        write: "auth != null"
      }
    }
  }
};

export class RulesEngine {
  getRules(projectId) {
    const rulesPath = getRulesPath(projectId);
    if (!fs.existsSync(rulesPath)) {
      this.saveRules(projectId, DEFAULT_RULES);
      return DEFAULT_RULES;
    }
    try {
      return JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    } catch (e) {
      return DEFAULT_RULES;
    }
  }

  saveRules(projectId, rulesConfig) {
    const rulesPath = getRulesPath(projectId);
    fs.writeFileSync(rulesPath, JSON.stringify(rulesConfig, null, 2), 'utf-8');
    return rulesConfig;
  }

  // Evaluate expression safely
  evaluateExpression(expression, context) {
    if (typeof expression === 'boolean') return expression;
    if (!expression || expression === 'true') return true;
    if (expression === 'false') return false;

    try {
      // Build safe execution function with context properties injected
      const { auth, resource, request, userId } = context;
      const fn = new Function('auth', 'resource', 'request', 'userId', `
        try {
          return Boolean(${expression});
        } catch (e) {
          return false;
        }
      `);
      return Boolean(fn(auth, resource, request, userId));
    } catch (err) {
      console.warn(`Rule evaluation error on "${expression}":`, err.message);
      return false;
    }
  }

  // Check Database permission
  checkDbPermission({ projectId, collection, action, auth = null, existingDoc = null, newDoc = null }) {
    const rulesConfig = this.getRules(projectId);
    const dbRules = rulesConfig.rules?.database || {};

    // Specific collection rule or fallback to '*'
    const colRule = dbRules[collection] || dbRules['*'];
    if (!colRule) return { allowed: true, reason: 'No matching rule found; default allow' };

    let ruleExpr = colRule[action];
    // Check fallback 'write' if action is create/update/delete
    if (!ruleExpr && ['create', 'update', 'delete'].includes(action)) {
      ruleExpr = colRule['write'];
    }

    if (!ruleExpr) {
      return { allowed: false, reason: `No rule defined for action "${action}" on collection "${collection}"` };
    }

    const context = {
      auth,
      resource: existingDoc || {},
      request: {
        auth,
        method: action,
        resource: newDoc || existingDoc || {},
        time: new Date().toISOString()
      }
    };

    const allowed = this.evaluateExpression(ruleExpr, context);
    return {
      allowed,
      rule: ruleExpr,
      action,
      collection,
      reason: allowed ? 'Access granted by security rules' : `Access denied: rule condition "${ruleExpr}" evaluated to false`
    };
  }

  // Check Storage permission
  checkStoragePermission({ projectId, filePath, action, auth = null, fileMetadata = null }) {
    const rulesConfig = this.getRules(projectId);
    const storageRules = rulesConfig.rules?.storage || {};

    // Find best match rule
    let matchedPattern = null;
    let matchedRule = null;
    let extractedUserId = null;

    for (const pattern of Object.keys(storageRules)) {
      if (pattern === '*') {
        if (!matchedPattern) {
          matchedPattern = '*';
          matchedRule = storageRules[pattern];
        }
        continue;
      }

      // Check parameterized patterns like users/{userId}/*
      if (pattern.includes('{userId}')) {
        const regexStr = pattern.replace('{userId}', '([^/]+)').replace('*', '.*');
        const match = new RegExp(`^${regexStr}$`).exec(filePath);
        if (match) {
          matchedPattern = pattern;
          matchedRule = storageRules[pattern];
          extractedUserId = match[1];
          break;
        }
      }

      // Simple glob
      const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$';
      if (new RegExp(regexStr).test(filePath)) {
        matchedPattern = pattern;
        matchedRule = storageRules[pattern];
        break;
      }
    }

    if (!matchedRule) {
      matchedRule = storageRules['*'] || { read: 'true', write: 'auth != null' };
    }

    const ruleExpr = matchedRule[action] || matchedRule['write'];
    if (!ruleExpr) {
      return { allowed: false, reason: `No rule defined for storage action "${action}"` };
    }

    const context = {
      auth,
      userId: extractedUserId,
      resource: fileMetadata || {},
      request: {
        auth,
        method: action,
        path: filePath,
        time: new Date().toISOString()
      }
    };

    const allowed = this.evaluateExpression(ruleExpr, context);
    return {
      allowed,
      rule: ruleExpr,
      action,
      filePath,
      reason: allowed ? 'Access granted by storage security rules' : `Access denied: storage rule condition "${ruleExpr}" failed`
    };
  }

  // Interactive Test Runner
  testRule({ ruleExpression, authMock = null, resourceMock = {} }) {
    try {
      const context = {
        auth: authMock,
        resource: resourceMock,
        request: {
          auth: authMock,
          resource: resourceMock,
          time: new Date().toISOString()
        }
      };
      const allowed = this.evaluateExpression(ruleExpression, context);
      return {
        allowed,
        expression: ruleExpression,
        contextEvaluated: {
          auth: authMock,
          resource: resourceMock
        }
      };
    } catch (e) {
      return {
        allowed: false,
        error: e.message
      };
    }
  }
}

export const rulesEngine = new RulesEngine();

