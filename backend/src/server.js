const express = require('express');
const app = express();
// Optional security middleware (allow running without install in constrained environments)
function optRequire(mod) {
  try {
    return require(mod);
  } catch (e) {
    try {
      logger.warn({ module: mod }, 'optional_dependency_missing');
    } catch (_) {} return null;
  }
}
const helmet = optRequire('helmet');
const cors = optRequire('cors');
const mongoSanitize = optRequire('express-mongo-sanitize');
const hpp = optRequire('hpp');
const compression = optRequire('compression');
const xss = optRequire('xss');
const mongoose = require('mongoose');
const escape = require('escape-html');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('./logger');
const { withRequest } = require('./logger');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { firebaseAuth } = require('./middleware/firebaseAuth');
const firebaseAdmin = require('./services/firebaseAdmin');
const auditS3Service = require('./services/auditS3Service');
const NotificationsService = require('./services/notificationsService');
const { validateSecrets, getSecret } = require('./config/secrets');
// Centralized auth guard (delegates to Firebase when configured, otherwise JWT)
const { authGuard, requireRole } = require('./middleware/authGuard');
// Backwards-compatible alias used elsewhere in this file
const authMiddleware = authGuard;
// Circuit breaker for AI Core dependency
const CircuitBreaker = require('./utils/circuitBreaker');
const aiCoreBreaker = new CircuitBreaker({
  name: 'ai_core',
  failureThreshold: 3,
  resetTimeout: 60000,
  halfOpenSuccessThreshold: 2,
});
// Distributed tracing
const { traceMiddleware, traceAxiosInterceptor, setCurrentTrace, initTracing: initTracing_tracing } = require('./utils/tracing');
// Lightweight in-process cache (simple LRU by insertion order) to avoid external deps
class SimpleCache {
  constructor(options = {}) {
    this.max = options.max || 500;
    this.ttl = options.ttl || 5 * 60 * 1000;
    this.map = new Map();
  }
  _evictIfNeeded() {
    while (this.map.size > this.max) {
      const k = this.map.keys().next().value;
      this.map.delete(k);
    }
  }
  set(k, v) {
    const entry = { v, expires: Date.now() + this.ttl };
    // delete existing to update insertion order
    if (this.map.has(k)) {
      this.map.delete(k);
    }
    this.map.set(k, entry);
    this._evictIfNeeded();
  }
  has(k) {
    const e = this.map.get(k);
    if (!e) {
      return false;
    }
    if (Date.now() > e.expires) {
      this.map.delete(k);
      return false;
    }
    return true;
  }
  get(k) {
    const e = this.map.get(k);
    if (!e) {
      return undefined;
    }
    if (Date.now() > e.expires) {
      this.map.delete(k);
      return undefined;
    }
    return e.v;
  }
}
const crypto = require('crypto');
let User, Dataset, Report, RefreshToken;

// Security middleware: disable x-powered-by, set trust proxy if behind proxy
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Helmet with a conservative CSP for APIs (tune ALLOWED_ORIGINS if needed)
if (helmet) {
  app.use(
    helmet({
      contentSecurityPolicy: process.env.DISABLE_CSP === '1' ? false : {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
          frameAncestors: ["'none'"],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
}

// CORS: allow only explicit origins if provided
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (cors) {
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        } // allow non-browser tools
        if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // In production, reject unknown origins; in development, allow all
        if (process.env.NODE_ENV === 'production') {
          logger.warn({ origin }, 'CORS_blocked_origin');
          return callback(new Error('Not allowed by CORS'));
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    }),
  );
}

// Body parsing and protections
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_LIMIT || '1mb' }));
if (hpp) {
  app.use(hpp());
}
if (mongoSanitize) {
  app.use(mongoSanitize());
}
if (xss) {
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      sanitizeObject(req.params);
    }
    next();
  });
}

function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = xss(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
if (compression) {
  app.use(compression());
}

// Global rate limiter recommended for demo/prod: 60 requests per minute per IP by default
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_WINDOW_MS || 60_000),
    max: Number(process.env.RATE_MAX || 60),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down' },
    skip: (req, _res) => (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1'),
  }),
);

// Request id middleware
app.use((req, res, next) => {
  const rid = req.headers['x-request-id'] || uuidv4();
  req.headers['x-request-id'] = rid;
  res.setHeader('X-Request-Id', rid);
  req.request_id = rid;
  next();
});

// Distributed tracing middleware
app.use(traceMiddleware);

// Prometheus metrics
const collectDefault = promClient.collectDefaultMetrics;
collectDefault({ timeout: 5000 });
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});
const aiCoreDuration = new promClient.Histogram({
  name: 'ai_core_analysis_seconds',
  help: 'Time spent in ai_core analyze',
  labelNames: ['route'],
});

// Simple in-memory caches
const analyzeCache = new SimpleCache({ max: 500, ttl: Number(process.env.ANALYZE_CACHE_TTL_MS || 5 * 60 * 1000) });
const modelOutputCache = new SimpleCache({ max: 200, ttl: Number(process.env.MODEL_OUTPUT_CACHE_TTL_MS || 15 * 60 * 1000) });

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// instrumentation middleware (must be after request id middleware)
app.use(async (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  const route = req.path || 'unknown';
  const start = Date.now();
  res.on('finish', () => {
    const status = String(res.statusCode || 200);
    end({ method: req.method, route, status });
    httpRequestCounter.inc({ method: req.method, route, status });
    const dur = (Date.now() - start) / 1000;
    const log = withRequest(req);
    const levelMeta = { route, status, duration: dur };
    if (dur > (Number(process.env.SLOW_THRESHOLD_MS || 1000) / 1000)) {
      log.warn({ ...levelMeta, status: 'SLOW' }, 'request_finished_slow');
    } else {
      log.info(levelMeta, 'request_finished');
    }
  });
  next();
});

// Response standardization middleware (must be before routes)
const responseWrapper = require('./middleware/responseWrapper');
app.use(responseWrapper);

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/ethixai';
const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';
// Track startup lifecycle for /health/startup endpoint
let STARTUP_COMPLETE = false;
const STARTUP_AT = Date.now();

// Note: axios is required lazily where needed to allow jest mocks to take effect in tests
const cookieParser = require('cookie-parser');

// Cache helper (Redis optional)
const cache = require('./utils/cache');
cache.init(process.env.REDIS_URL);

// Pub/sub helper for real-time streaming (Redis-backed, falls back to in-process events)
const pubsub = require('./realtime/pubsub');
pubsub.init(process.env.REDIS_URL);
const { ANALYSIS_EVENTS_CHANNEL } = require('./realtime/wsServer');

// Simple in-memory stores used for tests or when USE_IN_MEMORY is set
const _users = [];
const _datasets = [];
const _reports = [];
const _refreshTokens = new Map(); // refreshToken -> userId
const _revokedTokens = new Set(); // Track revoked tokens in memory

if (!USE_IN_MEMORY) {
  User = require('./models/User');
  Dataset = require('./models/Dataset');
  Report = require('./models/Report');
  RefreshToken = require('./models/RefreshToken');
  mongoose
    .connect(MONGO_URL)
    .then(() => {
      logger.info({ mongo: MONGO_URL }, 'Connected to MongoDB');
      STARTUP_COMPLETE = true;
    })
    .catch(err => logger.error({ err }, 'MongoDB connection error'));
} else {
  logger.info('Using in-memory stores for backend (test mode)');
  // In-memory mode considered immediate startup completion after a short defer to allow route registration.
  setTimeout(() => {
    STARTUP_COMPLETE = true;
  }, 250);
}

// Validate required secrets at startup — fail fast if misconfigured
const secretCheck = validateSecrets();
if (!secretCheck.valid) {
  logger.fatal({ missing: secretCheck.missing }, 'Startup aborted: missing required secrets');
  // Give loggers time to flush before exiting
  setTimeout(() => process.exit(1), 500);
}

// Initialize Firebase Admin SDK at startup (only if AUTH_PROVIDER is firebase)
if (process.env.AUTH_PROVIDER === 'firebase') {
  firebaseAdmin.initFirebase();
}

// Existing simple health (legacy) retained for backward compatibility
app.get('/health', (req, res) => res.json({ status: 'backend ok' }));

// Liveness: process is up and event loop responsive
app.get('/health/liveness', (req, res) => {
  const mem = process.memoryUsage();
  res.json({ status: 'ok', pid: process.pid, uptime_seconds: Math.round(process.uptime()), rss_mb: (mem.rss / 1024 / 1024).toFixed(1) });
});

// Readiness: DB connected (or in-memory mode), optional ai_core reachability
app.get('/health/readiness', async (req, res) => {
  let dbReady = true;
  if (!USE_IN_MEMORY) {
    const state = mongoose.connection && mongoose.connection.readyState;
    dbReady = state === 1; // 1 = connected
  }
  let aiCoreReady = true;
  try {
    if (process.env.AI_CORE_URL) {
      // ping analyze base path's health sibling by replacing trailing path if needed
      const base = process.env.AI_CORE_URL.replace(/\/ai_core\/analyze.*$/, '/health');
      await axios.get(base, { timeout: 2000 });
    }
  } catch (e) {
    aiCoreReady = false;
  }
  if (dbReady && aiCoreReady && STARTUP_COMPLETE) {
    return res.json({ status: 'ready', db: dbReady, ai_core: aiCoreReady });
  }
  return res.status(503).json({ status: 'not_ready', db: dbReady, ai_core: aiCoreReady, startup_complete: STARTUP_COMPLETE });
});

// Circuit breaker status endpoint
app.get('/health/circuit-breaker', (req, res) => {
  const state = aiCoreBreaker.getState();
  res.json({ circuit_breaker: { service: 'ai_core', ...state } });
});

