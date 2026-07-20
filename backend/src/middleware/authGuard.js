const jwt = require('jsonwebtoken');
const { firebaseAuth } = require('./firebaseAuth');
const firebaseAdmin = require('../services/firebaseAdmin');
const logger = require('../logger');
const tenantContext = require('../utils/tenantContext');
const { getSecret } = require('../config/secrets');

const IN_MEMORY_MODE = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';
// Test bypass requires BOTH NODE_ENV=test AND an explicit opt-in flag.
// This prevents accidental auth bypass if NODE_ENV leaks in production.
const AUTH_TEST_BYPASS = process.env.NODE_ENV === 'test' && process.env.AUTH_TEST_BYPASS === '1';

/**
 * Resolves the tenantId for the already-authenticated request (req.user set).
 * Order of precedence: explicit claim on the token payload, then a lookup
 * against the local User record (covers tokens issued before tenant
 * assignment). Runs outside the tenant AsyncLocalStorage context so the
 * lookup itself is never tenant-scoped.
 */
async function resolveTenantId(req) {
  if (!req.user) {
    return null;
  }
  if (req.user.tenantId || req.user.tenant_id) {
    return req.user.tenantId || req.user.tenant_id;
  }
  if (IN_MEMORY_MODE) {
    return req.headers['x-test-tenant-id'] || null;
  }
  try {
    const User = require('../models/User');
    const userId = req.user.sub || req.user.uid;
    if (!userId) {
      return null;
    }
    const userDoc = await User.findOne({ $or: [{ _id: userId }, { firebase_uid: userId }] })
      .select('tenantId')
      .lean()
      .catch(() => null);
    return (userDoc && userDoc.tenantId) || null;
  } catch (e) {
    logger.warn({ err: e }, 'tenant_resolution_failed');
    return null;
  }
}

/**
 * Attaches tenant context to the request and binds the rest of the request
 * lifecycle to an AsyncLocalStorage store so Mongoose queries are
 * automatically scoped to the resolved tenant (see models/plugins/tenantScope.js).
 */
function attachTenantContext(req, res, next) {
  resolveTenantId(req)
    .then((tenantId) => {
      req.tenantId = tenantId || null;
      if (req.user) {
        req.user.tenantId = tenantId || null;
      }
      tenantContext.run({ tenantId: tenantId || null }, next);
    })
    .catch((e) => {
      logger.warn({ err: e }, 'attach_tenant_context_failed');
      req.tenantId = null;
      tenantContext.run({ tenantId: null }, next);
    });
}

/**
 * Central Authentication Guard Middleware
 *
 * AUTHENTICATION FLOW (as of 2026):
 *
 * 1. PRIMARY (Production): Firebase ID Token
 *    - Frontend: User logs in via Firebase, gets ID token
 *    - Frontend: Attaches Firebase ID token to Authorization header (Bearer token)
 *    - Backend: Validates Firebase token via firebaseAuth middleware
 *    - Backend: Extracts user info from Firebase token payload
 *    - Result: req.user populated with uid, email, role claims
 *
 * 2. ENTERPRISE SSO: SAML, OIDC, LDAP
 *    - User authenticates via SAML, OIDC, or LDAP
 *    - Backend issues a JWT token with SSO claims
 *    - Frontend attaches token to Authorization header
 *    - Backend validates JWT and extracts SSO identity
 *
 * 3. FALLBACK (Dev/Testing): Local JWT
 *    - Only when AUTH_PROVIDER !== 'firebase'
 *    - Accepts token from Authorization header or 'accessToken' cookie
 *    - Verifies against SECRET_KEY environment variable
 *
 * 4. TEST MODE BYPASS:
 *    - NODE_ENV=test allows requests without tokens (uses x-test-user-id header)
 *    - CI/demo friendly; not for production
 *
 * Usage:
 *   - Apply authGuard to all protected routes
 *   - Check req.user for authenticated user info
 *   - Use requireRole() to enforce role-based access
 */
function authGuard(req, res, next) {
  // Test-mode bypass: requires NODE_ENV=test AND AUTH_TEST_BYPASS=1.
  // Also respects x-enforce-auth: 1 header to force real auth even in test.
  if (
    AUTH_TEST_BYPASS &&
    req.headers['x-enforce-auth'] !== '1' &&
    !(req.headers.authorization || '').startsWith('Bearer ')
  ) {
    const testSub = req.headers['x-test-user-id'] || 'user123';
    const testRole = req.headers['x-test-user-role'] || 'admin';
    req.user = { sub: String(testSub), role: testRole };
    req.role = req.user.role || 'user';
    req.userId = req.user.sub;
    return attachTenantContext(req, res, next);
  }

  // PRIMARY: Firebase authentication (production recommended)
  if (process.env.AUTH_PROVIDER === 'firebase') {
    try {
      // Ensure firebase admin is initialized via centralized wrapper
      firebaseAdmin.initFirebase();
    } catch (e) {
      logger.warn({ err: e }, 'Firebase admin init failed in authGuard');
    }
    return firebaseAuth(req, res, () => attachTenantContext(req, res, next));
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
      message: 'Authentication token required',
    });
  }

  try {
    const payload = jwt.verify(token, getSecret('SECRET_KEY'));
    req.user = payload;
    req.role = (payload && payload.role) || 'user';
    req.userId = (payload && payload.sub);
    return attachTenantContext(req, res, next);
  } catch (_e) {
    // Token invalid or expired
    res.status(401);
    return res.json({
      error: 'invalid_token',
      message: 'Invalid or expired authentication token',
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
        message: `This resource requires '${role}' role. You have '${userRole}'.`,
      });
    }
    return next();
  };
}

module.exports = { authGuard, requireRole };
