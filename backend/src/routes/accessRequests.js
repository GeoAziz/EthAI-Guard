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
  if (q.status) {
    items = items.filter(i => i.status === q.status);
  }
  return items.slice(skip, skip + limit);
}
const { authGuard } = require('../middleware/authGuard');
const { requireRole } = require('../middleware/rbac');
const notifications = require('../notifications');
const { claimsSyncFailureTotal, claimsSyncSuccessTotal } = require('../utils/metrics');

/**
 * Create an access request
 * POST /v1/access-requests
 */
router.post(
  '/v1/access-requests',
  authGuard,
  body('reason').isString().isLength({ min: 5 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'validation_failed', details: errors.array() });
    }
    try {
      const name = req.body.name || (req.user && req.user.name) || null;
      const email = req.body.email || (req.user && req.user.email) || null;
      const { reason } = req.body;
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
  },
);

/**
 * List access requests (admin only)
 * GET /v1/access-requests
 */
router.get('/v1/access-requests', authGuard, requireRole('admin'), async (req, res) => {
  try {
    // Support pagination for large orgs. Query params: page, limit
    const { status, limit = 50, page = 1 } = req.query;
    const q = {};
    if (typeof status === 'string' && status.length > 0) {
      q.status = { $eq: status };
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const perPage = Math.max(1, Math.min(500, Number(limit) || 50));
    const skip = (pageNum - 1) * perPage;

    let items = [];
    let totalCount = 0;
    if (USE_IN_MEMORY) {
      // listAccessRequestsInMemory already returns sorted slice; compute total from store
      const all = await listAccessRequestsInMemory(q, 0, Number.MAX_SAFE_INTEGER);
      totalCount = all.length;
      items = all.slice(skip, skip + perPage);
    } else {
      totalCount = await AccessRequest.countDocuments(q);
      items = await AccessRequest.find(q).sort({ createdAt: -1 }).skip(skip).limit(perPage);
    }

    const totalPages = Math.ceil(totalCount / perPage);
    return res.json({ items, count: totalCount, page: pageNum, limit: perPage, totalPages });
  } catch (e) {
    logger.error({ err: e }, 'access_requests_list_failed');
    return res.status(500).json({ error: 'list_failed' });
  }
});

/**
 * Approve an access request (admin only)
 * POST /v1/access-requests/:id/approve
 */
router.post('/v1/access-requests/:id/approve', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    let ar;
    if (USE_IN_MEMORY) {
      ar = await findAccessRequestByIdInMemory(id);
      if (!ar) {
        return res.status(404).json({ error: 'not_found' });
      }
      if (ar.status === 'approved') {
        return res.status(400).json({ error: 'already_approved' });
      }
      ar.status = 'approved';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date().toISOString();
      ar.updatedAt = new Date().toISOString();
    } else {
      ar = await AccessRequest.findById(id);
      if (!ar) {
        return res.status(404).json({ error: 'not_found' });
      }
      if (ar.status === 'approved') {
        return res.status(400).json({ error: 'already_approved' });
      }
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
            // Use centralized firebaseAdmin wrapper (best-effort). This avoids
            // duplicating initialization logic in many routes and centralizes
            // error handling for missing credentials.
            const firebaseAdmin = require('../services/firebaseAdmin');
            // Determine uid: prefer stored firebase_uid, else lookup by email
            let uid = u.firebase_uid;
            try {
              if (!uid) {
                const fbUser = await firebaseAdmin.getUserByEmail(ar.email).catch(() => null);
                uid = fbUser && fbUser.uid;
              }
              if (uid) {
                await firebaseAdmin.setCustomUserClaims(uid, { role: 'admin' });
                logger.info({ uid, email: ar.email }, 'firebase_custom_claims_set');
                claimsSync = { status: 'success', message: 'custom_claims_set' };
                try {
                  if (claimsSyncSuccessTotal) {
                    claimsSyncSuccessTotal.inc();
                  }
                } catch (mErr) { /* ignore */ }
              } else {
                claimsSync = { status: 'failed', message: 'user_not_found_in_firebase' };
                try {
                  if (claimsSyncFailureTotal) {
                    claimsSyncFailureTotal.inc({ reason: 'user_not_found_in_firebase' });
                  }
                } catch (mErr) { }
              }
            } catch (fbErr) {
              logger.warn({ err: fbErr, email: ar.email }, 'firebase_set_custom_claims_failed');
              claimsSync = { status: 'failed', message: fbErr.message || String(fbErr) };
              try {
                if (claimsSyncFailureTotal) {
                  claimsSyncFailureTotal.inc({ reason: 'firebase_set_claims_error' });
                }
              } catch (mErr) { }
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
        try {
          if (claimsSyncFailureTotal) {
            claimsSyncFailureTotal.inc({ reason: 'assign_role_failed' });
          }
        } catch (mErr) { }
      }
    } else {
      await auditLogger.log({ event_type: 'ACCESS_REQUEST_APPROVED', actor: req.user.sub, details: { requestId: ar._id } });
    }

    // best-effort notification (non-blocking)
    (async () => {
      try {
        if (notifications && notifications.sendAlert) {
          const alert = {
            _id: ar._id,
            type: 'access_request_approved',
            severity: 'stable',
            email: ar.email,
            details: { requestId: ar._id, claimsSync },
            created_at: new Date().toISOString(),
          };
          await notifications.sendAlert(alert);
        }
      } catch (nerr) {
        logger.warn({ err: nerr }, 'notify_access_request_approved_failed');
      }
    })();

    // Optional: if approver requested to email the user, send a direct email (best-effort).
    // Caller may provide `emailUser: true` in the request body to trigger this.
    (async () => {
      try {
        if (req.body && req.body.emailUser && ar.email && notifications && notifications.sendAlertEmail) {
          const emailAlert = {
            _id: ar._id,
            type: 'access_request_approved_email',
            severity: 'stable',
            email: ar.email,
            details: { requestId: ar._id, claimsSync },
            created_at: new Date().toISOString(),
          };
          await notifications.sendAlertEmail(emailAlert, ar.email);
        }
      } catch (emailErr) {
        logger.warn({ err: emailErr }, 'send_approve_email_failed');
      }
    })();

    // If the claims-sync failed, send a dedicated best-effort alert so on-call
    // or monitoring can be notified separately from the approve notification.
    if (claimsSync && claimsSync.status === 'failed') {
      (async () => {
        try {
          if (notifications && notifications.sendAlert) {
            const alert = {
              _id: ar._id,
              type: 'claims_sync_failed',
              severity: 'critical',
              email: ar.email,
              details: { requestId: ar._id, claimsSync },
              created_at: new Date().toISOString(),
            };
            await notifications.sendAlert(alert);
          }
        } catch (nerr) {
          logger.warn({ err: nerr }, 'notify_claims_sync_failed_failed');
        }
      })();
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
router.post('/v1/access-requests/:id/reject', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    let ar;
    if (USE_IN_MEMORY) {
      ar = await findAccessRequestByIdInMemory(id);
      if (!ar) {
        return res.status(404).json({ error: 'not_found' });
      }
      if (ar.status === 'rejected') {
        return res.status(400).json({ error: 'already_rejected' });
      }
      ar.status = 'rejected';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date().toISOString();
      ar.updatedAt = new Date().toISOString();
    } else {
      ar = await AccessRequest.findById(id);
      if (!ar) {
        return res.status(404).json({ error: 'not_found' });
      }
      if (ar.status === 'rejected') {
        return res.status(400).json({ error: 'already_rejected' });
      }
      ar.status = 'rejected';
      ar.handledBy = req.user.sub || 'admin';
      ar.handledAt = new Date();
      await ar.save();
    }
    await auditLogger.log({ event_type: 'ACCESS_REQUEST_REJECTED', actor: req.user.sub, details: { requestId: ar._id } });
    // best-effort notify about rejection
    (async () => {
      try {
        if (notifications && notifications.sendAlert) {
          const alert = {
            _id: ar._id,
            type: 'access_request_rejected',
            severity: 'warning',
            email: ar.email,
            details: { requestId: ar._id },
            created_at: new Date().toISOString(),
          };
          await notifications.sendAlert(alert);
        }
      } catch (nerr) {
        logger.warn({ err: nerr }, 'notify_access_request_rejected_failed');
      }
    })();

    // Optional: if approver requested to email the user on rejection
    (async () => {
      try {
        if (req.body && req.body.emailUser && ar.email && notifications && notifications.sendAlertEmail) {
          const emailAlert = {
            _id: ar._id,
            type: 'access_request_rejected_email',
            severity: 'warning',
            email: ar.email,
            details: { requestId: ar._id },
            created_at: new Date().toISOString(),
          };
          await notifications.sendAlertEmail(emailAlert, ar.email);
        }
      } catch (emailErr) {
        logger.warn({ err: emailErr }, 'send_reject_email_failed');
      }
    })();
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
router.patch('/v1/users/:id/role', authGuard, requireRole('admin'), body('role').isString().isLength({ min: 1 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'validation_failed', details: errors.array() });
  }
  try {
    const { role } = req.body;
    const userId = req.params.id;
    const u = await User.findById(userId);
    if (!u) {
      return res.status(404).json({ error: 'user_not_found' });
    }
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
router.get('/v1/users/me', authGuard, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (process.env.USE_IN_MEMORY === '1' || process.env.NODE_ENV === 'test') {
      // in-memory: try to respond with minimal stub
      return res.json({ id: req.user?.sub || null, email: req.user?.email || null, role: req.role || 'user', name: null });
    }
    const User = require('../models/User');
    const id = req.user && req.user.sub ? String(req.user.sub) : null;
    let u = null;
    if (id) {
      u = await User.findById(id).select('name email role firebase_uid').lean();
    }
    if (!u && req.user && req.user.email) {
      u = await User.findOne({ email: req.user.email }).select('name email role firebase_uid').lean();
    }
    if (!u) {
      return res.status(404).json({ error: 'not_found' });
    }
    return res.json({ id: u._id || u.id, email: u.email, name: u.name, role: u.role });
  } catch (e) {
    logger.error({ err: e }, 'users_me_failed');
    return res.status(500).json({ error: 'failed' });
  }
});

/**
 * List users (admin only)
 * GET /v1/users
 */
router.get('/v1/users', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    if (USE_IN_MEMORY) {
      return res.json({ items: [], count: 0 });
    }
    const skip = (Number(page) - 1) * Number(limit);
    const users = await User.find({}).select('name email role firebase_uid createdAt').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean();
    const count = await User.countDocuments();
    return res.json({ items: users, count });
  } catch (e) {
    logger.error({ err: e }, 'users_list_failed');
    return res.status(500).json({ error: 'list_failed' });
  }
});

/**
 * Get audit history for a user (admin only)
 * GET /v1/users/:id/history
 */
router.get('/v1/users/:id/history', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id_required' });
    }
    if (USE_IN_MEMORY) {
      return res.json({ logs: [] });
    }
    const u = await User.findById(userId).lean();
    if (!u) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const AuditLog = require('../models/AuditLog');
    // Look for audit logs where details.target_user equals the user id or actor equals the user's email
    const logs = await AuditLog.find({ $or: [{ 'details.target_user': String(u._id) }, { actor: u.email }] }).sort({ timestamp: -1 }).limit(200).lean();
    return res.json({ logs });
  } catch (e) {
    logger.error({ err: e }, 'user_history_failed');
    return res.status(500).json({ error: 'history_failed' });
  }
});

