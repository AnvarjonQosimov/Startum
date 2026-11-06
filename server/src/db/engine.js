import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data', 'projects');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Get collection file path
function getCollectionPath(projectId, collectionName) {
  const safeName = collectionName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const projectDbDir = path.join(DATA_DIR, projectId, 'db');
  ensureDir(projectDbDir);
  return path.join(projectDbDir, `${safeName}.json`);
}

// Read collection documents
function readCollection(projectId, collectionName) {
  const filePath = getCollectionPath(projectId, collectionName);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading collection ${collectionName} for ${projectId}:`, err);
    return [];
  }
}

// Atomic write to collection file
function writeCollection(projectId, collectionName, docs) {
  const filePath = getCollectionPath(projectId, collectionName);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(docs, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

// Nested property getter (e.g. "profile.age" from { profile: { age: 25 } })
function getNestedValue(obj, dotPath) {
  if (!dotPath || !obj) return undefined;
  const parts = dotPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

export class DatabaseEngine {
  constructor() {
    this.listeners = new Map(); // key: `projectId:collectionName` -> Set of callback functions
  }

  // Subscribe to changes on a collection
  subscribe(projectId, collectionName, callback) {
    const key = `${projectId}:${collectionName}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(key);
      }
    };
  }

  notify(projectId, collectionName, event) {
    const key = `${projectId}:${collectionName}`;
    const set = this.listeners.get(key);
    if (set) {
      for (const cb of set) {
        try {
          cb(event);
        } catch (e) {
          console.error('Error in db subscriber callback:', e);
        }
      }
    }
  }

  // List all collections in a project
  listCollections(projectId) {
    const projectDbDir = path.join(DATA_DIR, projectId, 'db');
    ensureDir(projectDbDir);
    const files = fs.readdirSync(projectDbDir);
    return files
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => {
        const name = f.replace('.json', '');
        const docs = readCollection(projectId, name);
        const stats = fs.statSync(path.join(projectDbDir, f));
        return {
          name,
          documentCount: docs.length,
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString()
        };
      });
  }

  // Create a new collection
  createCollection(projectId, collectionName) {
    const filePath = getCollectionPath(projectId, collectionName);
    if (!fs.existsSync(filePath)) {
      writeCollection(projectId, collectionName, []);
    }
    return { name: collectionName, documentCount: 0 };
  }

  // Delete a collection
  deleteCollection(projectId, collectionName) {
    const filePath = getCollectionPath(projectId, collectionName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.notify(projectId, collectionName, { action: 'collection_deleted', collection: collectionName });
      return true;
    }
    return false;
  }

  // Query documents with filter, sort, pagination, and text search
  queryDocuments(projectId, collectionName, options = {}) {
    const {
      filters = [], // array of { field, op: '=='|'!='|'>'|'<'|'>='|'<='|'in'|'array-contains'|'contains', value }
      sortBy = '_createdAt',
      sortOrder = 'desc', // 'asc' | 'desc'
      limit = 50,
      offset = 0,
      search = ''
    } = options;

    let docs = readCollection(projectId, collectionName);
    const totalBeforeFilters = docs.length;

    // Apply text search across all string fields if provided
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      docs = docs.filter(doc => {
        const str = JSON.stringify(doc).toLowerCase();
        return str.includes(q);
      });
    }

    // Apply filters
    if (Array.isArray(filters) && filters.length > 0) {
      docs = docs.filter(doc => {
        return filters.every(f => {
          const docVal = getNestedValue(doc, f.field);
          switch (f.op) {
            case '==':
              return docVal === f.value;
            case '!=':
              return docVal !== f.value;
            case '>':
              return docVal > f.value;
            case '>=':
              return docVal >= f.value;
            case '<':
              return docVal < f.value;
            case '<=':
              return docVal <= f.value;
            case 'in':
              return Array.isArray(f.value) && f.value.includes(docVal);
            case 'array-contains':
              return Array.isArray(docVal) && docVal.includes(f.value);
            case 'contains':
              return typeof docVal === 'string' && docVal.toLowerCase().includes(String(f.value).toLowerCase());
            default:
              return true;
          }
        });
      });
    }

    // Sorting
    if (sortBy) {
      docs.sort((a, b) => {
        const valA = getNestedValue(a, sortBy);
        const valB = getNestedValue(b, sortBy);
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        const res = valA > valB ? 1 : -1;
        return sortOrder === 'asc' ? res : -res;
      });
    }

    const totalFiltered = docs.length;
    const paginated = docs.slice(offset, offset + limit);

    return {
      documents: paginated,
      total: totalFiltered,
      totalUnfiltered: totalBeforeFilters,
      limit,
      offset
    };
  }

  // Get a single document by ID
  getDocument(projectId, collectionName, docId) {
    const docs = readCollection(projectId, collectionName);
    return docs.find(d => d._id === docId) || null;
  }

  // Create a document
  createDocument(projectId, collectionName, data, customId = null) {
    const docs = readCollection(projectId, collectionName);
    const id = customId ? String(customId) : `doc_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    
    // Check for ID conflict if custom ID is used
    if (customId && docs.some(d => d._id === id)) {
      throw new Error(`Document with ID "${id}" already exists in ${collectionName}`);
    }

    const now = new Date().toISOString();
    const newDoc = {
      ...data,
      _id: id,
      _createdAt: now,
      _updatedAt: now
    };

    docs.unshift(newDoc);
    writeCollection(projectId, collectionName, docs);

    this.notify(projectId, collectionName, {
      action: 'document_created',
      collection: collectionName,
      docId: id,
      document: newDoc
    });

    return newDoc;
  }

  // Update a document (merge or replace)
  updateDocument(projectId, collectionName, docId, data, merge = true) {
    const docs = readCollection(projectId, collectionName);
    const index = docs.findIndex(d => d._id === docId);
    if (index === -1) {
      throw new Error(`Document with ID "${docId}" not found in collection ${collectionName}`);
    }

    const existing = docs[index];
    const now = new Date().toISOString();

    const updatedDoc = merge
      ? { ...existing, ...data, _id: docId, _createdAt: existing._createdAt, _updatedAt: now }
      : { ...data, _id: docId, _createdAt: existing._createdAt, _updatedAt: now };

    docs[index] = updatedDoc;
    writeCollection(projectId, collectionName, docs);

    this.notify(projectId, collectionName, {
      action: 'document_updated',
      collection: collectionName,
      docId,
      document: updatedDoc
    });

    return updatedDoc;
  }

  // Delete a document
  deleteDocument(projectId, collectionName, docId) {
    const docs = readCollection(projectId, collectionName);
    const index = docs.findIndex(d => d._id === docId);
    if (index === -1) {
      return false;
    }

    const removed = docs.splice(index, 1)[0];
    writeCollection(projectId, collectionName, docs);

    this.notify(projectId, collectionName, {
      action: 'document_deleted',
      collection: collectionName,
      docId,
      document: removed
    });

    return true;
  }

  // Batch write operations
  batchWrite(projectId, operations = []) {
    const results = [];
    for (const op of operations) {
      // op: { type: 'create'|'update'|'delete', collection, docId, data, merge }
      try {
        if (op.type === 'create') {
          const doc = this.createDocument(projectId, op.collection, op.data, op.docId);
          results.push({ success: true, op: 'create', doc });
        } else if (op.type === 'update') {
          const doc = this.updateDocument(projectId, op.collection, op.docId, op.data, op.merge !== false);
          results.push({ success: true, op: 'update', doc });
        } else if (op.type === 'delete') {
          const success = this.deleteDocument(projectId, op.collection, op.docId);
          results.push({ success, op: 'delete', docId: op.docId });
        }
      } catch (err) {
        results.push({ success: false, error: err.message, op });
      }
    }
    return results;
  }

  // Indexes management
  getIndexes(projectId) {
    const projectDbDir = path.join(DATA_DIR, projectId, 'db');
    ensureDir(projectDbDir);
    const indexPath = path.join(projectDbDir, '_indexes.json');
    if (!fs.existsSync(indexPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  createIndex(projectId, { collection, field, order = 'asc' }) {
    const projectDbDir = path.join(DATA_DIR, projectId, 'db');
    ensureDir(projectDbDir);
    const indexPath = path.join(projectDbDir, '_indexes.json');
    const indexes = this.getIndexes(projectId);
    const newIdx = {
      id: `idx_${uuidv4().slice(0, 8)}`,
      collection,
      field,
      order,
      status: 'READY',
      createdAt: new Date().toISOString()
    };
    indexes.push(newIdx);
    fs.writeFileSync(indexPath, JSON.stringify(indexes, null, 2), 'utf-8');
    return newIdx;
  }

  deleteIndex(projectId, indexId) {
    const projectDbDir = path.join(DATA_DIR, projectId, 'db');
    const indexPath = path.join(projectDbDir, '_indexes.json');
    let indexes = this.getIndexes(projectId);
    indexes = indexes.filter(idx => idx.id !== indexId);
    fs.writeFileSync(indexPath, JSON.stringify(indexes, null, 2), 'utf-8');
    return true;
  }

  // Get total database metrics for a project
  getStats(projectId) {
    const collections = this.listCollections(projectId);
    let totalDocs = 0;
    let totalBytes = 0;
    for (const c of collections) {
      totalDocs += c.documentCount;
      totalBytes += c.sizeBytes;
    }
    return {
      collectionCount: collections.length,
      documentCount: totalDocs,
      sizeBytes: totalBytes,
      collections
    };
  }
}

export const dbEngine = new DatabaseEngine();

