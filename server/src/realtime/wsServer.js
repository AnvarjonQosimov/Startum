import { WebSocketServer, WebSocket } from 'ws';
import { dbEngine } from '../db/engine.js';

export class RealtimeHub {
  constructor() {
    this.wss = null;
    this.clients = new Set(); // set of client sockets
    // subscription maps
    this.subscriptions = new Map(); // socket -> Set of 'projectId:topic'
  }

  attach(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      this.subscriptions.set(ws, new Set());

      // Send initial welcome
      ws.send(JSON.stringify({
        type: 'connection_established',
        message: 'Connected to Stratum Realtime Engine',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (messageRaw) => {
        try {
          const payload = JSON.parse(messageRaw.toString());
          this.handleClientMessage(ws, payload);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', message: 'Malformed JSON message' }));
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.subscriptions.delete(ws);
      });

      ws.on('error', (err) => {
        console.warn('WebSocket error:', err.message);
        this.clients.delete(ws);
        this.subscriptions.delete(ws);
      });
    });

    // Hook into Database Engine notifications to automatically broadcast changes!
    this.initDbHooks();
  }

  initDbHooks() {
    // When any collection notifies, broadcast to subscribed clients
    const origNotify = dbEngine.notify.bind(dbEngine);
    dbEngine.notify = (projectId, collectionName, event) => {
      origNotify(projectId, collectionName, event);
      this.broadcastDbChange(projectId, collectionName, event);
    };
  }

  handleClientMessage(ws, data) {
    const { action, topic, projectId, collection } = data;
    const clientSubs = this.subscriptions.get(ws);
    if (!clientSubs) return;

    if (action === 'subscribe') {
      if (topic === 'db' && projectId && collection) {
        const subKey = `db:${projectId}:${collection}`;
        clientSubs.add(subKey);
        ws.send(JSON.stringify({ type: 'subscribed', topic: 'db', projectId, collection }));
      } else if (topic === 'logs' && projectId) {
        const subKey = `logs:${projectId}`;
        clientSubs.add(subKey);
        ws.send(JSON.stringify({ type: 'subscribed', topic: 'logs', projectId }));
      } else if (topic === 'project' && projectId) {
        const subKey = `project:${projectId}`;
        clientSubs.add(subKey);
        ws.send(JSON.stringify({ type: 'subscribed', topic: 'project', projectId }));
      }
    } else if (action === 'unsubscribe') {
      if (topic === 'db' && projectId && collection) {
        clientSubs.delete(`db:${projectId}:${collection}`);
      } else if (topic === 'logs' && projectId) {
        clientSubs.delete(`logs:${projectId}`);
      } else if (topic === 'project' && projectId) {
        clientSubs.delete(`project:${projectId}`);
      }
      ws.send(JSON.stringify({ type: 'unsubscribed', topic, projectId, collection }));
    } else if (action === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  }

  broadcastDbChange(projectId, collectionName, event) {
    const targetSubKey = `db:${projectId}:${collectionName}`;
    const payload = JSON.stringify({
      type: 'db_change',
      projectId,
      collection: collectionName,
      event,
      timestamp: new Date().toISOString()
    });

    for (const [ws, subs] of this.subscriptions.entries()) {
      if (ws.readyState === WebSocket.OPEN && subs.has(targetSubKey)) {
        ws.send(payload);
      }
    }
  }

  broadcastLog(projectId, logEntry) {
    const targetSubKey = `logs:${projectId}`;
    const payload = JSON.stringify({
      type: 'new_log',
      projectId,
      log: logEntry
    });

    for (const [ws, subs] of this.subscriptions.entries()) {
      if (ws.readyState === WebSocket.OPEN && subs.has(targetSubKey)) {
        ws.send(payload);
      }
    }
  }

  broadcastProjectEvent(projectId, event) {
    const targetSubKey = `project:${projectId}`;
    const payload = JSON.stringify({
      type: 'project_event',
      projectId,
      event
    });

    for (const [ws, subs] of this.subscriptions.entries()) {
      if (ws.readyState === WebSocket.OPEN && subs.has(targetSubKey)) {
        ws.send(payload);
      }
    }
  }

  getActiveConnectionsCount() {
    return this.clients.size;
  }
}

export const realtimeHub = new RealtimeHub();

