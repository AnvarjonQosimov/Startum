const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('stratum_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.body = JSON.stringify(options.body);
  }

  // Remove Content-Type header if FormData is used (browser sets boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Developer Platform Auth
  login: (email, password) => request('/platform/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password, name) => request('/platform/auth/register', { method: 'POST', body: { email, password, name } }),
  getMe: () => request('/platform/auth/me'),

  // Projects
  getProjects: () => request('/platform/projects'),
  getProject: (id) => request(`/platform/projects/${id}`),
  createProject: (data) => request('/platform/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/platform/projects/${id}`, { method: 'PUT', body: data }),
  deleteProject: (id) => request(`/platform/projects/${id}`, { method: 'DELETE' }),
  regenerateApiKey: (id) => request(`/platform/projects/${id}/regenerate-keys`, { method: 'POST' }),
  getOverview: () => request('/platform/overview'),

  // Project Members
  addMember: (projectId, data) => request(`/platform/projects/${projectId}/members`, { method: 'POST', body: data }),
  updateMember: (projectId, memberId, role) => request(`/platform/projects/${projectId}/members/${memberId}`, { method: 'PUT', body: { role } }),
  removeMember: (projectId, memberId) => request(`/platform/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),

  // Database
  getCollections: (projectId) => request(`/projects/${projectId}/db/collections`),
  createCollection: (projectId, name) => request(`/projects/${projectId}/db/collections`, { method: 'POST', body: { name } }),
  deleteCollection: (projectId, name) => request(`/projects/${projectId}/db/collections/${name}`, { method: 'DELETE' }),
  queryDocuments: (projectId, collection, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/db/${collection}${query ? `?${query}` : ''}`);
  },
  getDocument: (projectId, collection, docId) => request(`/projects/${projectId}/db/${collection}/${docId}`),
  createDocument: (projectId, collection, data) => request(`/projects/${projectId}/db/${collection}`, { method: 'POST', body: data }),
  updateDocument: (projectId, collection, docId, data, merge = true) => request(`/projects/${projectId}/db/${collection}/${docId}`, { method: 'PUT', body: { ...data, merge } }),
  deleteDocument: (projectId, collection, docId) => request(`/projects/${projectId}/db/${collection}/${docId}`, { method: 'DELETE' }),
  getIndexes: (projectId) => request(`/projects/${projectId}/db/config/indexes`),
  createIndex: (projectId, data) => request(`/projects/${projectId}/db/config/indexes`, { method: 'POST', body: data }),
  deleteIndex: (projectId, indexId) => request(`/projects/${projectId}/db/config/indexes/${indexId}`, { method: 'DELETE' }),

  // Cloud Storage
  listFiles: (projectId, folder = '/') => request(`/projects/${projectId}/storage/files?folder=${encodeURIComponent(folder)}`),
  uploadFiles: (projectId, formData) => request(`/projects/${projectId}/storage/upload`, { method: 'POST', body: formData }),
  createFolder: (projectId, folderPath) => request(`/projects/${projectId}/storage/folders`, { method: 'POST', body: { folderPath } }),
  updateFile: (projectId, fileId, data) => request(`/projects/${projectId}/storage/files/${fileId}`, { method: 'PUT', body: data }),
  deleteFile: (projectId, fileId) => request(`/projects/${projectId}/storage/files/${fileId}`, { method: 'DELETE' }),
  getStorageStats: (projectId) => request(`/projects/${projectId}/storage/stats`),

  // Authentication (Project End-Users)
  getUsers: (projectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/auth/users${query ? `?${query}` : ''}`);
  },
  createUser: (projectId, data) => request(`/projects/${projectId}/auth/users`, { method: 'POST', body: data }),
  updateUser: (projectId, uid, data) => request(`/projects/${projectId}/auth/users/${uid}`, { method: 'PUT', body: data }),
  deleteUser: (projectId, uid) => request(`/projects/${projectId}/auth/users/${uid}`, { method: 'DELETE' }),
  getAuthLogs: (projectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/auth/logs${query ? `?${query}` : ''}`);
  },
  getAuthSettings: (projectId) => request(`/projects/${projectId}/auth/settings`),
  updateAuthSettings: (projectId, data) => request(`/projects/${projectId}/auth/settings`, { method: 'PUT', body: data }),
  requestPasswordReset: (projectId, email) => request(`/projects/${projectId}/auth/password-reset`, { method: 'POST', body: { email } }),

  // Security Rules
  getRules: (projectId) => request(`/projects/${projectId}/security/rules`),
  saveRules: (projectId, rules) => request(`/projects/${projectId}/security/rules`, { method: 'PUT', body: { rules } }),
  testRule: (projectId, data) => request(`/projects/${projectId}/security/test`, { method: 'POST', body: data }),

  // Analytics & Logs
  getAnalytics: (projectId, timeframe = '7d') => request(`/projects/${projectId}/analytics/metrics?timeframe=${timeframe}`),
  getLogs: (projectId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/projects/${projectId}/analytics/logs${query ? `?${query}` : ''}`);
  }
};

