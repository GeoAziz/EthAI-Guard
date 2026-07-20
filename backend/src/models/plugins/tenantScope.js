const { getTenantId } = require('../../utils/tenantContext');

/**
 * Mongoose plugin that transparently scopes every query and write on the
 * schema to the tenant bound to the current AsyncLocalStorage context
 * (set by middleware/authGuard.js). This gives tenant isolation even when a
 * route forgets to add a tenantId filter itself.
 */
function tenantScopePlugin(schema) {
  if (!schema.path('tenantId')) {
    schema.add({ tenantId: { type: String, index: true } });
  }

  function applyScope() {
    const tenantId = getTenantId();
    if (tenantId && !this.getFilter().tenantId) {
      this.where({ tenantId });
    }
  }

  schema.pre(/^find/, function (next) {
    applyScope.call(this);
    next();
  });

  schema.pre('countDocuments', function (next) {
    applyScope.call(this);
    next();
  });

  schema.pre('count', function (next) {
    applyScope.call(this);
    next();
  });

  schema.pre('aggregate', function (next) {
    const tenantId = getTenantId();
    if (tenantId) {
      this.pipeline().unshift({ $match: { tenantId } });
    }
    next();
  });

  schema.pre('save', function (next) {
    if (this.isNew && !this.tenantId) {
      const tenantId = getTenantId();
      if (tenantId) {
        this.tenantId = tenantId;
      }
    }
    next();
  });
}

module.exports = tenantScopePlugin;
