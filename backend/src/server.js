const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('./logger');
const { withRequest } = require('./logger');
const promClient = require('prom-client');
const { v4: uuidv4 } = require('uuid');
let User, Dataset, Report;

// Accept reasonably-sized JSON bodies; keep it conservative for production
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));

// Global rate limiter recommended for demo/prod: 60 requests per minute per IP by default
app.use(
	rateLimit({
		windowMs: Number(process.env.RATE_WINDOW_MS || 60_000),
		max: Number(process.env.RATE_MAX || 60),
		standardHeaders: true,
		legacyHeaders: false,
		message: { error: 'Too many requests, slow down' }
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
		log.info({ route, status, duration: dur }, 'request_finished');
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

if (!USE_IN_MEMORY) {
	User = require('./models/User');
	Dataset = require('./models/Dataset');
	Report = require('./models/Report');
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
			const { email, password } = req.body;
			const user = await findUserByEmail(email);
			if (!user) return res.status(401).json({ error: 'Invalid' });
			const ok = await bcrypt.compare(password, user.password_hash);
			if (!ok) return res.status(401).json({ error: 'Invalid' });
			const accessToken = jwt.sign({ sub: user._id, role: user.role }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
			const refreshToken = jwt.sign({ sub: user._id }, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
			// store refresh token server-side (hashing optional for demo)
			_refreshTokens.set(refreshToken, String(user._id));
			// Optionally set refresh token as secure HttpOnly cookie in production
			if (process.env.USE_COOKIE_REFRESH === '1') {
				const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
				res.cookie('refreshToken', refreshToken, cookieOpts);
				return res.json({ accessToken });
			}
			return res.json({ accessToken, refreshToken });
		} catch (err) {
			logger.error({ err }, 'Error during login');
			return res.status(500).json({ error: 'Login failed' });
		}
	}
);

// Refresh token endpoint (scaffold)
app.post('/auth/refresh', (req, res) => {
	// accept refresh token in cookie or body
	const refreshToken = req.body.refreshToken || req.cookies && req.cookies.refreshToken;
	if (!refreshToken || !_refreshTokens.has(refreshToken)) return res.status(401).json({ error: 'Invalid refresh token' });
	try {
		const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
		// rotate refresh token: revoke old, issue new
		_refreshTokens.delete(refreshToken);
		const newRefresh = jwt.sign({ sub: payload.sub }, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
		_refreshTokens.set(newRefresh, String(payload.sub));
		const accessToken = jwt.sign({ sub: payload.sub, role: payload.role || 'user' }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
		if (process.env.USE_COOKIE_REFRESH === '1') {
			const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 3600 * 1000 };
			res.cookie('refreshToken', newRefresh, cookieOpts);
			return res.json({ accessToken });
		}
		res.json({ accessToken, refreshToken: newRefresh });
	} catch (e) {
		return res.status(401).json({ error: 'Invalid refresh token' });
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
			const aiResp = await axios.post(aiCoreUrl, payload, { timeout: Number(process.env.AI_CORE_TIMEOUT_MS || 60_000), headers });
			const tEnd = Date.now();
			aiCoreDuration.observe({ route: '/ai_core/analyze' }, (tEnd - tStart) / 1000);
			const analysisId = aiResp.data.analysis_id || aiResp.data.analysisId || null;
			const summary = aiResp.data.summary || aiResp.data || {};

			// Persist report (associate with user)
			const report = await createReport(analysisId, summary, req.user.sub, { datasetName: payload.dataset_name });
			return res.json({ status: 'ok', reportId: report._id || report.id || null, analysisId, summary });
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
