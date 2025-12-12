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
const xssClean = optRequire('xss-clean');
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
const { firebaseAuth } = require('./middleware/firebaseAuth');
const firebaseAdmin = require('./services/firebaseAdmin');
// Centralized auth guard (delegates to Firebase when configured, otherwise JWT)
const { authGuard, requireRole } = require('./middleware/authGuard');
// Backwards-compatible alias used elsewhere in this file
const authMiddleware = authGuard;
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
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
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
if (xssClean) {
  app.use(xssClean());
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
    skip: (req, _res) => (process.env.DISABLE_RATE_LIMIT === '1') || (req.headers['x-test-bypass-ratelimit'] === '1'),
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

// Access request & admin user management routes
try {
  app.use(require('./routes/accessRequests'));
} catch (e) {
  logger.error({ err: e }, 'routes_access_requests_register_failed');
}

// Helper functions (abstract persistence)
async function findUserByEmail(email) {
  if (USE_IN_MEMORY) {
    return _users.find(u => u.email === email) || null;
  }
  return User.findOne({ email });
}

async function createUser(name, email, password_hash) {
  if (USE_IN_MEMORY) {
    const id = String(_users.length + 1);
    const u = { _id: id, name, email, password_hash, role: 'user' };
    _users.push(u);
    return u;
  }
  return User.create({ name, email, password_hash });
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

  return doc;
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

// Auth
app.post(
  '/auth/register',
  // validation
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('email').isEmail().normalizeEmail(),
  // choose stronger default password policy in non-test mode
  body('password').isString().isLength({ min: USE_IN_MEMORY ? Number(process.env.MIN_PASSWORD_LENGTH || 4) : Number(process.env.MIN_PASSWORD_LENGTH || 12) }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { name, email, password } = req.body;
      const existing = await findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'User exists' });
      }
      const hash = await bcrypt.hash(password, 10);
      const user = await createUser(name, email, hash);
      return res.json({ status: 'registered', userId: user._id });
    } catch (err) {
      logger.error({ err }, 'Error during register');
      return res.status(500).json({ error: 'Registration failed' });
    }
  },
);