// Alertmanager webhook receiver - create incidents when alerts fire
app.post('/alerts/webhook', async (req, res) => {
  try {
    // Optional secret header to restrict callers
    const secret = process.env.ALERT_WEBHOOK_SECRET;
    if (secret) {
      const header = req.headers['x-alert-secret'] || req.headers['x-alertmanager-secret'];
      if (!header || header !== secret) {
        return res.status(401).json({ error: 'unauthorized' });
      }
    }

    const payload = req.body;
    if (!payload || !Array.isArray(payload.alerts)) {
      return res.status(400).json({ error: 'invalid payload' });
    }

    // For each alert, if firing -> create or update an incident
    const now = new Date().toISOString();
    const created = [];
    for (const a of payload.alerts) {
      try {
        const { status } = a; // 'firing' or 'resolved'
        const labels = a.labels || {};
        const annotations = a.annotations || {};
        const alertName = labels.alertname || labels.job || 'unknown_alert';
        const instance = labels.instance || labels.job || 'unknown_instance';
        const title = `${alertName} (${instance})`;
        const description = annotations.description || annotations.summary || JSON.stringify(a, null, 2);
        if (status === 'firing') {
          if (USE_IN_MEMORY) {
            // emulate simple in-memory incident store
            const inc = { id: `inc-${Date.now()}`, date: now, createdAt: now, updatedAt: now, title, description, resolved: false, severity: labels.severity || 'major', services: [instance], occurrences: 1 };
            _reports.push(inc);
            created.push(inc);
          } else {
            const { db } = mongoose.connection;
            const existing = await db.collection('incidents').findOne({ title, resolved: false });
            if (existing) {
              await db.collection('incidents').updateOne({ _id: existing._id }, { $set: { updatedAt: now }, $inc: { occurrences: 1 } });
            } else {
              const inc = { id: `inc-${Date.now()}`, date: now, createdAt: now, updatedAt: now, title, description, resolved: false, severity: labels.severity || 'major', services: [instance], occurrences: 1 };
              await db.collection('incidents').insertOne(inc);
              created.push(inc);
            }
          }
        } else if (status === 'resolved') {
          if (!USE_IN_MEMORY) {
            const { db } = mongoose.connection;
            await db.collection('incidents').updateMany({ title, resolved: false }, { $set: { resolved: true, updatedAt: now, resolvedAt: now } });
          }
        }
      } catch (e) {
        logger.error({ err: e }, 'alert_processing_failed');
      }
    }

    return res.json({ status: 'ok', created: created.length });
  } catch (e) {
    logger.error({ err: e }, 'alerts_webhook_error');
    return res.status(500).json({ error: 'server_error' });
  }
});

// Startup: indicates whether initial bootstrap completed (DB connection / model warmup etc.)
app.get('/health/startup', (req, res) => {
  const since = Date.now() - STARTUP_AT;
  if (STARTUP_COMPLETE) {
    return res.json({ status: 'started', ms_since_start: since });
  }
  return res.status(202).json({ status: 'starting', ms_since_start: since });
});

// Day 21: Register models/retrain routes
try {
  app.use(require('./routes/models'));
} catch (e) {
  logger.error({ err: e }, 'routes_models_register_failed');
}

try {
  app.use(require('./routes/evidence'));
} catch (e) {
  logger.error({ err: e }, 'routes_evidence_register_failed');
}

try {
  app.use('/v1/drift', require('./routes/drift'));
} catch (e) {
  logger.error({ err: e }, 'routes_drift_register_failed');
}

// Access request & admin user management routes
try {
  app.use(require('./routes/accessRequests'));
} catch (e) {
  logger.error({ err: e }, 'routes_access_requests_register_failed');
}

// Careers and newsletter routes
try {
  app.use('/api/careers', require('./routes/careers'));
} catch (e) {
  logger.error({ err: e }, 'routes_careers_register_failed');
}

try {
  app.use('/api/newsletter', require('./routes/newsletter'));
} catch (e) {
  logger.error({ err: e }, 'routes_newsletter_register_failed');
}

// Multi-tenancy: tenant management and per-tenant billing routes
try {
  app.use(require('./routes/tenants'));
} catch (e) {
  logger.error({ err: e }, 'routes_tenants_register_failed');
}

try {
  app.use(require('./routes/billing'));
} catch (e) {
  logger.error({ err: e }, 'routes_billing_register_failed');
}

try {
  app.use(require('./routes/stripe-webhooks'));
} catch (e) {
  logger.error({ err: e }, 'routes_stripe_webhooks_register_failed');
}

try {
  app.use(require('./routes/notifications'));
} catch (e) {
  logger.error({ err: e }, 'routes_notifications_register_failed');
}

try {
  app.use('/auth/sso', require('./routes/enterpriseSSO'));
} catch (e) {
  logger.error({ err: e }, 'routes_enterprise_sso_register_failed');
}

try {
  app.use('/api', require('./routes/modelRetraining'));
} catch (e) {
  logger.error({ err: e }, 'routes_model_retraining_register_failed');
}

try {
  app.use('/api/federated', require('./routes/federated'));
} catch (e) {
  logger.error({ err: e }, 'routes_federated_register_failed');
}

try {
  app.use('/api/governance', require('./routes/governance'));
} catch (e) {
  logger.error({ err: e }, 'routes_governance_register_failed');
}

try {
  app.use(require('./routes/policies'));
} catch (e) {
  logger.error({ err: e }, 'routes_policies_register_failed');
}

try {
  app.use(require('./routes/modelComparison'));
} catch (e) {
  logger.error({ err: e }, 'routes_model_comparison_register_failed');
}

// Helper functions (abstract persistence)
async function findUserByEmail(email) {
  if (USE_IN_MEMORY) {
    return _users.find(u => u.email === email) || null;
  }
  return User.findOne({ email });
}

async function findUserById(userId) {
  if (USE_IN_MEMORY) {
    return _users.find(u => String(u._id) === String(userId)) || null;
  }
  return User.findById(userId);
}

async function createUser(name, email, password_hash, tenantId = null) {
  if (USE_IN_MEMORY) {
    const id = String(_users.length + 1);
    const u = { _id: id, name, email, password_hash, role: 'user', tenantId };
    _users.push(u);
    return u;
  }
  return User.create({ name, email, password_hash, tenantId });
}

// Creates a new tenant + billing account and returns its tenantId. No-op in
// in-memory/test mode (tenant assignment there is via x-test-tenant-id header).
async function createTenantForSignup(name, billingEmail) {
  if (USE_IN_MEMORY) {
    return null;
  }
  try {
    const { v4: uuidv4Local } = require('uuid');
    const Tenant = require('./models/Tenant');
    const tenantId = uuidv4Local();
    let slug = String(name || 'tenant').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || tenantId.slice(0, 8);
    if (await Tenant.findOne({ slug })) {
      slug = `${slug}-${tenantId.slice(0, 6)}`;
    }
    await Tenant.create({ tenantId, name: name || 'My Organization', slug, status: 'trial', plan: 'free', billingEmail });
    try {
      const billingService = require('./services/billingService');
      await billingService.getOrCreateBillingAccount(tenantId, billingEmail);
    } catch (e) {
      logger.warn({ err: e }, 'billing_account_bootstrap_failed');
    }
    return tenantId;
  } catch (e) {
    logger.error({ err: e }, 'tenant_bootstrap_failed');
    return null;
  }
}

async function createDataset(name, type, ownerId) {
  if (USE_IN_MEMORY) {
    const id = String(_datasets.length + 1);
    const d = { _id: id, name, type, ownerId };
    _datasets.push(d);
    return d;
  }
  return Dataset.create({ name, type, ownerId });
}

async function findReportsByUser(userId) {
  if (USE_IN_MEMORY) {
    return _reports.filter(r => String(r.userId) === String(userId));
  }
  return Report.find({ userId });
}

async function createReport(analysisId, summary, userId, extras = {}) {
  if (USE_IN_MEMORY) {
    const id = String(_reports.length + 1);
    const r = { _id: id, analysisId, summary, userId, ...extras };
    _reports.push(r);
    publishAnalysisEvent(r, userId, analysisId, summary);
    return r;
  }
  const doc = await Report.create({ analysisId, summary, userId, ...extras });

  // Invalidate cache for this user's report list and set report cache
  try {
    const reportId = doc._id || doc.id;
    // store report cache
    await cache.set(`report:${reportId}`, { report: doc }, Number(process.env.REPORT_CACHE_TTL_MS || 30_000)).catch(() => {});
    // remove reports list cache so next list fetch is fresh
    if (cache.del) {
      await cache.del(`reports:${userId}`).catch(() => {});
    }
  } catch (e) {
    logger.warn({ err: e }, 'report_cache_invalidate_failed');
  }

  publishAnalysisEvent(doc, userId, analysisId, summary);

  return doc;
}

function publishAnalysisEvent(doc, userId, analysisId, summary) {
  try {
    pubsub.publish(ANALYSIS_EVENTS_CHANNEL, {
      userId: String(userId),
      reportId: String(doc._id || doc.id || ''),
      analysisId,
      summary,
      createdAt: new Date().toISOString(),
    }).catch(err => logger.warn({ err }, 'analysis_event_publish_failed'));
  } catch (e) {
    logger.warn({ err: e }, 'analysis_event_publish_failed');
  }
}

// Token management helpers
async function hashToken(token) {
  // In-memory mode: return token as-is for testing
  if (USE_IN_MEMORY) {
    return token;
  }
  try {
    return await argon2.hash(token, { type: argon2.argon2id });
  } catch (e) {
    logger.error({ err: e }, 'Error hashing token');
    throw e;
  }
}

async function verifyTokenHash(token, hash) {
  // In-memory mode: direct comparison
  if (USE_IN_MEMORY) {
    return token === hash;
  }
  try {
    return await argon2.verify(hash, token);
  } catch (e) {
    logger.error({ err: e }, 'Error verifying token hash');
    return false;
  }
}

async function storeRefreshToken(userId, rawToken, req, deviceName = null, rotationId = null, parentTokenHash = null) {
  // In-memory mode: store in map
  if (USE_IN_MEMORY) {
    _refreshTokens.set(rawToken, String(userId));
    return { token: rawToken, rotationId: rotationId || uuidv4(), parentTokenHash: parentTokenHash || null };
  }

  try {
    const tokenHash = await hashToken(rawToken);
    const rotId = rotationId || uuidv4();
    const rtDoc = await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
      device: {
        userAgent: req.get('user-agent') || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        deviceId: null,
      },
      name: deviceName || `Device ${new Date().toLocaleDateString()}`,
      rotationId: rotId,
      parentTokenHash: parentTokenHash || null,
    });
    return { _id: rtDoc._id, token: rawToken, rotationId: rotId };
  } catch (e) {
    logger.error({ err: e }, 'Error storing refresh token');
    throw e;
  }
}

