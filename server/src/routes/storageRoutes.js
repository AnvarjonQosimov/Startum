import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storageEngine } from '../storage/storageEngine.js';
import { rulesEngine } from '../security/rulesEngine.js';
import { authenticateProjectRequest } from '../middleware/projectApiMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router({ mergeParams: true });

// Multer storage engine saving directly to project files directory
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.project?.id || req.params.projectId;
    const dest = storageEngine.getFilesDir(projectId);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max for dev server
});

// Listing files in a folder
router.get('/files', authenticateProjectRequest, rateLimiter, (req, res) => {
  const projectId = req.project.id;
  const folder = req.query.folder || '/';

  // Check read permission on path
  const check = rulesEngine.checkStoragePermission({
    projectId,
    filePath: folder,
    action: 'read',
    auth: req.auth
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason });
  }

  const list = storageEngine.listFiles(projectId, folder);
  res.json(list);
});

// Upload Single or Multiple Files
router.post('/upload', authenticateProjectRequest, rateLimiter, upload.array('files', 10), (req, res) => {
  const projectId = req.project.id;
  const folder = req.body.folder || '/';
  const isPublic = req.body.isPublic !== 'false';

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files provided for upload' });
  }

  // Check write permission for folder
  const check = rulesEngine.checkStoragePermission({
    projectId,
    filePath: `${folder === '/' ? '' : folder}/${req.files[0].originalname}`,
    action: 'write',
    auth: req.auth
  });
  if (!check.allowed) {
    // Clean up uploaded temp files on disk
    req.files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    return res.status(403).json({ error: check.reason });
  }

  const savedFiles = req.files.map(f => {
    return storageEngine.saveUploadedFile(projectId, f, {
      folder,
      isPublic,
      metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {}
    });
  });

  res.status(201).json({
    uploadedCount: savedFiles.length,
    files: savedFiles
  });
});

// Create Folder
router.post('/folders', authenticateProjectRequest, rateLimiter, (req, res) => {
  const projectId = req.project.id;
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath is required' });

  const result = storageEngine.createFolder(projectId, folderPath);
  res.status(201).json(result);
});

// Get File Metadata
router.get('/files/:fileId', authenticateProjectRequest, rateLimiter, (req, res) => {
  const projectId = req.project.id;
  const file = storageEngine.getFile(projectId, req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });
  res.json({ file });
});

// Update File Metadata / Rename
router.put('/files/:fileId', authenticateProjectRequest, rateLimiter, (req, res) => {
  const projectId = req.project.id;
  const { name, isPublic, folder, customMetadata } = req.body;

  try {
    if (name) {
      storageEngine.renameFile(projectId, req.params.fileId, name);
    }
    const updated = storageEngine.updateFile(projectId, req.params.fileId, {
      isPublic,
      folder,
      customMetadata
    });
    res.json({ file: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete File
router.delete('/files/:fileId', authenticateProjectRequest, rateLimiter, (req, res) => {
  const projectId = req.project.id;
  const file = storageEngine.getFile(projectId, req.params.fileId);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const check = rulesEngine.checkStoragePermission({
    projectId,
    filePath: `${file.folder}/${file.name}`,
    action: 'write',
    auth: req.auth,
    fileMetadata: file
  });
  if (!check.allowed) {
    return res.status(403).json({ error: check.reason });
  }

  const success = storageEngine.deleteFile(projectId, req.params.fileId);
  res.json({ success, fileId: req.params.fileId });
});

// Storage Statistics
router.get('/stats', authenticateProjectRequest, (req, res) => {
  const projectId = req.project.id;
  const stats = storageEngine.getStats(projectId);
  res.json(stats);
});

export default router;