module.exports = router;

/**
 * Promote user by email (admin only) - best-effort: create or update user, set role, and try to sync Firebase claims
 * POST /v1/users/promote
 * body: { email: string, role: string }
 */
router.post('/v1/users/promote', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { email, role } = req.body || {};
    if (!email || !role) {
      return res.status(400).json({ error: 'email_and_role_required' });
    }

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
      const admin = (() => {
        try {
          return require('firebase-admin');
        } catch (e) {
          return null;
        }
      })();
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
            try {
              if (claimsSyncSuccessTotal) {
                claimsSyncSuccessTotal.inc();
              }
            } catch (mErr) { /* ignore */ }
          } else {
            claimsSync = { status: 'failed', message: 'user_not_found_in_firebase' };
            try {
              if (claimsSyncFailureTotal) {
                claimsSyncFailureTotal.inc({ reason: 'user_not_found_in_firebase' });
              }
            } catch (mErr) { /* ignore */ }
            // best-effort notify about claims-sync failure for promotes
            (async () => {
              try {
                if (notifications && notifications.sendAlert) {
                  const alert = {
                    _id: u._id || u.id,
                    type: 'claims_sync_failed',
                    severity: 'critical',
                    email,
                    details: { reason: 'user_not_found_in_firebase', email, role },
                    created_at: new Date().toISOString(),
                  };
                  await notifications.sendAlert(alert);
                }
              } catch (nerr) {
                logger.warn({ err: nerr }, 'notify_promote_claims_sync_failed_failed');
              }
            })();
          }
        } catch (fbErr) {
          claimsSync = { status: 'failed', message: fbErr.message || String(fbErr) };
          try {
            if (claimsSyncFailureTotal) {
              claimsSyncFailureTotal.inc({ reason: 'firebase_set_claims_error' });
            }
          } catch (mErr) { /* ignore */ }
          (async () => {
            try {
              if (notifications && notifications.sendAlert) {
                const alert = {
                  _id: u._id || u.id,
                  type: 'claims_sync_failed',
                  severity: 'critical',
                  email,
                  details: { reason: 'firebase_set_claims_error', message: fbErr.message || String(fbErr), email, role },
                  created_at: new Date().toISOString(),
                };
                await notifications.sendAlert(alert);
              }
            } catch (nerr) {
              logger.warn({ err: nerr }, 'notify_promote_claims_sync_failed_failed');
            }
          })();
        }
      } else {
        claimsSync = { status: 'skipped', message: 'firebase_admin_missing' };
        // optional: increment a failure counter for missing firebase admin? prefer skip for now
        (async () => {
          try {
            if (notifications && notifications.sendAlert) {
              const alert = {
                _id: u._id || u.id,
                type: 'claims_sync_skipped',
                severity: 'warning',
                email,
                details: { reason: 'firebase_admin_missing', email, role },
                created_at: new Date().toISOString(),
              };
              await notifications.sendAlert(alert);
            }
          } catch (nerr) {
            logger.warn({ err: nerr }, 'notify_promote_claims_sync_skipped_failed');
          }
        })();
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

/**
 * Re-sync custom claims for a user by id
 * POST /v1/users/:id/sync-claims
 */
router.post('/v1/users/:id/sync-claims', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) {
      return res.status(400).json({ error: 'user_id_required' });
    }
    if (USE_IN_MEMORY) {
      // in-memory demo mode — can't contact Firebase
      logger.info({ userId }, 'claims_sync_skipped_in_memory');
      return res.json({ status: 'skipped', message: 'in_memory_mode' });
    }
    const u = await User.findById(userId);
    if (!u) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const fs = require('fs');
    const path = require('path');
    const admin = (() => {
      try {
        return require('firebase-admin');
      } catch (e) {
        return null;
      }
    })();
    if (!admin) {
      logger.warn({ userId, email: u.email }, 'claims_sync_skipped_missing_firebase_admin');
      // notify that claims-sync could not run due to missing firebase admin
      (async () => {
        try {
          if (notifications && notifications.sendAlert) {
            const alert = {
              _id: userId,
              type: 'claims_sync_skipped',
              severity: 'warning',
              email: u.email,
              details: { reason: 'firebase_admin_missing', userId, email: u.email },
              created_at: new Date().toISOString(),
            };
            await notifications.sendAlert(alert);
          }
        } catch (nerr) {
          logger.warn({ err: nerr }, 'notify_claims_sync_skipped_failed');
        }
      })();
      return res.json({ status: 'skipped', message: 'firebase_admin_missing' });
    }

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

    // Determine uid
    let uid = u.firebase_uid;
    try {
      if (!uid) {
        const fbUser = await admin.auth().getUserByEmail(u.email).catch(() => null);
        uid = fbUser && fbUser.uid;
      }
      if (!uid) {
        logger.info({ userId, email: u.email }, 'claims_sync_user_not_found_in_firebase');
        try {
          if (claimsSyncFailureTotal) {
            claimsSyncFailureTotal.inc({ reason: 'user_not_found_in_firebase' });
          }
        } catch (mErr) { }
        (async () => {
          try {
            if (notifications && notifications.sendAlert) {
              const alert = {
                _id: userId,
                type: 'claims_sync_failed',
                severity: 'critical',
                email: u.email,
                details: { reason: 'user_not_found_in_firebase', userId, email: u.email },
                created_at: new Date().toISOString(),
              };
              await notifications.sendAlert(alert);
            }
          } catch (nerr) {
            logger.warn({ err: nerr }, 'notify_claims_sync_failed_failed');
          }
        })();
        return res.json({ status: 'failed', message: 'user_not_found_in_firebase' });
      }

      await admin.auth().setCustomUserClaims(uid, { role: u.role });
      logger.info({ userId, uid, email: u.email, role: u.role }, 'claims_sync_success');
      await auditLogger.log({ event_type: 'USER_CLAIMS_SYNCED', actor: req.user.sub, target_user: u._id, details: { uid, email: u.email, role: u.role } });
      try {
        if (claimsSyncSuccessTotal) {
          claimsSyncSuccessTotal.inc();
        }
      } catch (mErr) { }
      return res.json({ status: 'success', message: 'custom_claims_set' });
    } catch (fbErr) {
      logger.warn({ err: fbErr, userId, email: u.email }, 'claims_sync_failed');
      try {
        if (claimsSyncFailureTotal) {
          claimsSyncFailureTotal.inc({ reason: 'firebase_set_claims_error' });
        }
      } catch (mErr) { }
      (async () => {
        try {
          if (notifications && notifications.sendAlert) {
            const alert = {
              _id: userId,
              type: 'claims_sync_failed',
              severity: 'critical',
              email: u.email,
              details: { reason: 'firebase_set_claims_error', message: fbErr.message || String(fbErr), userId, email: u.email },
              created_at: new Date().toISOString(),
            };
            await notifications.sendAlert(alert);
          }
        } catch (nerr) {
          logger.warn({ err: nerr }, 'notify_claims_sync_failed_failed');
        }
      })();
      return res.json({ status: 'failed', message: fbErr.message || String(fbErr) });
    }
  } catch (e) {
    logger.error({ err: e }, 'claims_sync_endpoint_failed');
    return res.status(500).json({ error: 'sync_failed' });
  }
});