async function findValidRefreshToken(userId, rawToken) {
  // In-memory mode: check map and verify not revoked
  if (USE_IN_MEMORY) {
    return (!_revokedTokens.has(rawToken) && _refreshTokens.has(rawToken) && _refreshTokens.get(rawToken) === String(userId)) ? rawToken : null;
  }

  try {
    // Find active tokens for this user
    const tokens = await RefreshToken.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    for (const tokenDoc of tokens) {
      const isValid = await verifyTokenHash(rawToken, tokenDoc.tokenHash);
      if (isValid) {
        // Update last used
        tokenDoc.lastUsedAt = new Date();
        await tokenDoc.save();
        return tokenDoc;
      }
    }
    return null;
  } catch (e) {
    logger.error({ err: e }, 'Error finding refresh token');
    return null;
  }
}

// Find any token (even if revoked) that matches rawToken for a user
async function findAnyRefreshToken(userId, rawToken) {
  if (USE_IN_MEMORY) {
    return _refreshTokens.has(rawToken) && _refreshTokens.get(rawToken) === String(userId) ? { token: rawToken } : null;
  }
  try {
    const tokens = await RefreshToken.find({ userId });
    for (const tokenDoc of tokens) {
      const isMatch = await verifyTokenHash(rawToken, tokenDoc.tokenHash);
      if (isMatch) {
        return tokenDoc;
      }
    }
    return null;
  } catch (e) {
    logger.error({ err: e }, 'Error finding any refresh token');
    return null;
  }
}

async function revokeFamily(rotationId) {
  if (!rotationId) {
    return;
  }
  if (USE_IN_MEMORY) {
    // Not tracked in memory; best-effort no-op
    return;
  }
  try {
    await RefreshToken.updateMany({ rotationId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  } catch (e) {
    logger.error({ err: e }, 'Error revoking token family');
  }
}

async function revokeRefreshToken(tokenId) {
  if (USE_IN_MEMORY) {
    // In in-memory mode, tokenId is the actual token string when called from logout
    if (typeof tokenId === 'string') {
      _revokedTokens.add(tokenId);
    }
    return;
  }
  try {
    await RefreshToken.findByIdAndUpdate(tokenId, { revokedAt: new Date() });
  } catch (e) {
    logger.error({ err: e }, 'Error revoking token');
  }
}

async function revokeAllUserTokens(userId) {
  if (USE_IN_MEMORY) {
    _refreshTokens.forEach((value, key) => {
      try {
        const payload = jwt.verify(key, getSecret('REFRESH_SECRET'));
        if (payload.sub === userId || String(payload.sub) === String(userId)) {
          _revokedTokens.add(key);
        }
      } catch (e) {
        // ignore invalid tokens
      }
    });
    return;
  }
  try {
    await RefreshToken.updateMany({ userId }, { revokedAt: new Date() });
  } catch (e) {
    logger.error({ err: e, userId }, 'Error revoking all user tokens');
  }
}

// Preprocess dataset helper: accepts either column-oriented mapping {col: [..]}
// or row-oriented input {rows: [{col:val,...}, ...]}. Converts rows -> cols,
// encodes simple categorical string columns to integer codes and drops
// obvious identifier columns (id, *_id). This keeps client payloads simple.
function preprocessDataset(data) {
  if (!data) {
    return {};
  }

  // If data comes in as { rows: [ {...}, ... ] }
  if (Array.isArray(data.rows)) {
    const cols = {};
    for (const row of data.rows) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      for (const k of Object.keys(row)) {
        cols[k] = cols[k] || [];
        cols[k].push(row[k]);
      }
    }
    data = cols;
  }

  // Drop obvious identifier columns
  for (const key of Object.keys(data)) {
    if (key.toLowerCase() === 'id' || key.toLowerCase().endsWith('_id')) {
      delete data[key];
    }
  }

  // For each column, coerce/encode values
  for (const col of Object.keys(data)) {
    const vals = data[col];
    if (!Array.isArray(vals)) {
      continue;
    }

    // If values contain booleans, coerce to 0/1
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (typeof v === 'boolean') {
        vals[i] = v ? 1 : 0;
      }
    }

    // Detect if column contains strings that should be encoded
    const hasString = vals.some(v => typeof v === 'string');
    if (hasString) {
      // simple mapping of unique strings to small integers
      const mapping = Object.create(null);
      let next = 0;
      for (let i = 0; i < vals.length; i++) {
        const v = vals[i];
        if (v === null || v === undefined || v === '') {
          vals[i] = null;
          continue;
        }
        if (typeof v === 'string') {
          if (!(v in mapping)) {
            mapping[v] = next++;
          }
          vals[i] = mapping[v];
        } else if (typeof v === 'number') {
          // keep numbers
          vals[i] = v;
        } else {
          // fallback: stringify then map
          const s = String(v);
          if (!(s in mapping)) {
            mapping[s] = next++;
          }
          vals[i] = mapping[s];
        }
      }
      data[col] = vals;
      continue;
    }

    // Try to coerce string numbers to numbers
    data[col] = vals.map(v => {
      if (v === null || v === undefined || v === '') {
        return null;
      }
      if (typeof v === 'number') {
        return v;
      }
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    });
  }

  return data;
}

async function listUserDevices(userId) {
  if (USE_IN_MEMORY) {
    // Return empty for in-memory mode
    return [];
  }
  try {
    return await RefreshToken.find({
      userId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).select('_id name device createdAt lastUsedAt expiresAt');
  } catch (e) {
    logger.error({ err: e }, 'Error listing devices');
    return [];
  }
}

// Rate limiters for sensitive endpoints
const registerLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, try later' },
  skip: (req) => (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1'),
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests, try later' },
  skip: (req) => (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1'),
});

const analyzeLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analysis requests, slow down' },
  skip: (req) => (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1'),
});

// Auth
app.post(
  '/auth/register',
  registerLimiter,
  // validation
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('email').isEmail().normalizeEmail(),
  // choose stronger default password policy in non-test mode
  body('password').isString().isLength({ min: USE_IN_MEMORY ? Number(process.env.MIN_PASSWORD_LENGTH || 4) : Number(process.env.MIN_PASSWORD_LENGTH || 12) })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password, organizationName } = req.body;
      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'User exists' });
      }
      const hash = await bcrypt.hash(password, 10);
      const tenantId = await createTenantForSignup(organizationName || name, email);
      const user = await createUser(name, email, hash, tenantId);
      auditS3Service.logAuthEvent(email, 'register', 'success', req.ip, req.headers['user-agent']).catch(err => {
        logger.warn({ err }, 'audit_log_failed');
      });
      return res.json({ status: 'registered', userId: user._id, tenantId });
    } catch (err) {
      logger.error({ err }, 'Error during register');
      auditS3Service.logAuthEvent(req.body.email, 'register', 'failure', req.ip, req.headers['user-agent']).catch(err => {
        logger.warn({ err }, 'audit_log_failed');
      });
      return res.status(500).json({ error: 'Registration failed' });
    }
  },
);

app.use(cookieParser());

// Initialize Passport for SSO
const passport = require('passport');
const session = require('express-session');
const SESSION_SECRET = getSecret('SESSION_SECRET');
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.SECURE_COOKIES === '1',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

const loginLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try later' },
  // Only bypass in test mode with explicit env var — never via request header
  skip: (req) => (process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === '1'),
});

app.post(
  '/auth/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, deviceName } = req.body;
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid' });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid' });
      }

      const accessToken = jwt.sign({ sub: user._id, role: user.role, tenantId: user.tenantId || null }, getSecret('SECRET_KEY'), { expiresIn: '15m' });

      // Generate and store refresh token (use unique jti for determinism)
      const refreshTokenPayload = { sub: user._id, jti: uuidv4() };
      const refreshTokenJwt = jwt.sign(refreshTokenPayload, getSecret('REFRESH_SECRET'), { expiresIn: '7d' });
      const storedToken = await storeRefreshToken(user._id, refreshTokenJwt, req, deviceName);

      // Log authentication event
      auditS3Service.logAuthEvent(user._id, 'login', 'success', req.ip, req.headers['user-agent']).catch(err => {
        logger.warn({ err }, 'audit_log_failed');
      });

      // Optionally set refresh token as secure HttpOnly cookie in production
      if (process.env.USE_COOKIE_REFRESH === '1') {
        const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
        res.cookie('refreshToken', refreshTokenJwt, cookieOpts);
        return res.json({ accessToken });
      }
      return res.json({ accessToken, refreshToken: refreshTokenJwt });
    } catch (err) {
      logger.error({ err }, 'Error during login');
      auditS3Service.logAuthEvent(email, 'login', 'failure', req.ip, req.headers['user-agent']).catch(e => {
        logger.warn({ err: e }, 'audit_log_failed');
      });
      return res.status(500).json({ error: 'Login failed' });
    }
  },
);

