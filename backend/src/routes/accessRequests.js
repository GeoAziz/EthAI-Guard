const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const logger = require('../logger');
const auditLogger = require('../services/auditLogger');

const AccessRequest = require('../models/AccessRequest');
const User = require('../models/User');

// In-memory fallback for test / demo mode when MongoDB is not available

// Support in-memory mode when NODE_ENV=test or USE_IN_MEMORY_DB=1
const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1' || process.env.USE_IN_MEMORY === '1';

// In-memory store for access requests (used in test/in-memory mode)
const _accessRequests = [];

function genId() {
  return `ar-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function createAccessRequestInMemory({ name, email, reason, requesterId }) {
  const doc = { _id: genId(), name: name || null, email: email || null, reason, requesterId: requesterId || null, status: 'pending', handledBy: null, handledAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  _accessRequests.push(doc);
  return doc;
}

async function findAccessRequestByIdInMemory(id) {
  return _accessRequests.find(r => String(r._id) === String(id)) || null;
}

async function listAccessRequestsInMemory(q = {}, skip = 0, limit = 100) {
  let items = _accessRequests.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (q.status) items = items.filter(i => i.status === q.status);
  return items.slice(skip, skip + limit);
}
const { firebaseAuth } = require('../middleware/firebaseAuth');

// Reuse the same maybeAuth pattern found in other route files
function maybeAuth(req, res, next) {
  // Test-mode bypass to keep flows working in CI/demo without a token
  if (
    process.env.NODE_ENV === 'test' &&
    req.headers['x-enforce-auth'] !== '1' &&
    !(req.headers.authorization || '').startsWith('Bearer ')
  ) {
    req.user = { sub: 'test', role: 'admin', email: 'test@local' };
    return next();
  }
  if (process.env.AUTH_PROVIDER === 'firebase') {
    return firebaseAuth(req, res, next);
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY || 'secret');
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    const userRole = (req.user && req.user.role) || req.role || 'user';
    if (userRole !== role) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

/**
 * Create an access request
 * POST /v1/access-requests
 */
router.post(
  '/v1/access-requests',
  maybeAuth,
  body('reason').isString().isLength({ min: 5 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'validation_failed', details: errors.array() });
    try {
      const name = req.body.name || (req.user && req.user.name) || null;
      const email = req.body.email || (req.user && req.user.email) || null;
      const reason = req.body.reason;
      const requesterId = req.user && req.user.sub ? String(req.user.sub) : null;

      let doc;
      if (USE_IN_MEMORY) {
        doc = await createAccessRequestInMemory({ name, email, reason, requesterId });
      } else {
        doc = await AccessRequest.create({ name, email, reason, requesterId, status: 'pending' });
      }
      await auditLogger.log({ event_type: 'ACCESS_REQUEST_CREATED', actor: requesterId || email || 'anonymous', details: { requestId: doc._id } });
      return res.status(201).json({ status: 'created', id: doc._id });
    } catch (e) {
      logger.error({ err: e }, 'access_request_create_failed');
      return res.status(500).json({ error: 'create_failed' });
    }
  }
);

/**
 * List access requests (admin only)
 * GET /v1/access-requests
 */
router.get('/v1/access-requests', maybeAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, limit = 100, page = 1 } = req.query;
    const q = {};
    if (status) q.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    let items;
    if (USE_IN_MEMORY) {
      items = await listAccessRequestsInMemory(q, skip, Number(limit));
    } else {
      items = await AccessRequest.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit));
    }
    return res.json({ items, count: items.length });
  } catch (e) {
    logger.error({ err: e }, 'access_requests_list_failed');
    return res.status(500).json({ error: 'list_failed' });
  }
});

/**
 * Approve an access request (admin only)
 * POST /v1/access-requests/:id/approve
 */
router.post('/v1/access-requests/:id/approve', maybeAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    let ar;
    if (USE_IN_MEMORY) {
      ar = await findAccessRequestByIdInMemory(id);
      if (!ar) return res.status(404).json({ error: 'not_found' });
      if (ar.status === 'approved') return res.status(400).json({ error: 'already_approved' });
      ar.status = 'approved';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date().toISOString();
      ar.updatedAt = new Date().toISOString();
    } else {
      ar = await AccessRequest.findById(id);
      if (!ar) return res.status(404).json({ error: 'not_found' });
      if (ar.status === 'approved') return res.status(400).json({ error: 'already_approved' });
      // set status
      ar.status = 'approved';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date();
      await ar.save();
    }

    // assign role to user if email present (best-effort; may be noop in in-memory mode)
    let claimsSync = { status: 'skipped', message: 'no-email-or-not-configured' };
    if (ar.email) {
      try {
        if (!USE_IN_MEMORY) {
          let u = await User.findOne({ email: ar.email });
          if (!u) {
            u = await User.create({ name: ar.name || ar.email.split('@')[0], email: ar.email, role: 'admin' });
          } else {
            u.role = 'admin';
            await u.save();
          }
          await auditLogger.log({ event_type: 'ACCESS_REQUEST_APPROVED', actor: req.user.sub, target_user: u._id, details: { requestId: ar._id } });

          // Try to sync role to Firebase custom claims (best-effort).
          try {
            const fs = require('fs');
            const path = require('path');
            let admin;
            try {
              admin = require('firebase-admin');
            } catch (e) {
              admin = null;
            }
            if (admin) {
              // Initialize admin SDK if not already initialized and creds are available
              if (!admin.apps || admin.apps.length === 0) {
                const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../../serviceAccountKey.json');
                if (fs.existsSync(saPath)) {
                  try {
                    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
                  } catch (initErr) {
                    logger.warn({ err: initErr }, 'firebase_admin_init_failed');
                  }
                }
              }

              // Determine uid: prefer stored firebase_uid, else lookup by email
              let uid = u.firebase_uid;
              try {
                if (!uid) {
                  const fbUser = await admin.auth().getUserByEmail(ar.email);
                  uid = fbUser && fbUser.uid;
                }
                if (uid) {
                  await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
                  logger.info({ uid, email: ar.email }, 'firebase_custom_claims_set');
                  claimsSync = { status: 'success', message: 'custom_claims_set' };
                } else {
                  claimsSync = { status: 'failed', message: 'user_not_found_in_firebase' };
                }
              } catch (fbErr) {
                logger.warn({ err: fbErr, email: ar.email }, 'firebase_set_custom_claims_failed');
                claimsSync = { status: 'failed', message: fbErr.message || String(fbErr) };
              }
            } else {
              claimsSync = { status: 'skipped', message: 'firebase_admin_missing' };
            }
          } catch (e) {
            logger.warn({ err: e }, 'firebase_custom_claims_best_effort_failed');
            claimsSync = { status: 'failed', message: e.message || String(e) };
          }
        } else {
          // in-memory mode: just log audit
          await auditLogger.log({ event_type: 'ACCESS_REQUEST_APPROVED', actor: req.user.sub, details: { requestId: ar._id } });
          claimsSync = { status: 'skipped', message: 'in_memory_mode' };
        }
      } catch (e) {
        logger.warn({ err: e }, 'assign_role_best_effort_failed');
        claimsSync = { status: 'failed', message: e.message || String(e) };
      }
    } else {
      await auditLogger.log({ event_type: 'ACCESS_REQUEST_APPROVED', actor: req.user.sub, details: { requestId: ar._id } });
    }

    return res.json({ status: 'approved', id: ar._id, claimsSync });
  } catch (e) {
    logger.error({ err: e }, 'access_request_approve_failed');
    return res.status(500).json({ error: 'approve_failed' });
  }
});

/**
 * Reject an access request (admin only)
 * POST /v1/access-requests/:id/reject
 */
router.post('/v1/access-requests/:id/reject', maybeAuth, requireRole('admin'), async (req, res) => {
  try {
    const id = req.params.id;
    let ar;
    if (USE_IN_MEMORY) {
      ar = await findAccessRequestByIdInMemory(id);
      if (!ar) return res.status(404).json({ error: 'not_found' });
      if (ar.status === 'rejected') return res.status(400).json({ error: 'already_rejected' });
      ar.status = 'rejected';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date().toISOString();
      ar.updatedAt = new Date().toISOString();
    } else {
      ar = await AccessRequest.findById(id);
      if (!ar) return res.status(404).json({ error: 'not_found' });
      if (ar.status === 'rejected') return res.status(400).json({ error: 'already_rejected' });
      ar.status = 'rejected';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date();
      await ar.save();
    }
    await auditLogger.log({ event_type: 'ACCESS_REQUEST_REJECTED', actor: req.user.sub, details: { requestId: ar._id } });
    return res.json({ status: 'rejected', id: ar._id });
  } catch (e) {
    logger.error({ err: e }, 'access_request_reject_failed');
    return res.status(500).json({ error: 'reject_failed' });
  }
});

/**
 * Admin endpoint to set a user's role
 * PATCH /v1/users/:id/role
 */
router.patch('/v1/users/:id/role', maybeAuth, requireRole('admin'), body('role').isString().isLength({ min: 1 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'validation_failed', details: errors.array() });
  try {
    const role = req.body.role;
    const userId = req.params.id;
    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ error: 'user_not_found' });
    u.role = role;
    await u.save();
    await auditLogger.log({ event_type: 'USER_ROLE_UPDATED', actor: req.user.sub, target_user: u._id, details: { role } });
    return res.json({ status: 'ok', userId: u._id, role: u.role });
  } catch (e) {
    logger.error({ err: e }, 'user_role_update_failed');
    return res.status(500).json({ error: 'update_failed' });
  }
});

// Get current authenticated user (authoritative role from DB)
router.get('/v1/users/me', maybeAuth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (process.env.USE_IN_MEMORY === '1' || process.env.NODE_ENV === 'test') {
      // in-memory: try to respond with minimal stub
      return res.json({ id: req.user?.sub || null, email: req.user?.email || null, role: req.role || 'user', name: null });
    }
    const User = require('../models/User');
    const id = req.user && req.user.sub ? String(req.user.sub) : null;
    let u = null;
    if (id) u = await User.findById(id).select('name email role firebase_uid').lean();
    if (!u && req.user && req.user.email) u = await User.findOne({ email: req.user.email }).select('name email role firebase_uid').lean();
    if (!u) return res.status(404).json({ error: 'not_found' });
    return res.json({ id: u._id || u.id, email: u.email, name: u.name, role: u.role });
  } catch (e) {
    logger.error({ err: e }, 'users_me_failed');
    return res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;

/**
 * Promote user by email (admin only) - best-effort: create or update user, set role, and try to sync Firebase claims
 * POST /v1/users/promote
 * body: { email: string, role: string }
 */
router.post('/v1/users/promote', maybeAuth, requireRole('admin'), async (req, res) => {
  try {
    const { email, role } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: 'email_and_role_required' });

    let u = null;
    if (!USE_IN_MEMORY) {
      u = await User.findOne({ email });
      if (!u) {
        u = await User.create({ name: email.split('@')[0], email, role });
      } else {
        u.role = role;
        await u.save();
      }
      await auditLogger.log({ event_type: 'USER_PROMOTED', actor: req.user.sub, target_user: u._id, details: { email, role } });
    } else {
      // in-memory behavior: return minimal info
      u = { email, role, _id: `inmem-${Date.now()}` };
    }

    // Try to sync custom claims
    let claimsSync = { status: 'skipped', message: 'not_attempted' };
    try {
      const admin = (() => { try { return require('firebase-admin'); } catch (e) { return null; } })();
      if (admin) {
        if (!admin.apps || admin.apps.length === 0) {
          const fs = require('fs');
          const path = require('path');
          const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../../serviceAccountKey.json');
          if (fs.existsSync(saPath)) {
            try {
              admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
            } catch (initErr) {
              // ignore init error
            }
          }
        }
        try {
          let uid = u.firebase_uid;
          if (!uid) {
            const fbUser = await admin.auth().getUserByEmail(email).catch(() => null);
            uid = fbUser && fbUser.uid;
          }
          if (uid) {
            await admin.auth().setCustomUserClaims(uid, { role });
            claimsSync = { status: 'success', message: 'custom_claims_set' };
          } else {
            claimsSync = { status: 'failed', message: 'user_not_found_in_firebase' };
          }
        } catch (fbErr) {
          claimsSync = { status: 'failed', message: fbErr.message || String(fbErr) };
        }
      } else {
        claimsSync = { status: 'skipped', message: 'firebase_admin_missing' };
      }
    } catch (e) {
      claimsSync = { status: 'failed', message: e.message || String(e) };
    }

    return res.json({ status: 'ok', user: { id: u._id || u.id, email: u.email, role: u.role }, claimsSync });
  } catch (e) {
    logger.error({ err: e }, 'promote_user_failed');
    return res.status(500).json({ error: 'promote_failed' });
  }
});

