/**
 * Stratum Cloud Developer SDK (JavaScript / TypeScript / Browser / Node)
 * Version: 1.0.0
 * Next-Generation Backend-as-a-Service Platform Client Library
 */

class StratumApp {
  constructor(config = {}) {
    if (!config.projectId) {
      throw new Error('[Stratum SDK] "projectId" is required in initializeApp({ projectId, apiKey })');
    }
    if (!config.apiKey) {
      throw new Error('[Stratum SDK] "apiKey" is required in initializeApp({ projectId, apiKey })');
    }

    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
    this.endpoint = (config.endpoint || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')).replace(/\/$/, '');
    this.wsEndpoint = this.endpoint.replace(/^http/, 'ws');
    this.token = null; // End-user JWT token if signed in
    this._authListeners = new Set();
  }

  setAuthToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-project-id': this.projectId
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(path, options = {}) {
    const url = `${this.endpoint}/api/v1/projects/${this.projectId}${path}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(url, {
      ...options,
      headers
    });

    const isJson = (res.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const errorMsg = data?.error || `HTTP ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }
}

// Global active instances
const instances = new Map();

export function initializeApp(config) {
  const app = new StratumApp(config);
  instances.set(config.projectId, app);
  return app;
}

// ---------------------------------------------------------
// DATABASE MODULE
// ---------------------------------------------------------

class StratumDatabase {
  constructor(app) {
    this.app = app;
    this.ws = null;
    this.subscriptions = new Map(); // collection -> Set of callbacks
    this._connectWebSocket();
  }

  _connectWebSocket() {
    if (typeof WebSocket === 'undefined') return;

    try {
      this.ws = new WebSocket(`${this.app.wsEndpoint}/ws`);

      this.ws.onopen = () => {
        // Re-subscribe all active collections on connect/reconnect
        for (const col of this.subscriptions.keys()) {
          this.ws.send(JSON.stringify({
            action: 'subscribe',
            topic: 'db',
            projectId: this.app.projectId,
            collection: col
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'db_change' && msg.collection && this.subscriptions.has(msg.collection)) {
            const callbacks = this.subscriptions.get(msg.collection);
            callbacks.forEach(cb => {
              try { cb(msg.event); } catch (e) { console.error(e); }
            });
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        // Reconnect after 3 seconds
        setTimeout(() => this._connectWebSocket(), 3000);
      };
    } catch (err) {
      console.warn('[Stratum SDK] Realtime WebSocket connection error:', err);
    }
  }

  _subscribeCollection(collectionName, callback) {
    if (!this.subscriptions.has(collectionName)) {
      this.subscriptions.set(collectionName, new Set());
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          action: 'subscribe',
          topic: 'db',
          projectId: this.app.projectId,
          collection: collectionName
        }));
      }
    }

    this.subscriptions.get(collectionName).add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.subscriptions.get(collectionName);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.subscriptions.delete(collectionName);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              action: 'unsubscribe',
              topic: 'db',
              projectId: this.app.projectId,
              collection: collectionName
            }));
          }
        }
      }
    };
  }
}

export function getDatabase(app) {
  return new StratumDatabase(app);
}

export function collection(db, collectionName) {
  return {
    db,
    type: 'collection',
    name: collectionName
  };
}

export function doc(dbOrCol, ...paths) {
  let db, colName, docId;
  if (dbOrCol.type === 'collection') {
    db = dbOrCol.db;
    colName = dbOrCol.name;
    docId = paths[0];
  } else {
    db = dbOrCol;
    colName = paths[0];
    docId = paths[1];
  }
  return {
    db,
    type: 'doc',
    collectionName: colName,
    id: docId
  };
}

export async function getDocs(collectionRef, queryOptions = {}) {
  const { filters, sortBy, sortOrder, limit, offset, search } = queryOptions;
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  if (sortBy) params.set('sortBy', sortBy);
  if (sortOrder) params.set('sortOrder', sortOrder);
  if (search) params.set('search', search);
  if (filters) params.set('filters', JSON.stringify(filters));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await collectionRef.db.app.request(`/db/${collectionRef.name}${queryStr}`, {
    method: 'GET'
  });
  return res.documents;
}

export async function getDoc(docRef) {
  const res = await docRef.db.app.request(`/db/${docRef.collectionName}/${docRef.id}`, {
    method: 'GET'
  });
  return res.document;
}

export async function addDoc(collectionRef, data, customId = null) {
  const body = customId ? { ...data, _id: customId } : data;
  const res = await collectionRef.db.app.request(`/db/${collectionRef.name}`, {
    method: 'POST',
    body
  });
  return res.document;
}

export async function setDoc(docRef, data, options = { merge: true }) {
  const res = await docRef.db.app.request(`/db/${docRef.collectionName}/${docRef.id}`, {
    method: 'PUT',
    body: { ...data, merge: options.merge !== false }
  });
  return res.document;
}

