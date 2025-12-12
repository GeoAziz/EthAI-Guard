// RBAC middleware for Express backend
const { withRequest } = require('../logger');

/**
 * Require specific roles for route access.
 *
 * Usage:
 *   app.get('/admin/users', authMiddleware, requireRole('admin'), handler);
 *   app.get('/reports', authMiddleware, requireRole('admin', 'analyst', 'auditor'), handler);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.role)) {
      const log = withRequest(req);
      log.warn({
        user_id: req.userId || req.user?.sub,
        required_roles: allowedRoles,
        actual_role: req.role,
        endpoint: req.path,
        method: req.method,
        action: 'authz_denied',
      }, 'authorization_failed');

      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        actual: req.role,
      });
    }

    next();
  };
}

/**
 * Require specific permissions (granular).
 *
 * Usage:
 *   app.delete('/datasets/:id', authMiddleware, requirePermission('datasets:delete'), handler);
 */
function requirePermission(...permissions) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userPerms = req.user.permissions || [];
    const hasPermission = permissions.some(p => userPerms.includes(p));

    if (!hasPermission) {
      const log = withRequest(req);
      log.warn({
        user_id: req.userId || req.user?.sub,
        required_permissions: permissions,
        user_permissions: userPerms,
        endpoint: req.path,
        method: req.method,
        action: 'authz_denied',
      }, 'permission_denied');

      return res.status(403).json({
        error: 'Insufficient permissions',
        required: permissions,
      });
    }

    next();
  };
}

/**
 * Require user to be owner of resource or have specific role.
 *
 * Usage:
 *   app.delete('/reports/:id', authMiddleware, requireOwnerOrRole('userId', 'admin'), handler);
 */
function requireOwnerOrRole(ownerField, ...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user has allowed role
    if (allowedRoles.includes(req.role)) {
      return next();
    }

    // Check ownership (resource must be loaded in handler or prior middleware)
    const { resource } = req;  // Populated by prior middleware
    if (resource && String(resource[ownerField]) === String(req.userId)) {
      return next();
    }

    const log = withRequest(req);
    log.warn({
      user_id: req.userId,
      role: req.role,
      action: 'ownership_check_failed',
    }, 'not_owner_and_insufficient_role');

    return res.status(403).json({ error: 'Not authorized' });
  };
}

module.exports = {
  requireRole,
  requirePermission,
  requireOwnerOrRole,
};
