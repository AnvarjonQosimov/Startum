import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data', 'projects');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getMetadataPath(projectId) {
  const projectStorageDir = path.join(DATA_DIR, projectId, 'storage');
  ensureDir(projectStorageDir);
  return path.join(projectStorageDir, '_metadata.json');
}

function readMetadata(projectId) {
  const metaPath = getMetadataPath(projectId);
  if (!fs.existsSync(metaPath)) {
    return { files: [], folders: ['/'] };
  }
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch (e) {
    return { files: [], folders: ['/'] };
  }
}

function writeMetadata(projectId, data) {
  const metaPath = getMetadataPath(projectId);
  const tempPath = `${metaPath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, metaPath);
}

export class StorageEngine {
  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'server', 'data', 'projects');
  }

  // Get project files directory on disk
  getFilesDir(projectId) {
    const dir = path.join(this.uploadDir, projectId, 'storage', 'files');
    ensureDir(dir);
    return dir;
  }

  // List files and subfolders in a folder
  listFiles(projectId, folder = '/') {
    const meta = readMetadata(projectId);
    const normalizedFolder = folder === '/' ? '/' : folder.replace(/\/$/, '') + '/';

    const filesInFolder = meta.files.filter(f => {
      const fileFolder = f.folder.endsWith('/') ? f.folder : f.folder + '/';
      return fileFolder === normalizedFolder;
    });

    // Subfolders directly under normalizedFolder
    const subfolders = (meta.folders || [])
      .filter(f => f !== '/' && f.startsWith(normalizedFolder) && f !== normalizedFolder)
      .map(f => {
        const rest = f.slice(normalizedFolder.length);
        const nextSegment = rest.split('/')[0];
        return normalizedFolder === '/' ? `/${nextSegment}` : `${normalizedFolder}${nextSegment}`;
      });

    const uniqueSubfolders = Array.from(new Set(subfolders));

    return {
      folder: normalizedFolder,
      subfolders: uniqueSubfolders,
      files: filesInFolder,
      totalFilesInFolder: filesInFolder.length
    };
  }

  // Create folder
  createFolder(projectId, folderPath) {
    const meta = readMetadata(projectId);
    let normalized = folderPath.trim();
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    if (normalized.endsWith('/') && normalized.length > 1) normalized = normalized.slice(0, -1);

    if (!meta.folders) meta.folders = ['/'];
    if (!meta.folders.includes(normalized)) {
      meta.folders.push(normalized);
      writeMetadata(projectId, meta);
    }
    return { success: true, folder: normalized };
  }

  // Register uploaded file
  saveUploadedFile(projectId, fileData, { folder = '/', isPublic = true, metadata = {} } = {}) {
    const meta = readMetadata(projectId);
    const normalizedFolder = folder === '/' ? '/' : (folder.startsWith('/') ? folder : '/' + folder);

    const fileId = `file_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const downloadToken = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const fileRecord = {
      id: fileId,
      name: fileData.originalname,
      storageName: fileData.filename,
      mimeType: fileData.mimetype,
      size: fileData.size,
      folder: normalizedFolder,
      isPublic: Boolean(isPublic),
      downloadToken,
      customMetadata: metadata,
      downloadUrl: `/storage/${projectId}/download/${fileId}?token=${downloadToken}`,
      publicUrl: `/storage/${projectId}/public/${fileId}/${encodeURIComponent(fileData.originalname)}`,
      createdAt: now,
      updatedAt: now
    };

    meta.files.unshift(fileRecord);

    // Ensure folder is in folder list
    if (!meta.folders) meta.folders = ['/'];
    if (!meta.folders.includes(normalizedFolder)) {
      meta.folders.push(normalizedFolder);
    }

    writeMetadata(projectId, meta);
    return fileRecord;
  }

  // Get file metadata by ID
  getFile(projectId, fileId) {
    const meta = readMetadata(projectId);
    return meta.files.find(f => f.id === fileId) || null;
  }

  // Get physical file path
  getPhysicalFilePath(projectId, storageName) {
    const filesDir = this.getFilesDir(projectId);
    return path.join(filesDir, storageName);
  }

  // Delete file
  deleteFile(projectId, fileId) {
    const meta = readMetadata(projectId);
    const index = meta.files.findIndex(f => f.id === fileId);
    if (index === -1) return false;

    const fileRecord = meta.files[index];
    const physicalPath = this.getPhysicalFilePath(projectId, fileRecord.storageName);

    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (err) {
        console.error('Error deleting physical file:', err);
      }
    }

    meta.files.splice(index, 1);
    writeMetadata(projectId, meta);
    return true;
  }

  // Rename file
  renameFile(projectId, fileId, newName) {
    const meta = readMetadata(projectId);
    const file = meta.files.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    file.name = newName.trim();
    file.updatedAt = new Date().toISOString();
    file.publicUrl = `/storage/${projectId}/public/${fileId}/${encodeURIComponent(file.name)}`;

    writeMetadata(projectId, meta);
    return file;
  }

  // Update file visibility or custom metadata
  updateFile(projectId, fileId, updates = {}) {
    const meta = readMetadata(projectId);
    const file = meta.files.find(f => f.id === fileId);
    if (!file) throw new Error('File not found');

    if (typeof updates.isPublic === 'boolean') {
      file.isPublic = updates.isPublic;
    }
    if (updates.customMetadata) {
      file.customMetadata = { ...file.customMetadata, ...updates.customMetadata };
    }
    if (updates.folder) {
      let f = updates.folder.trim();
      if (!f.startsWith('/')) f = '/' + f;
      file.folder = f;
      if (!meta.folders.includes(f)) meta.folders.push(f);
    }

    file.updatedAt = new Date().toISOString();
    writeMetadata(projectId, meta);
    return file;
  }

  // Storage Stats
  getStats(projectId) {
    const meta = readMetadata(projectId);
    let totalBytes = 0;
    const typeDistribution = {
      images: { count: 0, bytes: 0 },
      documents: { count: 0, bytes: 0 },
      videos: { count: 0, bytes: 0 },
      audio: { count: 0, bytes: 0 },
      other: { count: 0, bytes: 0 }
    };

    for (const f of meta.files) {
      totalBytes += f.size || 0;
      const mime = (f.mimeType || '').toLowerCase();
      if (mime.startsWith('image/')) {
        typeDistribution.images.count++;
        typeDistribution.images.bytes += f.size || 0;
      } else if (mime.includes('pdf') || mime.includes('text') || mime.includes('document') || mime.includes('sheet') || mime.includes('csv')) {
        typeDistribution.documents.count++;
        typeDistribution.documents.bytes += f.size || 0;
      } else if (mime.startsWith('video/')) {
        typeDistribution.videos.count++;
        typeDistribution.videos.bytes += f.size || 0;
      } else if (mime.startsWith('audio/')) {
        typeDistribution.audio.count++;
        typeDistribution.audio.bytes += f.size || 0;
      } else {
        typeDistribution.other.count++;
        typeDistribution.other.bytes += f.size || 0;
      }
    }

    return {
      totalFiles: meta.files.length,
      totalBytes,
      totalFolders: (meta.folders || []).length,
      typeDistribution
    };
  }
}

export const storageEngine = new StorageEngine();

