const jwt = require('jsonwebtoken');
const promClient = require('prom-client');
const logger = require('../logger');
const pubsub = require('./pubsub');
const { getSecret } = require('../config/secrets');

const ANALYSIS_EVENTS_CHANNEL = 'analysis-events';
const HEARTBEAT_INTERVAL_MS = 30000;

function metric(Type, opts) {
  const existing = promClient.register.getSingleMetric(opts.name);
  if (existing) {
    return existing;
  }
  return new Type(opts);
}
const wsConnectionsGauge = metric(promClient.Gauge, {
  name: 'websocket_connections_active',
  help: 'Number of currently connected WebSocket clients',
});
const wsMessagesSentCounter = metric(promClient.Counter, {
  name: 'websocket_messages_sent_total',
  help: 'Total WebSocket messages sent to clients',
  labelNames: ['type'],
});

// userId -> Set<ws>
const clientsByUser = new Map();
// ws -> true for admin/monitoring subscribers that receive all analysis events
const adminSockets = new Set();

async function authenticate(token) {
  if (!token) {
    return null;
  }
  if (process.env.AUTH_PROVIDER === 'firebase') {
    try {
      const firebaseAdmin = require('../services/firebaseAdmin');
      firebaseAdmin.initFirebase();
      const decoded = await firebaseAdmin.verifyIdToken(token);
      return { sub: decoded.uid, role: decoded.role || (decoded.claims && decoded.claims.role) || 'user' };
    } catch (e) {
      return null;
    }
  }
  try {
    const payload = jwt.verify(token, getSecret('SECRET_KEY'));
    return { sub: payload.sub, role: payload.role || 'user' };
  } catch (e) {
    return null;
  }
}

function registerClient(userId, role, ws) {
  if (!clientsByUser.has(userId)) {
    clientsByUser.set(userId, new Set());
  }
  clientsByUser.get(userId).add(ws);
  if (role === 'admin') {
    adminSockets.add(ws);
  }
  wsConnectionsGauge.inc();
}

function unregisterClient(userId, ws) {
  const set = clientsByUser.get(userId);
  if (set) {
    set.delete(ws);
    if (set.size === 0) {
      clientsByUser.delete(userId);
    }
  }
  adminSockets.delete(ws);
  wsConnectionsGauge.dec();
}

function send(ws, type, data) {
  if (ws.readyState === 1 /* OPEN */) {
    ws.send(JSON.stringify({ type, data, ts: Date.now() }));
    wsMessagesSentCounter.inc({ type });
  }
}

function broadcastAnalysisEvent(event) {
  const targets = new Set(adminSockets);
  const userSockets = clientsByUser.get(String(event.userId));
  if (userSockets) {
    for (const ws of userSockets) {
      targets.add(ws);
    }
  }
  for (const ws of targets) {
    send(ws, 'analysis_update', event);
  }
}

function attachWebSocketServer(httpServer) {
  let WebSocketServer;
  try {
    ({ WebSocketServer } = require('ws'));
  } catch (e) {
    logger.warn({ err: e }, 'ws_package_missing_realtime_streaming_disabled');
    return null;
  }

  const wss = new WebSocketServer({ server: httpServer, path: process.env.WS_PATH || '/ws' });

  pubsub.subscribe(ANALYSIS_EVENTS_CHANNEL, broadcastAnalysisEvent);

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    const user = await authenticate(token);
    if (!user) {
      ws.close(4001, 'unauthorized');
      return;
    }

    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    registerClient(user.sub, user.role, ws);
    send(ws, 'connected', { userId: user.sub });

    ws.on('close', () => unregisterClient(user.sub, ws));
    ws.on('error', () => unregisterClient(user.sub, ws));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);
  wss.on('close', () => clearInterval(heartbeat));

  logger.info({ path: process.env.WS_PATH || '/ws' }, 'websocket_server_attached');
  return wss;
}

module.exports = { attachWebSocketServer, ANALYSIS_EVENTS_CHANNEL };
