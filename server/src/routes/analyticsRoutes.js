import express from 'express';
import { metricsEngine } from '../analytics/metricsEngine.js';
import { authenticateProjectRequest } from '../middleware/projectApiMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authenticateProjectRequest);

// Project Analytics
router.get('/metrics', (req, res) => {
  const projectId = req.project.id;
  const timeframe = req.query.timeframe || '7d';
  const analytics = metricsEngine.getAnalytics(projectId, timeframe);
  res.json(analytics);
});

// Project Logs
router.get('/logs', (req, res) => {
  const projectId = req.project.id;
  const { level, service, search, limit, offset } = req.query;

  const result = metricsEngine.getLogs(projectId, {
    level,
    service,
    search,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0
  });

  res.json(result);
});

export default router;

