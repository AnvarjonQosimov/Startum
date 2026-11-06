import express from 'express';
import { rulesEngine } from '../security/rulesEngine.js';
import { authenticateProjectRequest } from '../middleware/projectApiMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(authenticateProjectRequest);

// Get rules for project
router.get('/rules', (req, res) => {
  const projectId = req.project.id;
  const rules = rulesEngine.getRules(projectId);
  res.json({ rules });
});

// Update rules for project
router.put('/rules', (req, res) => {
  const projectId = req.project.id;
  const { rules } = req.body;
  if (!rules) return res.status(400).json({ error: 'rules payload required' });

  try {
    const updated = rulesEngine.saveRules(projectId, rules);
    res.json({ rules: updated, success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Test rule evaluation
router.post('/test', (req, res) => {
  const { ruleExpression, authMock, resourceMock } = req.body;
  if (!ruleExpression) {
    return res.status(400).json({ error: 'ruleExpression is required' });
  }

  const result = rulesEngine.testRule({
    ruleExpression,
    authMock,
    resourceMock
  });
  res.json(result);
});

export default router;