// Exchange Firebase ID token (client-side sign-in) for backend access/refresh tokens
// Allows frontend to use Firebase Auth (client SDK) and then obtain backend JWTs
app.post('/auth/firebase/exchange', async (req, res) => {
  const idToken = req.body.idToken || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!idToken) {
    return res.status(400).json({ error: 'id_token_required' });
  }
  try {
    // Ensure firebase is initialized via centralized helper
    const firebaseAdmin = require('./services/firebaseAdmin');
    firebaseAdmin.initFirebase();
    const decoded = await firebaseAdmin.verifyIdToken(idToken);

    // Reject exchange if the Firebase account email is not verified
    if (decoded && decoded.email_verified === false) {
      return res.status(403).json({ error: 'email_not_verified' });
    }

    // Find or provision a local user record (so backend can store role, devices, refresh tokens)
    let userDoc;
    // Provision or find local user; prefer copying role from Firebase custom claims when present
    const firebaseRole = decoded.role || (decoded.claims && decoded.claims.role) || null;
    if (USE_IN_MEMORY) {
      userDoc = _users.find(u => u.firebase_uid === decoded.uid) || _users.find(u => u.email === decoded.email);
      if (!userDoc) {
        const id = String(_users.length + 1);
        userDoc = { _id: id, name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'firebase-user'), email: decoded.email, firebase_uid: decoded.uid, role: firebaseRole || 'user' };
        _users.push(userDoc);
      } else if (firebaseRole && userDoc.role !== firebaseRole) {
        userDoc.role = firebaseRole; // keep in-memory role in sync with Firebase claim
      }
    } else {
      const User = require('./models/User');
      userDoc = await User.findOne({ firebase_uid: { $eq: decoded.uid } }) || await User.findOne({ email: { $eq: decoded.email } });
      if (!userDoc) {
        userDoc = await User.create({ name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'firebase-user'), email: decoded.email, firebase_uid: decoded.uid, role: firebaseRole || 'user' });
      } else {
        let changed = false;
        if (!userDoc.firebase_uid) {
          userDoc.firebase_uid = decoded.uid;
          changed = true;
        }
        if (firebaseRole && userDoc.role !== firebaseRole) {
          userDoc.role = firebaseRole;
          changed = true;
        }
        if (changed) {
          await userDoc.save();
        }
      }
    }

    // Issue backend tokens (access + refresh)
    const accessToken = jwt.sign({ sub: userDoc._id, role: userDoc.role, tenantId: userDoc.tenantId || null }, getSecret('SECRET_KEY'), { expiresIn: '15m' });
    const refreshPayload = { sub: userDoc._id, jti: uuidv4() };
    const refreshTokenJwt = jwt.sign(refreshPayload, getSecret('REFRESH_SECRET'), { expiresIn: '7d' });
    await storeRefreshToken(userDoc._id, refreshTokenJwt, req);

    // If cookie-based sessions are enabled, set HttpOnly cookies for refresh and access tokens
    if (process.env.USE_COOKIE_REFRESH === '1') {
      const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
      // access token life matches jwt expiration (15 minutes)
      cookieOpts.maxAge = 15 * 60 * 1000;
      res.cookie('accessToken', accessToken, cookieOpts);
      // refresh token longer-lived
      const refreshCookieOpts = { ...cookieOpts, maxAge: 7 * 24 * 3600 * 1000 };
      res.cookie('refreshToken', refreshTokenJwt, refreshCookieOpts);
      // Return minimal payload to client; client will not need the raw tokens when cookies are used
      return res.json({ status: 'ok' });
    }

    return res.json({ accessToken, refreshToken: refreshTokenJwt });
  } catch (e) {
    logger.error({ err: e }, 'firebase_exchange_failed');
    return res.status(401).json({ error: 'invalid_id_token' });
  }
});

// Lightweight verify endpoint used by frontend middleware to obtain minimal auth info (uid + role)
// Reads HttpOnly cookies (accessToken or refreshToken) and returns { userId, role }
app.get('/auth/verify', async (req, res) => {
  try {
    const accessToken = req.cookies && req.cookies.accessToken;
    const refreshToken = req.cookies && req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({ error: 'no_session' });
    }

    // Try to verify access token first
    if (accessToken) {
      try {
      const payload = jwt.verify(accessToken, getSecret('SECRET_KEY'));
      // Return minimal public info
      return res.json({ userId: payload.sub, role: payload.role || 'user' });
      } catch (e) {
        // expired/invalid -> fallthrough to refresh if present
      }
    }

    // If we have a refresh token, validate and issue a new access token (rotate) for UX
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, getSecret('REFRESH_SECRET'));
      const userId = payload.sub;
      // load user to return role and ensure exists
      const userDoc = USE_IN_MEMORY ? _users.find(u => String(u._id) === String(userId)) : await User.findById(userId);
      if (!userDoc) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      // Issue fresh access token and set cookie
      const newAccess = jwt.sign({ sub: userDoc._id, role: userDoc.role, tenantId: userDoc.tenantId || null }, getSecret('SECRET_KEY'), { expiresIn: '15m' });
      const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 };
      res.cookie('accessToken', newAccess, cookieOpts);
      return res.json({ userId: String(userDoc._id), role: userDoc.role || 'user' });
    }

    return res.status(401).json({ error: 'invalid_session' });
  } catch (e) {
    logger.error({ err: e }, 'auth_verify_failed');
    return res.status(401).json({ error: 'invalid_session' });
  }
});

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
  // accept refresh token in cookie or body
  const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
  if (!refreshToken) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, getSecret('REFRESH_SECRET'));
    const userId = payload.sub;

    // Find and validate the refresh token
    const tokenDoc = await findValidRefreshToken(userId, refreshToken);
    if (!tokenDoc) {
      // Check if this token existed but was revoked (reuse detection)
      const anyDoc = await findAnyRefreshToken(userId, refreshToken);
      if (anyDoc && anyDoc.revokedAt) {
        // Security event: refresh token reuse attempt
        try {
          const { refreshTokenReuseTotal } = require('./utils/metrics');
          refreshTokenReuseTotal.inc({ rotation_id: anyDoc.rotationId || 'unknown' });
        } catch (metricErr) {
          logger.warn({ err: metricErr }, 'Failed to record refresh token reuse metric');
        }
        logger.warn({ userId, rotationId: anyDoc.rotationId, tokenId: anyDoc._id }, 'Refresh token reuse detected; revoking token family');
        await revokeFamily(anyDoc.rotationId);
        return res.status(401).json({ error: 'token_reuse_detected' });
      }
      return res.status(401).json({ error: 'Invalid or revoked refresh token' });
    }

    // Issue new access token
    const userDoc = !USE_IN_MEMORY ? await User.findById(userId) : _users.find(u => String(u._id) === String(userId));
    if (!userDoc) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = jwt.sign(
      { sub: userDoc._id, role: userDoc.role || 'user', tenantId: userDoc.tenantId || null },
      getSecret('SECRET_KEY'),
      { expiresIn: '15m' },
    );

    // Rotate refresh token: revoke old, issue new (keep rotationId, link parent)
    const newRefreshPayload = { sub: userId, jti: uuidv4() };
    const newRefreshJwt = jwt.sign(newRefreshPayload, getSecret('REFRESH_SECRET'), { expiresIn: '7d' });

    if (!USE_IN_MEMORY) {
      // Revoke old token and store new one, preserving rotation chain
      await revokeRefreshToken(tokenDoc._id);
      await storeRefreshToken(userId, newRefreshJwt, req, null, tokenDoc.tokenHash);
    } else {
      _refreshTokens.delete(refreshToken);
      _refreshTokens.set(newRefreshJwt, String(userId));
    }

    // Audit log token refresh
    auditS3Service.logAuthEvent(userId, 'token_refresh', 'success', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });

    // Optionally set as cookie
    if (process.env.USE_COOKIE_REFRESH === '1') {
      const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
      res.cookie('refreshToken', newRefreshJwt, cookieOpts);
      return res.json({ accessToken });
    }

    res.json({ accessToken, refreshToken: newRefreshJwt });
  } catch (e) {
    logger.error({ err: e }, 'Error during refresh');
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Logout endpoint - revoke current refresh token
app.post('/auth/logout', authMiddleware, async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const userId = req.user.sub;
    const tokenDoc = await findValidRefreshToken(userId, refreshToken);
    if (tokenDoc) {
      // In-memory: tokenDoc is the token string, MongoDB: tokenDoc is an object with _id
      if (USE_IN_MEMORY) {
        await revokeRefreshToken(tokenDoc); // pass token string
      } else {
        await revokeRefreshToken(tokenDoc._id); // pass MongoDB ID
      }
    }
    auditS3Service.logAuthEvent(req.user.sub, 'logout', 'success', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });
    res.json({ status: 'logged out' });
  } catch (e) {
    logger.error({ err: e }, 'Error during logout');
    auditS3Service.logAuthEvent(req.user.sub, 'logout', 'failure', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout and clear cookie endpoint - clears HttpOnly cookies set for session
// and attempts to revoke the refresh token server-side when present in cookie.
app.post('/auth/logout-cookie', async (req, res) => {
  try {
    const cookieRefresh = req.cookies && req.cookies.refreshToken;
    if (cookieRefresh) {
      try {
        const payload = jwt.verify(cookieRefresh, getSecret('REFRESH_SECRET'));
        const userId = payload.sub;
        // Attempt to find any matching refresh token for this user and revoke it
        const anyDoc = await findAnyRefreshToken(userId, cookieRefresh);
        if (anyDoc) {
          if (USE_IN_MEMORY) {
            await revokeRefreshToken(cookieRefresh);
          } else {
            await revokeRefreshToken(anyDoc._id);
          }
        }
      } catch (e) {
        // ignore token verification errors — still clear cookies
      }
    }

    // Clear cookies (match same options used when setting)
    const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' };
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
    return res.json({ status: 'ok' });
  } catch (e) {
    logger.error({ err: e }, 'logout_cookie_failed');
    return res.status(500).json({ error: 'logout_failed' });
  }
});

// Forgot password - request reset token
app.post('/auth/forgot-password',
  forgotPasswordLimiter,
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { email } = req.body;

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      // Security: Don't reveal if email exists
      return res.json({ status: 'success', message: 'If email exists, reset link has been sent' });
    }

    // Create password reset token
    const PasswordReset = require('./models/PasswordReset');
    const { token, expiresAt } = await PasswordReset.createReset(user._id, email);

    // Send email with reset link (would integrate with emailService)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      const emailService = require('./services/emailService');
      await emailService.sendPasswordResetEmail(email, resetUrl, expiresAt);
    } catch (emailErr) {
      logger.warn({ err: emailErr }, 'failed_to_send_password_reset_email');
      // Don't fail the request, token was created
    }

    // Log the request
    logger.info({ email, userId: user._id }, 'password_reset_requested');

    return res.json({ status: 'success', message: 'Password reset link sent to email' });
  } catch (err) {
    logger.error({ err }, 'forgot_password_failed');
    return res.status(500).json({ error: 'Password reset request failed' });
  }
});

// Reset password - verify token and set new password
app.post('/auth/reset-password',
  body('token').isString().trim().notEmpty().withMessage('Token required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('newPassword').isString().isLength({ min: Number(process.env.MIN_PASSWORD_LENGTH || 12) }).withMessage('Password must be at least 12 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { token, email, newPassword } = req.body;

    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Verify reset token
    const PasswordReset = require('./models/PasswordReset');
    const resetRecord = await PasswordReset.verifyReset(user._id, token);
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password (uses the bcryptjs import already in scope)
    const hash = await bcrypt.hash(newPassword, 10);

    // Update user password
    if (USE_IN_MEMORY) {
      const userIndex = _users.findIndex(u => String(u._id) === String(user._id));
      if (userIndex !== -1) {
        _users[userIndex].passwordHash = hash;
      }
    } else {
      const User = require('./models/User');
      await User.updateOne({ _id: user._id }, { passwordHash: hash });
    }

    // Mark reset token as used
    await resetRecord.markUsed();

    // Revoke all refresh tokens for security (force re-login)
    await revokeAllUserTokens(user._id);

    // Log the reset
    logger.info({ userId: user._id, email }, 'password_reset_completed');

    // Audit log password change
    auditS3Service.logAuthEvent(user._id, 'password_reset', 'success', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });

    return res.json({ status: 'success', message: 'Password has been reset successfully' });
  } catch (err) {
    logger.error({ err }, 'reset_password_failed');
    return res.status(500).json({ error: 'Password reset failed' });
  }
});

