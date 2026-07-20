const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const logger = require('../logger');

/**
 * Stripe webhook endpoint - handles payment events
 * Webhook URL: POST https://your-domain.com/api/webhooks/stripe
 *
 * Setup in Stripe Dashboard:
 * 1. Go to Developers > Webhooks
 * 2. Add endpoint: https://your-domain.com/api/webhooks/stripe
 * 3. Select events: payment_intent.succeeded, payment_intent.payment_failed, etc.
 * 4. Copy signing secret to STRIPE_WEBHOOK_SECRET env var
 */
router.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    logger.warn('stripe_webhook_missing_signature');
    return res.status(400).json({ error: 'missing_signature' });
  }

  try {
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    logger.info({ eventType: event.type, eventId: event.id }, 'stripe_webhook_received');

    // Handle the event
    await stripeService.handleWebhookEvent(event);

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    logger.error({ err: error, signature }, 'stripe_webhook_verification_failed');
    res.status(400).json({ error: error.message });
  }
});

/**
 * Test webhook connectivity (for setup verification)
 * POST /api/webhooks/stripe/test
 */
router.post('/api/webhooks/stripe/test', async (req, res) => {
  try {
    logger.info('stripe_webhook_test_received');
    res.json({ status: 'ok', message: 'Webhook endpoint is reachable' });
  } catch (error) {
    logger.error({ err: error }, 'stripe_webhook_test_failed');
    res.status(500).json({ error: 'test_failed' });
  }
});

module.exports = router;