export async function updateDoc(docRef, data) {
  return setDoc(docRef, data, { merge: true });
}

export async function deleteDoc(docRef) {
  const res = await docRef.db.app.request(`/db/${docRef.collectionName}/${docRef.id}`, {
    method: 'DELETE'
  });
  return res.success;
}

export function onSnapshot(targetRef, callback) {
  const collectionName = targetRef.type === 'collection' ? targetRef.name : targetRef.collectionName;
  const db = targetRef.db;

  // Initial fetch then listen
  if (targetRef.type === 'collection') {
    getDocs(targetRef).then(docs => callback(docs)).catch(err => console.error(err));
  } else {
    getDoc(targetRef).then(d => callback(d)).catch(err => console.error(err));
  }

  return db._subscribeCollection(collectionName, async (event) => {
    if (targetRef.type === 'collection') {
      const freshDocs = await getDocs(targetRef);
      callback(freshDocs, event);
    } else {
      if (event.docId === targetRef.id) {
        if (event.action === 'document_deleted') {
          callback(null, event);
        } else {
          callback(event.document, event);
        }
      }
    }
  });
}

// ---------------------------------------------------------
// STORAGE MODULE
// ---------------------------------------------------------

class StratumStorage {
  constructor(app) {
    this.app = app;
  }
}

export function getStorage(app) {
  return new StratumStorage(app);
}

export function ref(storage, filePath) {
  return {
    storage,
    path: filePath.startsWith('/') ? filePath : `/${filePath}`
  };
}

export async function uploadFile(storageRef, file, options = {}) {
  const folder = storageRef.path.substring(0, storageRef.path.lastIndexOf('/')) || '/';
  const isPublic = options.isPublic !== false;

  const formData = new FormData();
  formData.append('files', file);
  formData.append('folder', folder);
  formData.append('isPublic', String(isPublic));
  if (options.metadata) {
    formData.append('metadata', JSON.stringify(options.metadata));
  }

  const url = `${storageRef.storage.app.endpoint}/api/v1/projects/${storageRef.storage.app.projectId}/storage/upload`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': storageRef.storage.app.apiKey,
      'x-project-id': storageRef.storage.app.projectId,
      ...(storageRef.storage.app.token ? { 'Authorization': `Bearer ${storageRef.storage.app.token}` } : {})
    },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.files[0];
}

export async function getDownloadURL(fileOrRef) {
  if (typeof fileOrRef === 'object' && fileOrRef.publicUrl) {
    return fileOrRef.publicUrl;
  }
  if (typeof fileOrRef === 'object' && fileOrRef.downloadUrl) {
    return fileOrRef.downloadUrl;
  }
  return fileOrRef;
}

export async function deleteFile(storage, fileId) {
  return storage.app.request(`/storage/files/${fileId}`, {
    method: 'DELETE'
  });
}

export async function listFiles(storage, folder = '/') {
  return storage.app.request(`/storage/files?folder=${encodeURIComponent(folder)}`, {
    method: 'GET'
  });
}

// ---------------------------------------------------------
// AUTHENTICATION MODULE
// ---------------------------------------------------------

class StratumAuth {
  constructor(app) {
    this.app = app;
    this.currentUser = null;
    this.listeners = new Set();
  }

  _notify(user) {
    this.currentUser = user;
    for (const cb of this.listeners) {
      try { cb(user); } catch (e) { console.error(e); }
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  }
}

export function getAuth(app) {
  return new StratumAuth(app);
}

export async function signUp(auth, email, password, displayName = '', customClaims = {}) {
  const res = await auth.app.request('/auth/signup', {
    method: 'POST',
    body: { email, password, displayName, customClaims }
  });
  auth.app.setAuthToken(res.token);
  auth._notify(res.user);
  return res;
}

export async function signIn(auth, email, password) {
  const res = await auth.app.request('/auth/signin', {
    method: 'POST',
    body: { email, password }
  });
  auth.app.setAuthToken(res.token);
  auth._notify(res.user);
  return res;
}

export async function signInWithGoogle(auth, googlePayload = {}) {
  const res = await auth.app.request('/auth/google', {
    method: 'POST',
    body: googlePayload
  });
  auth.app.setAuthToken(res.token);
  auth._notify(res.user);
  return res;
}

export async function signOut(auth) {
  auth.app.setAuthToken(null);
  auth._notify(null);
  return { success: true };
}

export async function sendPasswordReset(auth, email) {
  return auth.app.request('/auth/password-reset', {
    method: 'POST',
    body: { email }
  });
}

// Global browser window export
if (typeof window !== 'undefined') {
  window.Stratum = {
    initializeApp,
    getDatabase,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    getStorage,
    ref,
    uploadFile,
    getDownloadURL,
    deleteFile,
    listFiles,
    getAuth,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    sendPasswordReset
  };
}

