const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authGuard } = require('../middleware/authGuard');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const billingService = require('../services/billingService');
const logger = require('../logger');

function slugify(name) {
  const base = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return base || uuidv4().slice(0, 8);
}

router.post('/api/tenants', authGuard, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'name_required' });
    }

    const tenantId = uuidv4();
    let slug = slugify(name);
    if (await Tenant.findOne({ slug })) {
      slug = `${slug}-${tenantId.slice(0, 6)}`;
    }

    const tenant = await Tenant.create({ tenantId, name, slug, status: 'trial', plan: 'free' });

    const userId = req.user && (req.user.sub || req.user.uid);
    if (userId) {
      const updated = await User.findByIdAndUpdate(userId, { tenantId }).catch(() => null);
      if (!updated) {
        await User.findOneAndUpdate({ firebase_uid: userId }, { tenantId }).catch(() => {});
      }
    }

    try {
      await billingService.getOrCreateBillingAccount(tenantId, req.user && req.user.email);
    } catch (e) {
      logger.warn({ err: e }, 'billing_account_bootstrap_failed');
    }

    return res.status(201).json({ tenant });
  } catch (e) {
    logger.error({ err: e }, 'tenant_create_failed');
    return res.status(500).json({ error: 'tenant_create_failed' });
  }
});

router.get('/api/tenants/me', authGuard, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(404).json({ error: 'no_tenant' });
    }
    const tenant = await Tenant.findOne({ tenantId: req.tenantId });
    if (!tenant) {
      return res.status(404).json({ error: 'tenant_not_found' });
    }
    return res.json({ tenant });
  } catch (e) {
    logger.error({ err: e }, 'tenant_get_failed');
    return res.status(500).json({ error: 'tenant_get_failed' });
  }
});

module.exports = router;
