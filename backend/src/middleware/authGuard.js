const jwt = require('jsonwebtoken');
const { firebaseAuth } = require('./firebaseAuth');
const firebaseAdmin = require('../services/firebaseAdmin');
const logger = require('../logger');

/**
 * Central auth guard middleware.
 * - If AUTH_PROVIDER === 'firebase', delegate to firebaseAuth (which initializes admin as needed).
 * - Otherwise verify a JWT access token from Authorization header or HttpOnly cookie named `accessToken`.
 * Attaches `req.user` (token payload) and allows downstream handlers to consult `req.user.sub` and `req.user.role`.
 */
function authGuard(req, res, next) {
  // Test-mode bypass to keep CI/tests and demo flows working when explicit auth is not enforced
  if (
    process.env.NODE_ENV === 'test' &&
    req.headers['x-enforce-auth'] !== '1' &&
    !(req.headers.authorization || '').startsWith('Bearer ')
  ) {
    // Allow tests to override the test user via headers for compatibility with
    // legacy per-route `maybeAuth` behavior (some routes expected default 'user123').
    const testSub = req.headers['x-test-user-id'] || 'user123';
    const testRole = req.headers['x-test-user-role'] || 'admin';
    req.user = { sub: String(testSub), role: testRole };
    // mirror common convenience fields used across the codebase
    req.role = req.user.role || 'user';
    req.userId = req.user.sub || req.userId;
    return next();
  }

  if (process.env.AUTH_PROVIDER === 'firebase') {
    try {
      // Ensure firebase admin is initialized via the centralized wrapper
      firebaseAdmin.initFirebase();
    } catch (e) {
      logger.warn({ err: e }, 'init_firebase_failed_in_authGuard');
    }
    return firebaseAuth(req, res, next);
  }

  // JWT fallback: accept Authorization: Bearer <token> or cookie accessToken
  let token = null;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY || 'secret');
    req.user = payload;
    // Mirror convenience fields so RBAC middleware that checks req.role works
    req.role = (payload && payload.role) || req.role || 'user';
    req.userId = (payload && payload.sub) || req.userId;
    return next();
  } catch (e) {
    // token invalid or expired
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    const userRole = (req.user && req.user.role) || req.role || 'user';
    if (userRole !== role) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}

module.exports = { authGuard, requireRole };
