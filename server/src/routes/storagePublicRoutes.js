import express from 'express';
import fs from 'fs';
import { storageEngine } from '../storage/storageEngine.js';
import { rulesEngine } from '../security/rulesEngine.js';

const router = express.Router();

// Direct download by ID + token
router.get('/:projectId/download/:fileId', (req, res) => {
  const { projectId, fileId } = req.params;
  const { token } = req.query;

  const file = storageEngine.getFile(projectId, fileId);
  if (!file) {
    return res.status(404).send('File not found');
  }

  // If private, verify token
  if (!file.isPublic && file.downloadToken !== token) {
    return res.status(403).send('Unauthorized: Invalid download token');
  }

  const physicalPath = storageEngine.getPhysicalFilePath(projectId, file.storageName);
  if (!fs.existsSync(physicalPath)) {
    return res.status(404).send('File physical payload missing');
  }

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
  fs.createReadStream(physicalPath).pipe(res);
});

// Public URL access (e.g. for img src in websites)
router.get('/:projectId/public/:fileId/:filename', (req, res) => {
  const { projectId, fileId } = req.params;
  const file = storageEngine.getFile(projectId, fileId);
  if (!file) {
    return res.status(404).send('File not found');
  }

  if (!file.isPublic) {
    return res.status(403).send('Forbidden: This file is marked as private');
  }

  const physicalPath = storageEngine.getPhysicalFilePath(projectId, file.storageName);
  if (!fs.existsSync(physicalPath)) {
    return res.status(404).send('File payload missing');
  }

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  fs.createReadStream(physicalPath).pipe(res);
});

// Preview endpoint (inline view for console / images)
router.get('/:projectId/preview/:fileId', (req, res) => {
  const { projectId, fileId } = req.params;
  const file = storageEngine.getFile(projectId, fileId);
  if (!file) return res.status(404).send('File not found');

  const physicalPath = storageEngine.getPhysicalFilePath(projectId, file.storageName);
  if (!fs.existsSync(physicalPath)) return res.status(404).send('File payload missing');

  res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', 'inline');
  fs.createReadStream(physicalPath).pipe(res);
});

export default router;