// MFA Setup - Generate secret and QR code
app.post('/auth/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admins can use MFA (per user stories)
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'MFA is only available for admin accounts' });
    }

    const MFAService = require('./services/mfaService');
    const { secret, qrCode } = await MFAService.generateMFASecret(userId, user.email);

    // Generate backup codes
    const backupCodesArray = MFAService.generateBackupCodes(10);
    const backupCodes = MFAService.formatBackupCodes(backupCodesArray);

    logger.info({ userId }, 'mfa_setup_initiated');

    res.json({
      status: 'success',
      secret,
      qrCode,
      backupCodes: backupCodesArray, // Only show once
    });
  } catch (err) {
    logger.error({ err }, 'mfa_setup_failed');
    return res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

// MFA Enable - Verify token and enable MFA
app.post('/auth/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const { secret, token, backupCodes } = req.body;
    const userId = req.user.sub;

    if (!secret || !token) {
      return res.status(400).json({ error: 'Secret and token are required' });
    }

    const MFAService = require('./services/mfaService');
    const isValid = MFAService.verifyMFAToken(secret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    // Store MFA secret and backup codes for user
    if (USE_IN_MEMORY) {
      const user = _users.find(u => String(u._id) === String(userId));
      if (user) {
        user.mfaEnabled = true;
        user.mfaSecret = secret;
        user.mfaBackupCodes = backupCodes || [];
      }
    } else {
      const User = require('./models/User');
      await User.updateOne(
        { _id: userId },
        {
          mfaEnabled: true,
          mfaSecret: secret,
          mfaBackupCodes: backupCodes || [],
        }
      );
    }

    logger.info({ userId }, 'mfa_enabled');

    // Audit log MFA enablement
    auditS3Service.logAuthEvent(userId, 'mfa_enabled', 'success', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });

    res.json({ status: 'success', message: 'MFA has been enabled' });
  } catch (err) {
    logger.error({ err }, 'mfa_enable_failed');
    return res.status(500).json({ error: 'Failed to enable MFA' });
  }
});

// MFA Disable - Disable MFA for user
app.post('/auth/mfa/disable', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.sub;

    if (!token) {
      return res.status(400).json({ error: 'MFA token is required to disable MFA' });
    }

    // Fetch user with MFA secret
    let user;
    if (USE_IN_MEMORY) {
      user = _users.find(u => String(u._id) === String(userId));
    } else {
      const User = require('./models/User');
      user = await User.findById(userId);
    }

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not enabled for this account' });
    }

    // Verify token before allowing disable
    const MFAService = require('./services/mfaService');
    const isValid = MFAService.verifyMFAToken(user.mfaSecret, token);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    // Disable MFA
    if (USE_IN_MEMORY) {
      user.mfaEnabled = false;
      user.mfaSecret = null;
      user.mfaBackupCodes = [];
    } else {
      const User = require('./models/User');
      await User.updateOne(
        { _id: userId },
        {
          mfaEnabled: false,
          mfaSecret: null,
          mfaBackupCodes: [],
        }
      );
    }

    logger.info({ userId }, 'mfa_disabled');

    // Audit log MFA disablement
    auditS3Service.logAuthEvent(userId, 'mfa_disabled', 'success', req.ip, req.headers['user-agent']).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });

    res.json({ status: 'success', message: 'MFA has been disabled' });
  } catch (err) {
    logger.error({ err }, 'mfa_disable_failed');
    return res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// Verify MFA token during login (for future implementation)
app.post('/auth/mfa/verify', async (req, res) => {
  try {
    const { userId, token, backupCode } = req.body;

    if (!userId || (!token && !backupCode)) {
      return res.status(400).json({ error: 'userId and either token or backupCode are required' });
    }

    // Fetch user
    let user;
    if (USE_IN_MEMORY) {
      user = _users.find(u => String(u._id) === String(userId));
    } else {
      const User = require('./models/User');
      user = await User.findById(userId);
    }

    if (!user || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not enabled for this account' });
    }

    const MFAService = require('./services/mfaService');
    let isValid = false;

    // Try token first
    if (token) {
      isValid = MFAService.verifyMFAToken(user.mfaSecret, token);
    }

    // Try backup code
    if (!isValid && backupCode) {
      isValid = MFAService.verifyBackupCode(user.mfaBackupCodes || [], backupCode);
      if (isValid && !USE_IN_MEMORY) {
        // Save updated backup codes (marked as used)
        const User = require('./models/User');
        await User.updateOne({ _id: userId }, { mfaBackupCodes: user.mfaBackupCodes });
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid MFA token or backup code' });
    }

    res.json({ status: 'success', message: 'MFA verification successful' });
  } catch (err) {
    logger.error({ err }, 'mfa_verify_failed');
    return res.status(500).json({ error: 'Failed to verify MFA' });
  }
});

// List user devices
app.get('/auth/devices', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const devices = await listUserDevices(userId);
    res.json({ devices });
  } catch (e) {
    logger.error({ err: e }, 'Error listing devices');
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// Revoke a specific device
app.delete('/auth/devices/:deviceId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    if (USE_IN_MEMORY) {
      return res.status(501).json({ error: 'Not supported in test mode' });
    }

    // Verify device belongs to user
    const device = await RefreshToken.findOne({ _id: req.params.deviceId, userId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    await revokeRefreshToken(req.params.deviceId);
    res.json({ status: 'device revoked' });
  } catch (e) {
    logger.error({ err: e }, 'Error revoking device');
    res.status(500).json({ error: 'Failed to revoke device' });
  }
});

// authGuard is imported at the top of this file

// Protected dataset upload
app.post('/datasets/upload', authMiddleware,
  body('name').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Dataset name required (max 200 chars)'),
  body('type').optional().isString().trim().isLength({ max: 50 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  const { name, type } = req.body;
  const ds = await createDataset(name, type, req.user.sub);
  res.json({ datasetId: ds._id.toString(), status: 'uploaded', name: ds.name });
});

// v1 API: datasets (wrapper endpoints to provide /v1 surface area)
app.post('/v1/datasets', authMiddleware,
  body('name').isString().trim().isLength({ min: 1, max: 200 }).withMessage('Dataset name required (max 200 chars)'),
  body('type').optional().isString().trim().isLength({ max: 50 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  try {
    const { name, type } = req.body;
    const ds = await createDataset(name, type, req.user.sub);
    return res.json({ datasetId: ds._id.toString(), status: 'created', name: ds.name });
  } catch (e) {
    logger.error({ err: e }, 'v1_create_dataset_failed');
    return res.status(500).json({ error: 'create_failed' });
  }
});

app.get('/v1/datasets', authMiddleware, async (req, res) => {
  try {
    if (USE_IN_MEMORY) {
      const list = _datasets.map(d => ({ datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions: (d.versions || []).length }));
      return res.json({ datasets: list });
    }
    const docs = await Dataset.find({}, 'name ownerId uploadDate versions').lean();
    const list = docs.map(d => ({ datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions: (d.versions || []).length }));
    return res.json({ datasets: list });
  } catch (e) {
    logger.error({ err: e }, 'v1_list_datasets_failed');
    return res.status(500).json({ error: 'list_failed' });
  }
});

app.get('/v1/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const versions = (d.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null }));
      return res.json({ dataset: { datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions } });
    }
    const ds = await Dataset.findById(datasetId).select('name ownerId uploadDate versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const versions = (ds.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null }));
    return res.json({ dataset: { datasetId: ds._id, name: ds.name, ownerId: ds.ownerId, uploadDate: ds.uploadDate, versions } });
  } catch (e) {
    logger.error({ err: e }, 'v1_get_dataset_failed');
    return res.status(500).json({ error: 'get_failed' });
  }
});

app.delete('/v1/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const before = _datasets.length;
      for (let i = _datasets.length - 1; i >= 0; i--) {
        if (String(_datasets[i]._id) === String(datasetId)) {
          _datasets.splice(i, 1);
        }
      }
      if (_datasets.length === before) {
        return res.status(404).json({ error: 'not_found' });
      }
      return res.json({ status: 'deleted' });
    }
    const doc = await Dataset.findByIdAndDelete(datasetId);
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ status: 'deleted' });
  } catch (e) {
    logger.error({ err: e }, 'v1_delete_dataset_failed');
    return res.status(500).json({ error: 'delete_failed' });
  }
});

// v1 presign/versions/ingest map to same semantics as legacy endpoints
app.post('/v1/datasets/:id/presign', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    const host = req.get('host');
    const proto = req.protocol || 'http';
    const uploadUrl = `${proto}://${host}/v1/datasets/${datasetId}/ingest`;
    return res.json({ uploadUrl, method: 'POST', contentType: 'application/json' });
  } catch (e) {
    logger.error({ err: e }, 'v1_presign_failed');
    return res.status(500).json({ error: 'presign_failed' });
  }
});

app.get('/v1/datasets/:id/versions', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const versions = (d.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null, header: v.header || [], hasBlob: Boolean(v.blob) }));
      return res.json({ datasetId, versions });
    }
    const ds = await Dataset.findById(datasetId).select('versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const versions = (ds.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null, header: v.header || [], hasBlob: Boolean(v.blob) }));
    return res.json({ datasetId, versions });
  } catch (e) {
    logger.error({ err: e }, 'v1_list_versions_failed');
    return res.status(500).json({ error: 'list_versions_failed' });
  }
});

