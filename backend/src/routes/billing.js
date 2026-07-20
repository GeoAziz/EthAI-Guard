const express = require('express');
const router = express.Router();
const { authGuard, requireRole } = require('../middleware/authGuard');
const { verifyTenantIsolation, auditLog } = require('../middleware/tenantGuard');
const stripeService = require('../services/stripeService');
const billingService = require('../services/billingService');
const logger = require('../logger');

router.get('/api/billing/account', authGuard, verifyTenantIsolation, auditLog('get_account', 'billing'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const account = await billingService.getOrCreateBillingAccount(req.tenantId, req.user && req.user.email);
    return res.json({ account });
  } catch (e) {
    logger.error({ err: e }, 'billing_account_failed');
    return res.status(500).json({ error: 'billing_account_failed' });
  }
});

router.post('/api/billing/subscribe', authGuard, requireRole('admin'), verifyTenantIsolation, auditLog('subscribe', 'plan'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const { plan, seats } = req.body || {};
    if (!plan || !(plan in stripeService.PLAN_PRICING)) {
      return res.status(400).json({ error: 'invalid_plan' });
    }
    const subscription = await stripeService.createSubscription(req.tenantId, plan, Number(seats) || 1);
    return res.json({ subscription });
  } catch (e) {
    logger.error({ err: e }, 'billing_subscribe_failed');
    return res.status(500).json({ error: 'billing_subscribe_failed' });
  }
});

router.get('/api/billing/subscription', authGuard, verifyTenantIsolation, auditLog('get_subscription', 'billing'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const subscription = await stripeService.getActiveSubscription(req.tenantId);
    return res.json({ subscription });
  } catch (e) {
    logger.error({ err: e }, 'billing_subscription_get_failed');
    return res.status(500).json({ error: 'billing_subscription_get_failed' });
  }
});

router.get('/api/billing/invoices', authGuard, verifyTenantIsolation, auditLog('get_invoices', 'billing'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const invoices = await billingService.listInvoices(req.tenantId);
    return res.json({ invoices });
  } catch (e) {
    logger.error({ err: e }, 'billing_invoices_failed');
    return res.status(500).json({ error: 'billing_invoices_failed' });
  }
});

router.post('/api/billing/invoices/generate', authGuard, requireRole('admin'), verifyTenantIsolation, auditLog('generate_invoice', 'billing'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const invoice = await billingService.generateInvoice(req.tenantId);
    return res.json({ invoice });
  } catch (e) {
    logger.error({ err: e }, 'billing_invoice_generate_failed');
    const status = e.message === 'no_active_subscription' ? 400 : 500;
    return res.status(status).json({ error: e.message === 'no_active_subscription' ? 'no_active_subscription' : 'billing_invoice_generate_failed' });
  }
});

router.post('/api/billing/usage', authGuard, verifyTenantIsolation, auditLog('record_usage', 'billing'), async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'no_tenant' });
    }
    const { metric, quantity } = req.body || {};
    if (!metric) {
      return res.status(400).json({ error: 'metric_required' });
    }
    const record = await stripeService.recordUsage(req.tenantId, metric, Number(quantity) || 1);
    return res.json({ record });
  } catch (e) {
    logger.error({ err: e }, 'billing_usage_failed');
    return res.status(500).json({ error: 'billing_usage_failed' });
  }
});

module.exports = router;
