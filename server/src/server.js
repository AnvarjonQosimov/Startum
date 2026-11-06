import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { realtimeHub } from './realtime/wsServer.js';
import { requestLogger } from './middleware/requestLogger.js';
import { initializeSeedData } from './seed/seedData.js';

import platformRoutes from './routes/platformRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import storageRoutes from './routes/storageRoutes.js';
import storagePublicRoutes from './routes/storagePublicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Attach WebSocket Hub to HTTP server
realtimeHub.attach(server);

// CORS configuration for cross-origin developer SDK & console
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-project-id', 'Range'],
  exposedHeaders: ['Content-Range', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global request logging & real-time telemetry middleware
app.use(requestLogger);

// Serve the standalone developer SDK directly from the server
const sdkPath = path.resolve(__dirname, '..', '..', 'sdk', 'stratum-sdk.js');
app.get('/sdk/stratum-sdk.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.sendFile(sdkPath);
});

// Root API Health and System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Stratum Cloud Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    realtimeConnectedClients: realtimeHub.getActiveConnectionsCount()
  });
});

// Public File Storage downloads & previews
app.use('/storage', storagePublicRoutes);

// Platform Administration & Developer Console routes
app.use('/api/v1/platform', platformRoutes);

// Project Services Gateway
app.use('/api/v1/projects/:projectId/db', databaseRoutes);
app.use('/api/v1/projects/:projectId/storage', storageRoutes);
app.use('/api/v1/projects/:projectId/auth', authRoutes);
app.use('/api/v1/projects/:projectId/security', securityRoutes);
app.use('/api/v1/projects/:projectId/analytics', analyticsRoutes);

// Serve Production Client Dist if available
const clientDistPath = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    // If request does not start with /api, /storage, /sdk, /ws, serve index.html
    if (!req.path.startsWith('/api') && !req.path.startsWith('/storage') && !req.path.startsWith('/sdk')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Stratum Engine Error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Initialize seed data before listening
initializeSeedData();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Stratum Next-Gen Cloud BaaS Platform is LIVE!`);
  console.log(`🖥️  Developer Console: http://localhost:${PORT}`);
  console.log(`📡 REST API: http://localhost:${PORT}/api/v1`);
  console.log(`⚡ WebSocket Hub: ws://localhost:${PORT}/ws`);
  console.log(`📦 JavaScript SDK: http://localhost:${PORT}/sdk/stratum-sdk.js`);
  console.log(`======================================================\n`);
});