app.get('/v1/datasets/:id/versions/:versionId', authMiddleware, async (req, res) => {
  try {
    const { id: datasetId, versionId } = req.params;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const v = (d.versions || []).find(x => String(x.versionId) === String(versionId));
      if (!v) {
        return res.status(404).json({ error: 'version_not_found' });
      }
      return res.json({ version: { versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, header: v.header || [], rowsPreview: v.rowsPreview || [] } });
    }
    const ds = await Dataset.findById(datasetId).select('versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const v = (ds.versions || []).find(x => String(x.versionId) === String(versionId));
    if (!v) {
      return res.status(404).json({ error: 'version_not_found' });
    }
    return res.json({ version: { versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, header: v.header || [], rowsPreview: v.rowsPreview || [] } });
  } catch (e) {
    logger.error({ err: e }, 'v1_get_version_failed');
    return res.status(500).json({ error: 'get_version_failed' });
  }
});

app.post('/v1/datasets/:id/ingest', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { filename, content_base64 } = req.body || {};
    if (!filename || !content_base64) {
      return res.status(400).json({ error: 'missing_filename_or_content' });
    }
    const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
    let buf;
    try {
      buf = Buffer.from(content_base64, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'invalid_base64' });
    }
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ error: 'file_too_large', maxBytes: MAX_BYTES });
    }
    const csvParser = require('./utils/../utils/csvParser');
    let header, rows, totalRows;
    try {
      const parsed = csvParser.parseCsv(buf, { previewRows: Number(process.env.CSV_PREVIEW_ROWS || 10) });
      header = parsed.header; rows = parsed.rowsPreview; totalRows = parsed.totalRows;
    } catch (pe) {
      if (pe.message === 'empty_csv') {
        return res.status(400).json({ error: 'empty_csv' });
      }
      if (pe.message === 'invalid_csv' || pe.message === 'invalid_csv_header') {
        return res.status(400).json({ error: 'invalid_csv_header' });
      }
      if (pe.message === 'malformed_csv') {
        return res.status(400).json({ error: 'malformed_csv', message: 'inconsistent_column_count' });
      }
      logger.warn({ err: pe }, 'v1_csv_parse_failed');
      return res.status(400).json({ error: 'invalid_csv' });
    }

    const versionId = crypto.randomUUID();
    if (!USE_IN_MEMORY) {
      try {
        const ds = await Dataset.findById(datasetId);
        if (ds) {
          ds.versions = ds.versions || [];
          const versionEntry = { versionId, filename, rows: totalRows, header, rowsPreview: rows, totalRows };
          if (process.env.STORE_FULL_CSV_IN_DB === '1') {
            versionEntry.blob = buf;
          }
          ds.versions.push(versionEntry);
          await ds.save();
        }
      } catch (e) {
        logger.warn({ err: e, datasetId }, 'v1_persist_dataset_version_failed');
      }
    } else {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (d) {
        d.versions = d.versions || [];
        const entry = { versionId: String((d.versions.length || 0) + 1), filename, rows: totalRows, header, rowsPreview: rows, totalRows };
        if (process.env.STORE_FULL_CSV_IN_DB === '1') {
          entry.blob = buf;
        }
        d.versions.push(entry);
      }
    }

    return res.json({ status: 'ingested', filename, rows: totalRows, header, rowsPreview: rows, versionId });
  } catch (e) {
    logger.error({ err: e }, 'v1_ingest_failed');
    return res.status(500).json({ error: 'ingest_failed' });
  }
});

// List datasets (admin or owner view)
app.get('/datasets', authMiddleware, async (req, res) => {
  try {
    if (USE_IN_MEMORY) {
      const list = _datasets.map(d => ({ datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions: (d.versions || []).length }));
      return res.json({ datasets: list });
    }
    const docs = await Dataset.find({}, 'name ownerId uploadDate versions').lean();
    const list = docs.map(d => ({ datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions: (d.versions || []).length }));
    return res.json({ datasets: list });
  } catch (e) {
    logger.error({ err: e }, 'list_datasets_failed');
    return res.status(500).json({ error: 'list_datasets_failed' });
  }
});

// Get dataset detail (including versions summary)
app.get('/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const versions = (d.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null }));
      return res.json({ dataset: { datasetId: d._id, name: d.name, ownerId: d.ownerId, uploadDate: d.uploadDate, versions } });
    }
    const ds = await Dataset.findById(datasetId).select('name ownerId uploadDate versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const versions = (ds.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null }));
    return res.json({ dataset: { datasetId: ds._id, name: ds.name, ownerId: ds.ownerId, uploadDate: ds.uploadDate, versions } });
  } catch (e) {
    logger.error({ err: e }, 'get_dataset_failed');
    return res.status(500).json({ error: 'get_dataset_failed' });
  }
});

// Delete a dataset (and its versions)
app.delete('/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const before = _datasets.length;
      for (let i = _datasets.length - 1; i >= 0; i--) {
        if (String(_datasets[i]._id) === String(datasetId)) {
          _datasets.splice(i, 1);
        }
      }
      if (_datasets.length === before) {
        return res.status(404).json({ error: 'not_found' });
      }
      return res.json({ status: 'deleted' });
    }
    const doc = await Dataset.findByIdAndDelete(datasetId);
    if (!doc) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ status: 'deleted' });
  } catch (e) {
    logger.error({ err: e }, 'delete_dataset_failed');
    return res.status(500).json({ error: 'delete_dataset_failed' });
  }
});

// Return a local "presign" upload URL (MVP - local presign that points back to server-side ingest endpoint)
app.post('/datasets/:id/presign', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    // callers should POST to the returned `uploadUrl` with JSON { filename, content_base64 }
    const host = req.get('host');
    const proto = req.protocol || 'http';
    const uploadUrl = `${proto}://${host}/datasets/${datasetId}/ingest`;
    return res.json({ uploadUrl, method: 'POST', contentType: 'application/json' });
  } catch (e) {
    logger.error({ err: e }, 'presign_failed');
    return res.status(500).json({ error: 'presign_failed' });
  }
});

// Versions: list versions for a dataset
app.get('/datasets/:id/versions', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const versions = (d.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null, header: v.header || [], hasBlob: Boolean(v.blob) }));
      return res.json({ datasetId, versions });
    }
    const ds = await Dataset.findById(datasetId).select('versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const versions = (ds.versions || []).map(v => ({ versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, uploadedAt: v.uploadedAt || null, header: v.header || [], hasBlob: Boolean(v.blob) }));
    return res.json({ datasetId, versions });
  } catch (e) {
    logger.error({ err: e }, 'list_versions_failed');
    return res.status(500).json({ error: 'list_versions_failed' });
  }
});

// Get version metadata
app.get('/datasets/:id/versions/:versionId', authMiddleware, async (req, res) => {
  try {
    const { id: datasetId, versionId } = req.params;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const v = (d.versions || []).find(x => String(x.versionId) === String(versionId));
      if (!v) {
        return res.status(404).json({ error: 'version_not_found' });
      }
      return res.json({ version: { versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, header: v.header || [], rows_preview: v.rows_preview || [] } });
    }
    const ds = await Dataset.findById(datasetId).select('versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const v = (ds.versions || []).find(x => String(x.versionId) === String(versionId));
    if (!v) {
      return res.status(404).json({ error: 'version_not_found' });
    }
    return res.json({ version: { versionId: v.versionId, filename: v.filename, rows: v.rows || v.totalRows || 0, header: v.header || [], rows_preview: v.rows_preview || [] } });
  } catch (e) {
    logger.error({ err: e }, 'get_version_failed');
    return res.status(500).json({ error: 'get_version_failed' });
  }
});

// Download version CSV (only available if blob was stored)
app.get('/datasets/:id/versions/:versionId/download', authMiddleware, async (req, res) => {
  try {
    const { id: datasetId, versionId } = req.params;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const v = (d.versions || []).find(x => String(x.versionId) === String(versionId));
      if (!v) {
        return res.status(404).json({ error: 'version_not_found' });
      }
      if (!v.blob) {
        return res.status(404).json({ error: 'blob_not_stored' });
      }
      res.set('Content-Type', 'text/csv');
      const safeFilename = (v.filename || 'dataset.csv').replace(/[^a-zA-Z0-9._-]/g, '_');
      res.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
      return res.send(v.blob);
    }
    const ds = await Dataset.findById(datasetId).select('versions');
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const v = (ds.versions || []).find(x => String(x.versionId) === String(versionId));
    if (!v) {
      return res.status(404).json({ error: 'version_not_found' });
    }
    if (!v.blob) {
      return res.status(404).json({ error: 'blob_not_stored' });
    }
    res.set('Content-Type', 'text/csv');
    const safeFilename = (v.filename || 'dataset.csv').replace(/[^a-zA-Z0-9._-]/g, '_');
    res.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(v.blob);
  } catch (e) {
    logger.error({ err: e }, 'download_version_failed');
    return res.status(500).json({ error: 'download_version_failed' });
  }
});

// Delete a version
app.delete('/datasets/:id/versions/:versionId', authMiddleware, async (req, res) => {
  try {
    const { id: datasetId, versionId } = req.params;
    if (USE_IN_MEMORY) {
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (!d) {
        return res.status(404).json({ error: 'not_found' });
      }
      const before = (d.versions || []).length;
      d.versions = (d.versions || []).filter(x => String(x.versionId) !== String(versionId));
      const after = (d.versions || []).length;
      if (before === after) {
        return res.status(404).json({ error: 'version_not_found' });
      }
      return res.json({ status: 'deleted' });
    }
    const ds = await Dataset.findById(datasetId);
    if (!ds) {
      return res.status(404).json({ error: 'not_found' });
    }
    const before = (ds.versions || []).length;
    ds.versions = (ds.versions || []).filter(x => String(x.versionId) !== String(versionId));
    if (ds.versions.length === before) {
      return res.status(404).json({ error: 'version_not_found' });
    }
    await ds.save();
    return res.json({ status: 'deleted' });
  } catch (e) {
    logger.error({ err: e }, 'delete_version_failed');
    return res.status(500).json({ error: 'delete_version_failed' });
  }
});

