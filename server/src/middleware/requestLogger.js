import { metricsEngine } from '../analytics/metricsEngine.js';
import { realtimeHub } from '../realtime/wsServer.js';

export function requestLogger(req, res, next) {
  const start = Date.now();
  const url = req.originalUrl || req.url;

  // Intercept the finish event
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const projectId = req.project?.id || req.params?.projectId || 'system';

    // Determine service
    let service = 'api';
    if (url.includes('/db') || url.includes('/database')) service = 'database';
    else if (url.includes('/storage')) service = 'storage';
    else if (url.includes('/auth')) service = 'auth';

    const logEntry = metricsEngine.recordRequest(projectId, {
      method: req.method,
      path: url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || 'StratumClient',
      service
    });

    // Broadcast in real-time to active WebSocket dashboards
    realtimeHub.broadcastLog(projectId, logEntry);
  });

  next();
}

