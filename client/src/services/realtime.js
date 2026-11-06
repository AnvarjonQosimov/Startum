class RealtimeClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map(); // topic -> Set of callbacks
    this.statusListeners = new Set();
    this.status = 'DISCONNECTED';
    this.reconnectTimer = null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus('CONNECTING');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this._setStatus('CONNECTED');
        // Resubscribe active subscriptions
        for (const [topicKey] of this.listeners.entries()) {
          const [topic, projectId, collection] = topicKey.split(':');
          this._send({
            action: 'subscribe',
            topic,
            projectId,
            collection
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this._dispatch(payload);
        } catch (e) {
          console.error('[Stratum Realtime] Parse error:', e);
        }
      };

      this.ws.onclose = () => {
        this._setStatus('DISCONNECTED');
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[Stratum Realtime] Socket error');
      };
    } catch (e) {
      this._setStatus('DISCONNECTED');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  _setStatus(newStatus) {
    this.status = newStatus;
    for (const cb of this.statusListeners) {
      try { cb(newStatus); } catch (e) {}
    }
  }

  _send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  _dispatch(message) {
    if (message.type === 'db_change') {
      const key = `db:${message.projectId}:${message.collection}`;
      const cbs = this.listeners.get(key);
      if (cbs) cbs.forEach(cb => cb(message.event));
    } else if (message.type === 'new_log') {
      const key = `logs:${message.projectId}`;
      const cbs = this.listeners.get(key);
      if (cbs) cbs.forEach(cb => cb(message.log));
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  subscribeDb(projectId, collection, callback) {
    const key = `db:${projectId}:${collection}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
      this._send({ action: 'subscribe', topic: 'db', projectId, collection });
    }
    this.listeners.get(key).add(callback);

    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(key);
          this._send({ action: 'unsubscribe', topic: 'db', projectId, collection });
        }
      }
    };
  }

  subscribeLogs(projectId, callback) {
    const key = `logs:${projectId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
      this._send({ action: 'subscribe', topic: 'logs', projectId });
    }
    this.listeners.get(key).add(callback);

    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(key);
          this._send({ action: 'unsubscribe', topic: 'logs', projectId });
        }
      }
    };
  }
}

export const realtime = new RealtimeClient();