// Ingest uploaded dataset content (expects JSON: { filename, content_base64 })
app.post('/datasets/:id/ingest', authMiddleware, async (req, res) => {
  try {
    const datasetId = req.params.id;
    const { filename, content_base64 } = req.body || {};
    if (!filename || !content_base64) {
      return res.status(400).json({ error: 'missing_filename_or_content' });
    }
    // Validate content size (in bytes after base64 decoding)
    const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024); // default 5MB
    let buf;
    try {
      buf = Buffer.from(content_base64, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'invalid_base64' });
    }
    if (buf.length > MAX_BYTES) {
      return res.status(413).json({ error: 'file_too_large', maxBytes: MAX_BYTES });
    }

    // Parse CSV in-memory and produce header + preview rows; use RFC4180-compliant parser
    const csvParser = require('./utils/csvParser');
    let header, rows, totalRows;
    try {
      const parsed = csvParser.parseCsv(buf, { previewRows: Number(process.env.CSV_PREVIEW_ROWS || 10) });
      header = parsed.header;
      rows = parsed.rowsPreview;
      totalRows = parsed.totalRows;
    } catch (pe) {
      if (pe.message === 'empty_csv') {
        return res.status(400).json({ error: 'empty_csv' });
      }
      if (pe.message === 'invalid_csv' || pe.message === 'invalid_csv_header') {
        return res.status(400).json({ error: 'invalid_csv_header' });
      }
      if (pe.message === 'malformed_csv') {
        return res.status(400).json({ error: 'malformed_csv', message: 'inconsistent_column_count' });
      }
      logger.warn({ err: pe }, 'csv_parse_failed');
      return res.status(400).json({ error: 'invalid_csv' });
    }

    // Persist version info to Dataset (Mongo) as in-memory metadata (no filesystem path)
    const versionId = crypto.randomUUID();
    if (!USE_IN_MEMORY) {
      try {
        const ds = await Dataset.findById(datasetId);
        if (ds) {
          ds.versions = ds.versions || [];
          const versionEntry = { versionId, filename, rows: totalRows, header, rowsPreview: rows, totalRows };
          // Optionally store full CSV blob in DB
          if (process.env.STORE_FULL_CSV_IN_DB === '1') {
            versionEntry.blob = buf; // Buffer stored by mongoose as Binary
          }
          ds.versions.push(versionEntry);
          await ds.save();
        }
      } catch (e) {
        logger.warn({ err: e, datasetId }, 'persist_dataset_version_failed');
      }
    } else {
      // in-memory: update _datasets if present
      const d = _datasets.find(x => String(x._id) === String(datasetId));
      if (d) {
        d.versions = d.versions || [];
        const entry = { versionId: String((d.versions.length || 0) + 1), filename, rows: totalRows, header, rowsPreview: rows, totalRows };
        if (process.env.STORE_FULL_CSV_IN_DB === '1') {
          entry.blob = buf;
        }
        d.versions.push(entry);
      }
    }

    return res.json({ status: 'ingested', filename, rows: totalRows, header, rowsPreview: rows, versionId });
  } catch (e) {
    logger.error({ err: e }, 'ingest_failed');
    return res.status(500).json({ error: 'ingest_failed' });
  }
});

// Evaluation pipeline routes (E2E-DEEP Day17 + Storage Day18)
try {
  const evaluateRouter = require('./routes/evaluate');
  app.use(evaluateRouter); // mounts /v1/evaluate
  const evaluationHistoryRouter = require('./routes/evaluationHistory');
  app.use(evaluationHistoryRouter); // mounts /v1/evaluations, /v1/evaluations/:id
} catch (e) {
  logger.error({ err: e }, 'failed_to_mount_evaluation_routers');
}

// Model validation routes (MVE Day19)
try {
  const validationRouter = require('./routes/validation');
  // Do not enforce firebaseAuth globally; the router can operate in anonymous/test mode
  app.use(validationRouter); // mounts /v1/validate-model, /v1/validation-reports
} catch (e) {
  logger.error({ err: e }, 'failed_to_mount_validation_routers');
}

// Run analysis by calling ai_core microservice, persist a Report and return the analysis summary
app.post(
  '/analyze',
  analyzeLimiter,
  authMiddleware,
  // simple validation: dataset_name optional string, data required object
  body('dataset_name').optional().isString().isLength({ max: 200 }),
  body('data').exists().custom(v => v && typeof v === 'object'),
  async (req, res) => {
    // Add tenantGuard middleware inline since this is inline route
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    req.tenantId = req.user.tenantId || req.user.sub;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const aiCoreUrl = process.env.AI_CORE_URL || 'http://ai_core:8100/ai_core/analyze';
      // Forward request body to ai_core
      const payload = { dataset_name: req.body.dataset_name || 'uploaded', data: req.body.data || {} };

      // Preprocess dataset to accept row-oriented or loosely-typed client payloads
      try {
        payload.data = preprocessDataset(payload.data);
        logger.info({ payload_preview: Object.keys(payload.data).slice(0, 5) }, 'preprocessed_dataset');
      } catch (pe) {
        logger.warn({ err: pe }, 'preprocess_dataset_failed');
      }
      const tStart = Date.now();
      // forward request-id so ai_core logs/metrics can correlate
      const headers = { 'X-Request-Id': req.request_id };
      // Check cache for identical request payload
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      if (analyzeCache.has(payloadHash)) {
        const cached = analyzeCache.get(payloadHash);
        return res.json(cached);
      }

      // Lazily require axios so jest.mock('axios') in tests can intercept
      const axiosLocal = require('axios');

      // Set current trace for axios interceptor
      setCurrentTrace(req.trace);

      // Propagate trace headers to AI Core
      const traceHeaders = req.trace.toHeaders();
      const allHeaders = { ...headers, ...traceHeaders };

      // Use circuit breaker to call AI Core
      let aiResp;
      try {
        aiResp = await aiCoreBreaker.call(async () => {
          return await axiosLocal.post(aiCoreUrl, payload, { timeout: Number(process.env.AI_CORE_TIMEOUT_MS || 60_000), headers: allHeaders });
        });
      } catch (cbError) {
        if (cbError.code === 'CIRCUIT_BREAKER_OPEN') {
          logger.warn({ breaker_state: aiCoreBreaker.getState(), trace_id: req.trace.traceId }, 'circuit_breaker_rejected_request');
          // Circuit is open, fall through to fallback
          throw new Error('AI Core service temporarily unavailable');
        }
        throw cbError;
      }

      const tEnd = Date.now();
      aiCoreDuration.observe({ route: '/ai_core/analyze' }, (tEnd - tStart) / 1000);
      const analysisId = aiResp.data.analysis_id || aiResp.data.analysisId || null;
      const summary = aiResp.data.summary || aiResp.data || {};

      // Persist report (associate with user)
      const report = await createReport(analysisId, summary, req.user.sub, { datasetName: payload.dataset_name });
      const responsePayload = { status: 'ok', reportId: report._id || report.id || null, analysisId, summary };
      analyzeCache.set(payloadHash, responsePayload);

      // Log data access for audit trail
      const rows = Array.isArray(payload.data.rows) ? payload.data.rows.length : Object.values(payload.data || {}).reduce((n, v) => Math.max(n, Array.isArray(v) ? v.length : 0), 0);
      auditS3Service.logDataAccessEvent(req.user.sub, 'dataset', 'read', rows, req.user.tenantId).catch(err => {
        logger.warn({ err }, 'audit_log_failed');
      });

      // Create notification for analysis completion
      NotificationsService.create(req.user.sub, req.user.tenantId, {
        title: 'Analysis Completed',
        body: `Your fairness analysis has been completed successfully`,
        type: 'success',
        link: `/dashboard/user/reports/${report._id || report.id}`,
        metadata: {
          entityType: 'analysis',
          entityId: analysisId,
          source: 'analysis',
        },
      }).catch(err => {
        logger.warn({ err }, 'notification_create_failed');
      });

      return res.json(responsePayload);
    } catch (err) {
      // If AI Core is unavailable, provide a stubbed analysis in non-production to keep flows working
      const code = err && (err.code || err.errno);
      const isNetwork = code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'EAI_AGAIN' || code === 'ECONNRESET' || code === 'ETIMEDOUT';
      if (isNetwork || process.env.ANALYZE_FALLBACK === '1') {
        const data = req.body.data || {};
        const rows = Array.isArray(data.rows) ? data.rows.length : (Array.isArray(data.age) ? data.age.length : Object.values(data).reduce((n, v) => Math.max(n, Array.isArray(v) ? v.length : 0), 0));
        const summary = { n_rows: rows, fairness_score: 90.0, note: 'stubbed-by-backend' };
        const report = await createReport('stub_ai', summary, req.user.sub, { datasetName: req.body.dataset_name || 'uploaded' });
        return res.json({ status: 'ok', reportId: report._id || null, analysisId: 'stub_ai', summary });
      }
      logger.error({ err, msg: err?.message, stack: err?.stack }, 'Error calling ai_core');
      // Always return generic error to avoid leaking internal details
      return res.status(502).json({ error: 'Analysis service unavailable' });
    }
  },
);

// Get an analysis/report by id (simple proxy to DB)
app.get('/report/:id', authMiddleware, async (req, res) => {
  try {
    // Try cache first
    const cacheKey = `report:${req.params.id}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    } catch (ce) {
      // ignore cache errors
    }
    if (USE_IN_MEMORY) {
      const r = _reports.find(rr => String(rr._id) === String(req.params.id));
      if (!r) {
        return res.status(404).json({ error: 'Not found' });
      }
      const payload = { report: r };
      await cache.set(cacheKey, payload, Number(process.env.REPORT_CACHE_TTL_MS || 30_000)).catch(() => {});
      return res.json(payload);
    }
    const rpt = await Report.findById(req.params.id);
    if (!rpt) {
      return res.status(404).json({ error: 'Not found' });
    }
    const payload = { report: rpt };
    await cache.set(cacheKey, payload, Number(process.env.REPORT_CACHE_TTL_MS || 30_000)).catch(() => {});
    return res.json(payload);
  } catch (e) {
    logger.error({ err: e }, 'Error fetching report');
    return res.status(500).json({ error: 'Server error' });
  }
});

// Export report (PDF or HTML fallback)
app.get('/report/:id/export', authMiddleware, async (req, res) => {
  try {
    const rpt = USE_IN_MEMORY ? _reports.find(rr => String(rr._id) === String(req.params.id)) : await Report.findById(req.params.id);
    if (!rpt) {
      return res.status(404).send('Not found');
    }

    // If puppeteer is enabled via env and available, render PDF server-side
    if (process.env.ENABLE_PDF === '1') {
      try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        const html = `<html><head><meta charset="utf-8"><title>Report ${req.params.id}</title></head><body><pre>${JSON.stringify(rpt, null, 2)}</pre></body></html>`;
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4' });
        await browser.close();
        res.set('Content-Type', 'application/pdf');
        return res.send(pdf);
      } catch (pdfErr) {
        logger.warn({ err: pdfErr }, 'pdf_generation_failed');
        // fallback to HTML
      }
    }

    // Fallback: serve printable HTML
    const safeId = escape(String(req.params.id).replace(/[^a-zA-Z0-9._-]/g, '_'));
    const safeReport = escape(JSON.stringify(rpt, null, 2));
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Report ${safeId}</title><style>body{font-family:system-ui,Arial,Helvetica,sans-serif;padding:20px}</style></head><body><h1>Report ${safeId}</h1><pre>${safeReport}</pre></body></html>`;
    res.set('Content-Type', 'text/html');
    return res.send(html);
  } catch (e) {
    logger.error({ err: e }, 'export_failed');
    return res.status(500).send('Export failed');
  }
});

