import { PLAN_LIMITS } from '../projects/projectManager.js';

const requestWindows = new Map(); // projectId -> Array of timestamps

export function rateLimiter(req, res, next) {
  const project = req.project;
  if (!project) return next();

  // Root platform developer requests bypass rate limits
  if (req.auth?.isRootDeveloper) return next();

  const projectId = project.id;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (!requestWindows.has(projectId)) {
    requestWindows.set(projectId, []);
  }

  const timestamps = requestWindows.get(projectId);
  // Filter out older than 1 minute
  const recent = timestamps.filter(t => t > oneMinuteAgo);
  requestWindows.set(projectId, recent);

  const plan = PLAN_LIMITS[project.plan] || PLAN_LIMITS.free;
  const maxPerMinute = project.settings?.rateLimitPerMinute || (plan.name === 'Starter Developer' ? 120 : 1200);

  if (recent.length >= maxPerMinute) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit of ${maxPerMinute} requests/minute exceeded for project '${project.name}' (${project.plan} plan).`,
      retryAfterSeconds: 60
    });
  }

  recent.push(now);
  res.setHeader('X-RateLimit-Limit', maxPerMinute);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxPerMinute - recent.length));

  next();
}

