const jwt = require('jsonwebtoken');
const { firebaseAuth } = require('./firebaseAuth');
const firebaseAdmin = require('../services/firebaseAdmin');
const logger = require('../logger');

/**
 * Central Authentication Guard Middleware
 * 
 * AUTHENTICATION FLOW (SIMPLIFIED as of Feb 28, 2026):
 * 
 * 1. PRIMARY (Production): Firebase ID Token
 *    - Frontend: User logs in via Firebase, gets ID token
 *    - Frontend: Attaches Firebase ID token to Authorization header (Bearer token)
 *    - Backend: Validates Firebase token via firebaseAuth middleware
 *    - Backend: Extracts user info from Firebase token payload
 *    - Result: req.user populated with uid, email, role claims
 * 
 * 2. FALLBACK (Dev/Testing): Local JWT
 *    - Only when AUTH_PROVIDER !== 'firebase'
 *    - Accepts token from Authorization header or 'accessToken' cookie
 *    - Verifies against SECRET_KEY environment variable
 * 
 * 3. TEST MODE BYPASS:
 *    - NODE_ENV=test allows requests without tokens (uses x-test-user-id header)
 *    - CI/demo friendly; not for production
 * 
 * Usage:
 *   - Apply authGuard to all protected routes
 *   - Check req.user for authenticated user info
 *   - Use requireRole() to enforce role-based access
 */
function authGuard(req, res, next) {
  // Test-mode bypass to keep CI/tests and demo flows working when explicit auth is not enforced
  if (
    process.env.NODE_ENV === 'test' &&
    req.headers['x-enforce-auth'] !== '1' &&
    !(req.headers.authorization || '').startsWith('Bearer ')
  ) {
    // Allow tests to override the test user via headers for compatibility with
    // legacy per-route behavior
    const testSub = req.headers['x-test-user-id'] || 'user123';
    const testRole = req.headers['x-test-user-role'] || 'admin';
    req.user = { sub: String(testSub), role: testRole };
    req.role = req.user.role || 'user';
    req.userId = req.user.sub;
    return next();
  }

  // PRIMARY: Firebase authentication (production recommended)
  if (process.env.AUTH_PROVIDER === 'firebase') {
    try {
      // Ensure firebase admin is initialized via centralized wrapper
      firebaseAdmin.initFirebase();
    } catch (e) {
      logger.warn({ err: e }, 'Firebase admin init failed in authGuard');
    }
    return firebaseAuth(req, res, next);
  }

  // FALLBACK: Local JWT verification (development mode)
  let token = null;
  const auth = req.headers.authorization;
  
  if (auth && auth.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    res.status(401);
    return res.json({ 
      error: 'no_token',
      message: 'Authentication token required' 
    });
  }

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY || 'secret');
    req.user = payload;
    req.role = (payload && payload.role) || 'user';
    req.userId = (payload && payload.sub);
    return next();
  } catch (e) {
    // Token invalid or expired
    res.status(401);
    return res.json({ 
      error: 'invalid_token',
      message: 'Invalid or expired authentication token' 
    });
  }
}

/**
 * Role-based access control middleware
 * Enforces that authenticated user has the required role
 * 
 * Usage: router.get('/admin-only', authGuard, requireRole('admin'), handler)
 */
function requireRole(role) {
  return (req, res, next) => {
    const userRole = (req.user && req.user.role) || req.role || 'user';
    if (userRole !== role) {
      res.status(403);
      return res.json({ 
        error: 'forbidden',
        message: `This resource requires '${role}' role. You have '${userRole}'.`
      });
    }
    return next();
  };
}

module.exports = { authGuard, requireRole };