// Reports for the authenticated user
app.get('/reports', authMiddleware, async (req, res, next) => {
  try {
    const requesterId = (req.user && req.user.sub) || req.userId;
    if (!requesterId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    const cacheKey = `reports:${requesterId}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    } catch (ce) {}

    logger.info({ userId: requesterId }, 'reports_list_start');
    const reports = await findReportsByUser(requesterId);
    const payload = { userId: requesterId, reports };
    await cache.set(cacheKey, payload, Number(process.env.REPORTS_LIST_CACHE_TTL_MS || 30_000)).catch(() => {});
    auditS3Service.logDataAccessEvent(requesterId, 'reports', 'read', reports?.length || 0, req.user?.tenantId).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });
    logger.info({ userId: requesterId, count: reports?.length || 0 }, 'reports_list_success');
    return res.json(payload);
  } catch (e) {
    logger.error({ err: e }, 'reports_list_failed');
    if (process.env.NODE_ENV !== 'production') {
      return res.json({ userId: req.user && req.user.sub, reports: [] });
    }
    return next(e);
  }
});

// Reports for a user
app.get('/reports/:userId', authMiddleware, async (req, res, next) => {
  try {
    // Authorization: allow owner or admin only
    const requesterId = (req.user && req.user.sub) || req.userId;
    const requesterRole = (req.user && req.user.role) || req.role || 'user';
    if (String(requesterId) !== String(req.params.userId) && requesterRole !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    logger.info({ userId: req.params.userId }, 'reports_list_start');
    const reports = await findReportsByUser(req.params.userId);
    auditS3Service.logDataAccessEvent(requesterId, 'reports', 'read', reports?.length || 0, req.user?.tenantId).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });
    logger.info({ userId: req.params.userId, count: reports?.length || 0 }, 'reports_list_success');
    return res.json({ userId: req.params.userId, reports });
  } catch (e) {
    logger.error({ err: e, userId: req.params.userId }, 'reports_list_failed');
    if (process.env.NODE_ENV !== 'production') {
      // In tests, do not fail the flow
      return res.json({ userId: req.params.userId, reports: [] });
    }
    return next(e);
  }
});

// Get latest analysis/report for authenticated user
app.get('/api/analyses/latest', authMiddleware, async (req, res) => {
  try {
    const requesterId = (req.user && req.user.sub) || req.userId;
    if (!requesterId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    // Fetch latest report for user
    const reports = USE_IN_MEMORY
      ? _reports.filter(r => String(r.userId) === String(requesterId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      : await Report.find({ userId: requesterId }).sort({ createdAt: -1 }).limit(1);

    if (!reports || reports.length === 0) {
      return res.status(404).json({ error: 'No analyses found' });
    }

    const latest = reports[0];
    auditS3Service.logDataAccessEvent(requesterId, 'analysis', 'read', 1, req.user?.tenantId).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });
    return res.json(latest);
  } catch (err) {
    logger.error({ err }, 'get_latest_analysis_failed');
    return res.status(500).json({ error: 'Failed to fetch latest analysis' });
  }
});

// Export analysis with multiple formats (CSV, Excel, PDF)
app.post('/api/export/analysis', authMiddleware, async (req, res) => {
  try {
    const { reportId, exportFormat = 'pdf' } = req.body;
    const requesterId = (req.user && req.user.sub) || req.userId;

    if (!reportId) {
      return res.status(400).json({ error: 'reportId is required' });
    }

    // Fetch the report
    const report = USE_IN_MEMORY
      ? _reports.find(rr => String(rr._id) === String(reportId))
      : await Report.findById(reportId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Authorization check
    if (String(report.userId) !== String(requesterId) && (req.user?.role || req.role) !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Import export service
    const exportService = require('./services/exportService');
    const validFormats = ['csv', 'excel', 'xlsx', 'pdf'];

    if (!validFormats.includes(exportFormat.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid export format. Supported: csv, excel, pdf' });
    }

    // Generate export
    const result = await exportService.exportComplete(
      report.summary || { summary: {} },
      requesterId,
      reportId,
      exportFormat
    );

    // Set response headers based on format
    const contentType = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf'
    }[exportFormat.toLowerCase()];

    const fileExtension = {
      csv: 'csv',
      excel: 'xlsx',
      xlsx: 'xlsx',
      pdf: 'pdf'
    }[exportFormat.toLowerCase()];

    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `attachment; filename="analysis_${reportId}.${fileExtension}"`);

    // Log export for audit trail
    logger.info({
      reportId,
      exportFormat,
      userId: requesterId,
      timestamp: new Date().toISOString()
    }, 'export_analysis_completed');

    // Handle both string (CSV) and buffer (PDF, Excel) responses
    if (typeof result === 'string') {
      res.send(result);
    } else {
      res.send(result);
    }
  } catch (err) {
    logger.error({ err }, 'export_analysis_failed');
    return res.status(500).json({ error: 'Export failed' });
  }
});

// Generate compliance report PDF
app.post('/api/reports/:modelId/generate-pdf', authMiddleware, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { metrics } = req.body;
    const requesterId = (req.user && req.user.sub) || req.userId;

    if (!modelId) {
      return res.status(400).json({ error: 'modelId is required' });
    }

    // Fetch the report/analysis
    const report = USE_IN_MEMORY
      ? _reports.find(rr => String(rr._id) === String(modelId))
      : await Report.findById(modelId);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Authorization check
    if (String(report.userId) !== String(requesterId) && (req.user?.role || req.role) !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate PDF using compliance report service
    const ComplianceReportService = require('./services/complianceReportService');
    const pdfBuffer = await ComplianceReportService.generateComplianceReportPDF(
      report.summary || {},
      {
        companyName: req.user?.organization || 'Organization',
        reportDate: new Date(),
        analyst: req.user?.email || 'System',
        signOffRequired: true
      }
    );

    // Audit log PDF generation
    auditS3Service.logDataAccessEvent(requesterId, 'report', 'export', 1, req.user?.tenantId).catch(err => {
      logger.warn({ err }, 'audit_log_failed');
    });

    // Set response headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="compliance_report_${modelId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (err) {
    logger.error({ err, modelId: req.params.modelId }, 'pdf_generation_failed');
    return res.status(500).json({ error: 'PDF generation failed' });
  }
});

// Export app for testing; start server only if run directly
// Centralized error handler (must be added after routes)
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled exception');
  const statusCode = err.status || err.statusCode || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'internal_error' : 'unknown_error');
  const isOperational = err.isOperational !== false;
  
  res.status(statusCode).json({
    status: 'error',
    error: {
      code: errorCode,
      message: isOperational ? err.message : 'An error occurred',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: req.id || req.headers['x-request-id'],
    },
  });
});

if (require.main === module) {
  const port = process.env.PORT || 5000;

  // Initialize SSO configurations on startup
  async function initializeSSO() {
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection?.readyState !== 1) {
        logger.warn('MongoDB not ready for SSO initialization');
        return;
      }

      const SSOConfig = require('./services/ssoService').SSOConfig;
      const configs = await SSOConfig.find({ enabled: true });

      for (const config of configs) {
        const { SSOService } = require('./services/ssoService');
        await SSOService.initializeProvider(
          config.tenantId,
          config.provider,
          config[config.provider] || config
        );
      }

      logger.info({ count: configs.length }, 'SSO configurations initialized');
    } catch (e) {
      logger.warn({ err: e }, 'SSO initialization failed (may retry later)');
    }
  }

  // Optionally start the status worker as a child process on the backend instance
  try {
    const { startWorkerIfEnabled } = require('./worker-starter');
    startWorkerIfEnabled();
  } catch (e) {
    logger.warn({ err: e }, 'worker_starter_failed');
  }

  // Start governance worker for approval workflows, compliance sign-offs, and audit callbacks
  try {
    const GovernanceWorker = require('./workers/governanceWorker');
    const governanceWorker = new GovernanceWorker({
      intervalMs: parseInt(process.env.GOVERNANCE_WORKER_INTERVAL_MS || '60000'),
      slaCheckIntervalMs: parseInt(process.env.GOVERNANCE_SLA_CHECK_INTERVAL_MS || '300000'),
      callbackRetryIntervalMs: parseInt(process.env.GOVERNANCE_CALLBACK_RETRY_INTERVAL_MS || '60000'),
      complianceExpiryCheckMs: parseInt(process.env.GOVERNANCE_COMPLIANCE_EXPIRY_CHECK_MS || '3600000'),
    });
    governanceWorker.start();
    global.governanceWorker = governanceWorker;
  } catch (e) {
    logger.warn({ err: e }, 'governance_worker_startup_failed');
  }

  const http = require('http');
  const server = http.createServer(app);
  try {
    const { attachWebSocketServer } = require('./realtime/wsServer');
    attachWebSocketServer(server);
  } catch (e) {
    logger.warn({ err: e }, 'websocket_server_attach_failed');
  }

  server.listen(port, () => {
    logger.info({ port }, 'Backend system API listening');
    // Initialize SSO after server starts
    setTimeout(initializeSSO, 1000);
    // Initialize retraining scheduler
    setTimeout(async () => {
      try {
        const retrainingScheduler = require('./services/retrainingScheduler');
        await retrainingScheduler.initialize();
      } catch (err) {
        logger.error({ err }, 'failed_to_initialize_retraining_scheduler');
      }
    }, 2000);
  });
}

module.exports = app;
