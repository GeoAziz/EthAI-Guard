const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
let User, Dataset, Report;

app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/ethixai';
const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';

// Simple in-memory stores used for tests or when USE_IN_MEMORY is set
const _users = [];
const _datasets = [];
const _reports = [];
const _refreshTokens = new Map(); // refreshToken -> userId

if (!USE_IN_MEMORY) {
	User = require('./models/User');
	Dataset = require('./models/Dataset');
	Report = require('./models/Report');
	mongoose.connect(MONGO_URL).then(() => console.log('Connected to MongoDB')).catch(console.error);
} else {
	console.log('Using in-memory stores for backend (test mode)');
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

// Auth
app.post('/auth/register', async (req, res) => {
	const { name, email, password } = req.body;
	const existing = await findUserByEmail(email);
	if (existing) return res.status(400).json({ error: 'User exists' });
	const hash = await bcrypt.hash(password, 10);
	const user = await createUser(name, email, hash);
	res.json({ status: 'registered', userId: user._id });
});

app.post('/auth/login', async (req, res) => {
	const { email, password } = req.body;
	const user = await findUserByEmail(email);
	if (!user) return res.status(401).json({ error: 'Invalid' });
	const ok = await bcrypt.compare(password, user.password_hash);
	if (!ok) return res.status(401).json({ error: 'Invalid' });
	const accessToken = jwt.sign({ sub: user._id, role: user.role }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
	const refreshToken = jwt.sign({ sub: user._id }, process.env.REFRESH_SECRET || 'refresh_secret', { expiresIn: '7d' });
	_refreshTokens.set(refreshToken, String(user._id));
	res.json({ accessToken, refreshToken });
});

// Refresh token endpoint (scaffold)
app.post('/auth/refresh', (req, res) => {
	const { refreshToken } = req.body;
	if (!refreshToken || !_refreshTokens.has(refreshToken)) return res.status(401).json({ error: 'Invalid refresh token' });
	try {
		const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET || 'refresh_secret');
		const accessToken = jwt.sign({ sub: payload.sub, role: payload.role || 'user' }, process.env.SECRET_KEY || 'secret', { expiresIn: '15m' });
		res.json({ accessToken });
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

// Reports for a user
app.get('/reports/:userId', authMiddleware, async (req, res) => {
	const reports = await findReportsByUser(req.params.userId);
	res.json({ userId: req.params.userId, reports });
});

// Export app for testing; start server only if run directly
if (require.main === module) {
	const port = process.env.PORT || 5000;
	app.listen(port, () => console.log(`Backend system API listening on ${port}`));
}

module.exports = app;
