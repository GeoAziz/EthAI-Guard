/**
 * Tenant Verification Middleware
 *
 * Enforces multi-tenant isolation by verifying that:
 * 1. User is authenticated (has valid JWT)
 * 2. User's tenant_id matches the requested resource's tenant_id
 * 3. User has appropriate role for the operation
 *
 * Usage: Place after auth middleware in all protected routes
 */

const logger = require('../logger');

/**
 * Verify tenant isolation on the request
 * Middleware function that checks if user is trying to access another tenant's data
 */
function verifyTenantIsolation(req, res, next) {
  try {
    // User must be authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    // User must have tenant_id
    if (!req.user.tenantId) {
      logger.warn(
        { userId: req.user.userId },
        'user_missing_tenant_id'
      );
      return res.status(403).json({ error: 'no_tenant_assigned' });
    }

    // Get requested tenant_id from various sources
    const requestedTenantId =
      req.params.tenantId ||
      req.query.tenantId ||
      req.body?.tenantId;

    // If specific tenant requested, verify user belongs to it
    if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
      logger.warn(
        {
          userId: req.user.userId,
          userTenantId: req.user.tenantId,
          requestedTenantId,
          path: req.path,
          method: req.method,
          ip: req.ip,
        },
        'cross_tenant_access_attempt'
      );
      return res.status(403).json({ error: 'forbidden_cross_tenant_access' });
    }

    // Set tenant context for database operations
    req.tenantId = req.user.tenantId;

    next();
  } catch (error) {
    logger.error({ err: error }, 'tenant_guard_error');
    res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * Verify tenant for resource operations
 * Check if user can access specific resource by tenant_id
 *
 * Usage: tenantGuard.verifyResourceTenant('tenantId') - expects param in URL
 */
function verifyResourceTenant(paramName = 'tenantId') {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.tenantId) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const resourceTenantId = req.params[paramName];

      if (!resourceTenantId) {
        logger.warn({ path: req.path }, `missing_${paramName}_parameter`);
        return res.status(400).json({ error: `missing_${paramName}` });
      }

      if (resourceTenantId !== req.user.tenantId) {
        logger.warn(
          {
            userId: req.user.userId,
            userTenantId: req.user.tenantId,
            resourceTenantId,
            resource: req.params,
          },
          'unauthorized_resource_access'
        );
        return res.status(403).json({ error: 'forbidden' });
      }

      req.tenantId = req.user.tenantId;
      next();
    } catch (error) {
      logger.error({ err: error }, 'resource_tenant_check_error');
      res.status(500).json({ error: 'internal_error' });
    }
  };
}

/**
 * Verify role-based access control
 * Check if user has required role(s) for the operation
 *
 * Usage: tenantGuard.requireRole('admin', 'reviewer')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'unauthorized' });
      }

      const userRole = req.user.role || 'user';

      if (!allowedRoles.includes(userRole)) {
        logger.warn(
          {
            userId: req.user.userId,
            userRole,
            requiredRoles: allowedRoles,
            path: req.path,
            method: req.method,
          },
          'insufficient_role_permission'
        );
        return res.status(403).json({ error: 'insufficient_permissions' });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'role_check_error');
      res.status(500).json({ error: 'internal_error' });
    }
  };
}

/**
 * Require admin role (convenience wrapper)
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Audit log for sensitive operations
 * Records who did what to which tenant
 */
function auditLog(operation, resourceType) {
  return (req, res, next) => {
    try {
      const originalJson = res.json;
      res.json = function(data) {
        // Log after response is determined
        if (req.user && req.tenantId) {
          logger.info(
            {
              operation,
              resourceType,
              userId: req.user.userId,
              tenantId: req.tenantId,
              path: req.path,
              method: req.method,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
            },
            'tenant_audit'
          );
        }
        return originalJson.call(this, data);
      };
      next();
    } catch (error) {
      logger.error({ err: error }, 'audit_log_error');
      next();
    }
  };
}

module.exports = {
  verifyTenantIsolation,
  verifyResourceTenant,
  requireRole,
  requireAdmin,
  auditLog,
};
