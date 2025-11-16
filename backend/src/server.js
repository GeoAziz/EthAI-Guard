const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const argon2 = require('argon2');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('./logger');
const { withRequest } = require('./logger');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');
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
		if (this.map.has(k)) this.map.delete(k);
		this.map.set(k, entry);
		this._evictIfNeeded();
	}
	has(k) {
		const e = this.map.get(k);
		if (!e) return false;
		if (Date.now() > e.expires) {
			this.map.delete(k);
			return false;
		}
		return true;
	}
	get(k) {
		const e = this.map.get(k);
		if (!e) return undefined;
		if (Date.now() > e.expires) {
			this.map.delete(k);
			return undefined;
		}
		return e.v;
	}
}
const crypto = require('crypto');
let User, Dataset, Report, RefreshToken;

// Accept reasonably-sized JSON bodies; keep it conservative for production
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// Global rate limiter recommended for demo/prod: 60 requests per minute per IP by default
app.use(
	rateLimit({
		windowMs: Number(process.env.RATE_WINDOW_MS || 60_000),
		max: Number(process.env.RATE_MAX || 60),
		standardHeaders: true,
		legacyHeaders: false,
		message: { error: 'Too many requests, slow down' },
		skip: (req, _res) => (process.env.DISABLE_RATE_LIMIT === '1') || (req.headers['x-test-bypass-ratelimit'] === '1')
	})
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
	labelNames: ['method', 'route', 'status']
});
const httpRequestCounter = new promClient.Counter({
	name: 'http_requests_total',
	help: 'Total HTTP requests',
	labelNames: ['method', 'route', 'status']
});
const aiCoreDuration = new promClient.Histogram({
	name: 'ai_core_analysis_seconds',
	help: 'Time spent in ai_core analyze',
	labelNames: ['route']
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

const axios = require('axios');
const cookieParser = require('cookie-parser');

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
		.then(() => logger.info({ mongo: MONGO_URL }, 'Connected to MongoDB'))
		.catch(err => logger.error({ err }, 'MongoDB connection error'));
} else {
	logger.info('Using in-memory stores for backend (test mode)');
}

app.get('/health', (req, res) => res.json({ status: 'backend ok' }));

// Helper functions (abstract persistence)
async function findUserByEmail(email) {
	if (USE_IN_MEMORY) return _users.find(u => u.email === email) || null;
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
	if (USE_IN_MEMORY) return _reports.filter(r => String(r.userId) === String(userId));
	return Report.find({ userId });
}

async function createReport(analysisId, summary, userId, extras = {}) {
	if (USE_IN_MEMORY) {
		const id = String(_reports.length + 1);
		const r = { _id: id, analysisId, summary, userId, ...extras };
		_reports.push(r);
		return r;
	}
	return Report.create({ analysisId, summary, userId, ...extras });
}

// Token management helpers
async function hashToken(token) {
	// In-memory mode: return token as-is for testing
	if (USE_IN_MEMORY) return token;
	try {
		return await argon2.hash(token, { type: argon2.argon2id });
	} catch (e) {
		logger.error({ err: e }, 'Error hashing token');
		throw e;
	}
}

async function verifyTokenHash(token, hash) {
	// In-memory mode: direct comparison
	if (USE_IN_MEMORY) return token === hash;
	try {
		return await argon2.verify(hash, token);
	} catch (e) {
		logger.error({ err: e }, 'Error verifying token hash');
		return false;
	}
}

async function storeRefreshToken(userId, rawToken, req, deviceName = null) {
	// In-memory mode: store in map
	if (USE_IN_MEMORY) {
		_refreshTokens.set(rawToken, String(userId));
		return { token: rawToken };
	}
	
	try {
		const tokenHash = await hashToken(rawToken);
		const rotationId = uuidv4();
		
		const rtDoc = await RefreshToken.create({
			userId,
			tokenHash,
			expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
			createdAt: new Date(),
			device: {
				userAgent: req.get('user-agent') || 'unknown',
				ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
				deviceId: null
			},
			name: deviceName || `Device ${new Date().toLocaleDateString()}`
		});
		
		return { _id: rtDoc._id, token: rawToken };
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
			expiresAt: { $gt: new Date() }
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

async function listUserDevices(userId) {
	if (USE_IN_MEMORY) {
		// Return empty for in-memory mode
		return [];
	}
	try {
		return await RefreshToken.find({
			userId,
			revokedAt: null,
			expiresAt: { $gt: new Date() }
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
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		try {
			const { name, email, password } = req.body;
			const existing = await findUserByEmail(email);
			if (existing) return res.status(400).json({ error: 'User exists' });
			const hash = await bcrypt.hash(password, 10);
			const user = await createUser(name, email, hash);
			return res.json({ status: 'registered', userId: user._id });
		} catch (err) {
			logger.error({ err }, 'Error during register');
			return res.status(500).json({ error: 'Registration failed' });
		}
	}
);

	app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try later' }
});

app.post(
	'/auth/login',
	loginLimiter,
	body('email').isEmail().normalizeEmail(),
	body('password').isString(),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		try {
			const { email, password, deviceName } = req.body;
			const user = await findUserByEmail(email);
			if (!user) return res.status(401).json({ error: 'Invalid' });
			const ok = await bcrypt.compare(password, user.password_hash);
			if (!ok) return res.status(401).json({ error: 'Invalid' });
			
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
	}
);

// Refresh token endpoint
app.post('/auth/refresh', async (req, res) => {
	// accept refresh token in cookie or body
	const refreshToken = req.body.refreshToken || (req.cookies && req.cookies.refreshToken);
	if (!refreshToken) return res.status(401).json({ error: 'Invalid refresh token' });
	
	try {
		const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
		const userId = payload.sub;
		
		// Find and validate the refresh token
		const tokenDoc = await findValidRefreshToken(userId, refreshToken);
		if (!tokenDoc) return res.status(401).json({ error: 'Invalid or revoked refresh token' });
		
		// Issue new access token
		const user = await findUserByEmail !== 'function' ? null : null;
		const userDoc = !USE_IN_MEMORY ? await User.findById(userId) : _users.find(u => String(u._id) === String(userId));
		if (!userDoc) return res.status(401).json({ error: 'User not found' });
		
		const accessToken = jwt.sign(
			{ sub: userDoc._id, role: userDoc.role || 'user' },
			process.env.SECRET_KEY || 'secret',
			{ expiresIn: '15m' }
		);
		
		// Rotate refresh token: revoke old, issue new (use unique jti)
		const newRefreshPayload = { sub: userId, jti: uuidv4() };
		const newRefreshJwt = jwt.sign(newRefreshPayload, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
		
		if (!USE_IN_MEMORY) {
			// Revoke old token and store new one
			await revokeRefreshToken(tokenDoc._id);
			await storeRefreshToken(userId, newRefreshJwt, req);
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
	if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
	
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
		if (!device) return res.status(404).json({ error: 'Device not found' });
		
		await revokeRefreshToken(req.params.deviceId);
		res.json({ status: 'device revoked' });
	} catch (e) {
		logger.error({ err: e }, 'Error revoking device');
		res.status(500).json({ error: 'Failed to revoke device' });
	}
});

// Auth middleware
function authMiddleware(req, res, next) {
	const auth = req.headers.authorization;
	if (!auth) return res.status(401).json({ error: 'No token' });
	const token = auth.split(' ')[1];
	try {
		const payload = jwt.verify(token, process.env.SECRET_KEY || 'secret');
		req.user = payload;
		next();
	} catch (e) {
		return res.status(401).json({ error: 'Invalid token' });
	}
}

// Protected dataset upload
app.post('/datasets/upload', authMiddleware, async (req, res) => {
	const { name, type } = req.body;
	const ds = await createDataset(name, type, req.user.sub);
	res.json({ status: 'uploaded', id: ds._id });
});

// Run analysis by calling ai_core microservice, persist a Report and return the analysis summary
app.post(
	'/analyze',
	authMiddleware,
	// simple validation: dataset_name optional string, data required object
	body('dataset_name').optional().isString().isLength({ max: 200 }),
	body('data').exists().custom(v => v && typeof v === 'object'),
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
		try {
			const aiCoreUrl = process.env.AI_CORE_URL || 'http://ai_core:8100/ai_core/analyze';
			// Forward request body to ai_core
			const payload = { dataset_name: req.body.dataset_name || 'uploaded', data: req.body.data || {} };
			const tStart = Date.now();
			// forward request-id so ai_core logs/metrics can correlate
			const headers = { 'X-Request-Id': req.request_id };
			// Check cache for identical request payload
			const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
			if (analyzeCache.has(payloadHash)) {
				const cached = analyzeCache.get(payloadHash);
				return res.json(cached);
			}

			const aiResp = await axios.post(aiCoreUrl, payload, { timeout: Number(process.env.AI_CORE_TIMEOUT_MS || 60_000), headers });
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
			logger.error({ err }, 'Error calling ai_core');
			// Keep error messages generic in production
			if (process.env.NODE_ENV === 'production') return res.status(502).json({ error: 'Analysis service unavailable' });
			return res.status(500).json({ error: 'Analysis failed', details: err?.message });
		}
	}
);

// Get an analysis/report by id (simple proxy to DB)
app.get('/report/:id', authMiddleware, async (req, res) => {
	try {
		if (USE_IN_MEMORY) {
			const r = _reports.find(rr => String(rr._id) === String(req.params.id));
			if (!r) return res.status(404).json({ error: 'Not found' });
			return res.json({ report: r });
		}
		const rpt = await Report.findById(req.params.id);
		if (!rpt) return res.status(404).json({ error: 'Not found' });
		return res.json({ report: rpt });
	} catch (e) {
		logger.error({ err: e }, 'Error fetching report');
		return res.status(500).json({ error: 'Server error' });
	}
});

// Reports for a user
app.get('/reports/:userId', authMiddleware, async (req, res) => {
	const reports = await findReportsByUser(req.params.userId);
	res.json({ userId: req.params.userId, reports });
});

// Export app for testing; start server only if run directly
// Centralized error handler (must be added after routes)
app.use((err, req, res, next) => {
	logger.error({ err, path: req.path }, 'Unhandled exception');
	const status = err.status || 500;
	const payload = { error: status === 500 ? 'Internal server error' : err.message };
	if (process.env.NODE_ENV !== 'production') payload.stack = err.stack;
	res.status(status).json(payload);
});

if (require.main === module) {
	const port = process.env.PORT || 5000;
	app.listen(port, () => logger.info({ port }, 'Backend system API listening'));
}

module.exports = app;