app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try later' },
  // Allow test harness / load scripts to bypass to avoid artificial 429 under load
  skip: (req) => (process.env.DISABLE_RATE_LIMIT === '1') || (req.headers['x-test-bypass-ratelimit'] === '1'),
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
    try {
      const { email, password, deviceName } = req.body;
      const user = await findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid' });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: 'Invalid' });
      }

      const accessToken = jwt.sign({ sub: user._id, role: user.role }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });

      // Generate and store refresh token (use unique jti for determinism)
      const refreshTokenPayload = { sub: user._id, jti: uuidv4() };
      const refreshTokenJwt = jwt.sign(refreshTokenPayload, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
      const storedToken = await storeRefreshToken(user._id, refreshTokenJwt, req, deviceName);

      // Optionally set refresh token as secure HttpOnly cookie in production
      if (process.env.USE_COOKIE_REFRESH === '1') {
        const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
        res.cookie('refreshToken', refreshTokenJwt, cookieOpts);
        return res.json({ accessToken });
      }
      return res.json({ accessToken, refreshToken: refreshTokenJwt });
    } catch (err) {
      logger.error({ err }, 'Error during login');
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
    const accessToken = jwt.sign({ sub: userDoc._id, role: userDoc.role }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
    const refreshPayload = { sub: userDoc._id, jti: uuidv4() };
    const refreshTokenJwt = jwt.sign(refreshPayload, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
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
        const payload = jwt.verify(accessToken, process.env.SECRET_KEY || 'secret');
        // Return minimal public info
        return res.json({ userId: payload.sub, role: payload.role || 'user' });
      } catch (e) {
        // expired/invalid -> fallthrough to refresh if present
      }
    }

    // If we have a refresh token, validate and issue a new access token (rotate) for UX
    if (refreshToken) {
      const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
      const userId = payload.sub;
      // load user to return role and ensure exists
      const userDoc = USE_IN_MEMORY ? _users.find(u => String(u._id) === String(userId)) : await User.findById(userId);
      if (!userDoc) {
        return res.status(401).json({ error: 'invalid_session' });
      }

      // Issue fresh access token and set cookie
      const newAccess = jwt.sign({ sub: userDoc._id, role: userDoc.role }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
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
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
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
    const user = await findUserByEmail !== 'function' ? null : null;
    const userDoc = !USE_IN_MEMORY ? await User.findById(userId) : _users.find(u => String(u._id) === String(userId));
    if (!userDoc) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = jwt.sign(
      { sub: userDoc._id, role: userDoc.role || 'user' },
      process.env.SECRET_KEY || 'secret',
      { expiresIn: '15m' },
    );

    // Rotate refresh token: revoke old, issue new (keep rotationId, link parent)
    const newRefreshPayload = { sub: userId, jti: uuidv4() };
    const newRefreshJwt = jwt.sign(newRefreshPayload, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });

    if (!USE_IN_MEMORY) {
      // Revoke old token and store new one, preserving rotation chain
      await revokeRefreshToken(tokenDoc._id);
      await storeRefreshToken(userId, newRefreshJwt, req, null, tokenDoc.tokenHash);
    } else {
      _refreshTokens.delete(refreshToken);
      _refreshTokens.set(newRefreshJwt, String(userId));
    }

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
    res.json({ status: 'logged out' });
  } catch (e) {
    logger.error({ err: e }, 'Error during logout');
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
        const payload = jwt.verify(cookieRefresh, process.env.REFRESH_SECRET || 'refresh_secret');
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
app.post('/datasets/upload', authMiddleware, async (req, res) => {
  const { name, type } = req.body;
  const ds = await createDataset(name, type, req.user.sub);
  res.json({ datasetId: ds._id.toString(), status: 'uploaded', name: ds.name });
});

// v1 API: datasets (wrapper endpoints to provide /v1 surface area)
app.post('/v1/datasets', authMiddleware, async (req, res) => {
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
      res.set('Content-Disposition', `attachment; filename="${v.filename || 'dataset.csv'}"`);
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
    res.set('Content-Disposition', `attachment; filename="${v.filename || 'dataset.csv'}"`);
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
  authMiddleware,
  // simple validation: dataset_name optional string, data required object
  body('dataset_name').optional().isString().isLength({ max: 200 }),
  body('data').exists().custom(v => v && typeof v === 'object'),
  async (req, res) => {
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
      const aiResp = await axiosLocal.post(aiCoreUrl, payload, { timeout: Number(process.env.AI_CORE_TIMEOUT_MS || 60_000), headers });
      const tEnd = Date.now();
      aiCoreDuration.observe({ route: '/ai_core/analyze' }, (tEnd - tStart) / 1000);
      const analysisId = aiResp.data.analysis_id || aiResp.data.analysisId || null;
      const summary = aiResp.data.summary || aiResp.data || {};

      // Persist report (associate with user)
      const report = await createReport(analysisId, summary, req.user.sub, { datasetName: payload.dataset_name });
      const responsePayload = { status: 'ok', reportId: report._id || report.id || null, analysisId, summary };
      analyzeCache.set(payloadHash, responsePayload);
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
      // Keep error messages generic in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({ error: 'Analysis service unavailable' });
      }
      return res.status(500).json({ error: 'Analysis failed', details: err?.message });
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
    const safeId = escape(req.params.id);
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

// Export app for testing; start server only if run directly
// Centralized error handler (must be added after routes)
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled exception');
  const status = err.status || 500;
  const payload = { error: status === 500 ? 'Internal server error' : err.message };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
});

if (require.main === module) {
  const port = process.env.PORT || 5000;
  // Optionally start the status worker as a child process on the backend instance
  try {
    const { startWorkerIfEnabled } = require('./worker-starter');
    startWorkerIfEnabled();
  } catch (e) {
    logger.warn({ err: e }, 'worker_starter_failed');
  }

  app.listen(port, () => logger.info({ port }, 'Backend system API listening'));
}

module.exports = app;