/**
 * Re-sync custom claims for a user by email (convenience)
 * POST /v1/users/sync-claims
 * body: { email }
 */
router.post('/v1/users/sync-claims', authGuard, requireRole('admin'), async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'email_required' });
    }
    if (USE_IN_MEMORY) {
      logger.info({ email }, 'claims_sync_skipped_in_memory');
      return res.json({ status: 'skipped', message: 'in_memory_mode' });
    }
    const u = await User.findOne({ email: { $eq: email } });
    if (!u) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    // delegate to id endpoint logic by calling auth functions inline
    const fs = require('fs');
    const path = require('path');
    const admin = (() => {
      try {
        return require('firebase-admin');
      } catch (e) {
        return null;
      }
    })();
    if (!admin) {
      logger.warn({ email }, 'claims_sync_skipped_missing_firebase_admin');
      (async () => {
        try {
          if (notifications && notifications.sendAlert) {
            const alert = {
              _id: email,
              type: 'claims_sync_skipped',
              severity: 'warning',
              email,
              details: { reason: 'firebase_admin_missing', email },
              created_at: new Date().toISOString(),
            };
            await notifications.sendAlert(alert);
          }
        } catch (nerr) {
          logger.warn({ err: nerr }, 'notify_claims_sync_skipped_failed');
        }
      })();
      return res.json({ status: 'skipped', message: 'firebase_admin_missing' });
    }
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

    let uid = u.firebase_uid;
    try {
      if (!uid) {
        const fbUser = await admin.auth().getUserByEmail(email).catch(() => null);
        uid = fbUser && fbUser.uid;
      }
      if (!uid) {
        logger.info({ email }, 'claims_sync_user_not_found_in_firebase');
        try {
          if (claimsSyncFailureTotal) {
            claimsSyncFailureTotal.inc({ reason: 'user_not_found_in_firebase' });
          }
        } catch (mErr) { }
        (async () => {
          try {
            if (notifications && notifications.sendAlert) {
              const alert = {
                _id: email,
                type: 'claims_sync_failed',
                severity: 'critical',
                email,
                details: { reason: 'user_not_found_in_firebase', email },
                created_at: new Date().toISOString(),
              };
              await notifications.sendAlert(alert);
            }
          } catch (nerr) {
            logger.warn({ err: nerr }, 'notify_claims_sync_failed_failed');
          }
        })();
        return res.json({ status: 'failed', message: 'user_not_found_in_firebase' });
      }
      await admin.auth().setCustomUserClaims(uid, { role: u.role });
      logger.info({ uid, email, role: u.role }, 'claims_sync_success');
      await auditLogger.log({ event_type: 'USER_CLAIMS_SYNCED', actor: req.user.sub, target_user: u._id, details: { uid, email, role: u.role } });
      try {
        if (claimsSyncSuccessTotal) {
          claimsSyncSuccessTotal.inc();
        }
      } catch (mErr) { }
      return res.json({ status: 'success', message: 'custom_claims_set' });
    } catch (fbErr) {
      logger.warn({ err: fbErr, email }, 'claims_sync_failed');
      try {
        if (claimsSyncFailureTotal) {
          claimsSyncFailureTotal.inc({ reason: 'firebase_set_claims_error' });
        }
      } catch (mErr) { }
      (async () => {
        try {
          if (notifications && notifications.sendAlert) {
            const alert = {
              _id: email,
              type: 'claims_sync_failed',
              severity: 'critical',
              email,
              details: { reason: 'firebase_set_claims_error', message: fbErr.message || String(fbErr), email },
              created_at: new Date().toISOString(),
            };
            await notifications.sendAlert(alert);
          }
        } catch (nerr) {
          logger.warn({ err: nerr }, 'notify_claims_sync_failed_failed');
        }
      })();
      return res.json({ status: 'failed', message: fbErr.message || String(fbErr) });
    }
  } catch (e) {
    logger.error({ err: e }, 'claims_sync_by_email_failed');
    return res.status(500).json({ error: 'sync_failed' });
  }
});
