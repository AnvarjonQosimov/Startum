import express from 'express';
import { dbEngine } from '../db/engine.js';
import { rulesEngine } from '../security/rulesEngine.js';
import { authenticateProjectRequest } from '../middleware/projectApiMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// All database routes enforce project authentication and rate limiting
router.use(authenticateProjectRequest, rateLimiter);

// Collections
router.get('/collections', (req, res) => {
  const projectId = req.project.id;
  const collections = dbEngine.listCollections(projectId);
  res.json({ collections });
});

router.post('/collections', (req, res) => {
  const projectId = req.project.id;
  const { name } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required' });
  }

  // Check write permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection: name,
    action: 'create',
    auth: req.auth
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  const result = dbEngine.createCollection(projectId, name.trim());
  res.status(201).json(result);
});

router.delete('/collections/:collection', (req, res) => {
  const projectId = req.project.id;
  const colName = req.params.collection;

  const check = rulesEngine.checkDbPermission({
    projectId,
    collection: colName,
    action: 'delete',
    auth: req.auth
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  const success = dbEngine.deleteCollection(projectId, colName);
  res.json({ success });
});

// Query Documents
router.get('/:collection', (req, res) => {
  const projectId = req.project.id;
  const colName = req.params.collection;

  // Check read permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection: colName,
    action: 'read',
    auth: req.auth
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  const {
    limit = 50,
    offset = 0,
    sortBy = '_createdAt',
    sortOrder = 'desc',
    search = '',
    filters: rawFilters
  } = req.query;

  let parsedFilters = [];
  if (rawFilters) {
    try {
      parsedFilters = typeof rawFilters === 'string' ? JSON.parse(rawFilters) : rawFilters;
    } catch {
      parsedFilters = [];
    }
  }

  const result = dbEngine.queryDocuments(projectId, colName, {
    filters: parsedFilters,
    sortBy,
    sortOrder,
    limit: parseInt(limit, 10) || 50,
    offset: parseInt(offset, 10) || 0,
    search
  });

  res.json(result);
});

// Get Single Document
router.get('/:collection/:docId', (req, res) => {
  const projectId = req.project.id;
  const { collection, docId } = req.params;

  const doc = dbEngine.getDocument(projectId, collection, docId);
  if (!doc) {
    return res.status(404).json({ error: `Document '${docId}' not found in collection '${collection}'` });
  }

  // Check read permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection,
    action: 'read',
    auth: req.auth,
    existingDoc: doc
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  res.json({ document: doc });
});

// Create Document
router.post('/:collection', (req, res) => {
  const projectId = req.project.id;
  const colName = req.params.collection;
  const { _id, ...data } = req.body;

  // Check create permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection: colName,
    action: 'create',
    auth: req.auth,
    newDoc: data
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  try {
    const doc = dbEngine.createDocument(projectId, colName, data, _id);
    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Document
router.put('/:collection/:docId', (req, res) => {
  const projectId = req.project.id;
  const { collection, docId } = req.params;
  const { merge = true, ...data } = req.body;

  const existing = dbEngine.getDocument(projectId, collection, docId);
  if (!existing) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check update permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection,
    action: 'update',
    auth: req.auth,
    existingDoc: existing,
    newDoc: data
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  try {
    const updated = dbEngine.updateDocument(projectId, collection, docId, data, merge);
    res.json({ document: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete Document
router.delete('/:collection/:docId', (req, res) => {
  const projectId = req.project.id;
  const { collection, docId } = req.params;

  const existing = dbEngine.getDocument(projectId, collection, docId);
  if (!existing) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check delete permission
  const check = rulesEngine.checkDbPermission({
    projectId,
    collection,
    action: 'delete',
    auth: req.auth,
    existingDoc: existing
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason, rule: check.rule });
  }

  const success = dbEngine.deleteDocument(projectId, collection, docId);
  res.json({ success, docId });
});

// Batch Operations
router.post('/ops/batch', (req, res) => {
  const projectId = req.project.id;
  const { operations = [] } = req.body;

  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: 'operations must be an array' });
  }

  // Validate security for each operation
  for (const op of operations) {
    const check = rulesEngine.checkDbPermission({
      projectId,
      collection: op.collection,
      action: op.type,
      auth: req.auth,
      newDoc: op.data
    });
    if (!check.allowed) {
      return res.status(403).json({ error: `Batch operation aborted: ${check.reason}` });
    }
  }

  const results = dbEngine.batchWrite(projectId, operations);
  res.json({ results });
});

// Database Indexes
router.get('/config/indexes', (req, res) => {
  const projectId = req.project.id;
  const indexes = dbEngine.getIndexes(projectId);
  res.json({ indexes });
});

router.post('/config/indexes', (req, res) => {
  const projectId = req.project.id;
  const { collection, field, order } = req.body;
  if (!collection || !field) {
    return res.status(400).json({ error: 'Collection and field are required' });
  }
  const idx = dbEngine.createIndex(projectId, { collection, field, order });
  res.status(201).json({ index: idx });
});

router.delete('/config/indexes/:indexId', (req, res) => {
  const projectId = req.project.id;
  const success = dbEngine.deleteIndex(projectId, req.params.indexId);
  res.json({ success });
});

export default router;

