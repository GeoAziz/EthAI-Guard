const Stripe = require('stripe');
const logger = require('../logger');
const { withTenant } = require('../db/postgres');

// Initialize Stripe - fail fast if secret key not configured in production
const _stripeKey = process.env.STRIPE_SECRET_KEY;
const IS_PROD = process.env.NODE_ENV === 'production';
if (!_stripeKey && IS_PROD) {
  throw new Error('STRIPE_SECRET_KEY is required in production');
}
const stripe = new Stripe(
  _stripeKey || 'sk_test_placeholder_NOT_A_REAL_KEY',
  { apiVersion: '2024-04-10' }
);

const _stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!_stripeWebhookSecret && IS_PROD) {
  throw new Error('STRIPE_WEBHOOK_SECRET is required in production');
}

const PLAN_PRICING = {
  free: { name: 'Free', price_cents: 0, seats: 1 },
  starter: { name: 'Starter', price_cents: 49900, seats: 2 },
  pro: { name: 'Professional', price_cents: 299900, seats: 10 },
  enterprise: { name: 'Enterprise', price_cents: 0, seats: null }, // Custom pricing
};

/**
 * Create or retrieve Stripe customer for a tenant
 */
async function getOrCreateStripeCustomer(tenantId, email, companyName) {
  return withTenant(tenantId, async (client) => {
    // Check if we already have a Stripe customer ID
    const existing = await client.query(
      'SELECT stripe_customer_id FROM stripe_customers WHERE tenant_id = $1',
      [tenantId]
    );

    if (existing.rows[0]?.stripe_customer_id) {
      return existing.rows[0].stripe_customer_id;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      description: companyName || `Tenant: ${tenantId}`,
      metadata: { tenantId },
    });

    // Store mapping in our database
    await client.query(
      `INSERT INTO stripe_customers (tenant_id, stripe_customer_id, email, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET stripe_customer_id = $2`,
      [tenantId, customer.id, email, JSON.stringify({ companyName })]
    );

    logger.info({ tenantId, stripeCustomerId: customer.id }, 'stripe_customer_created');
    return customer.id;
  });
}

/**
 * Create a subscription in Stripe
 */
async function createSubscription(tenantId, planKey, seats = 1) {
  const plan = PLAN_PRICING[planKey];
  if (!plan) {
    throw new Error(`Unknown plan: ${planKey}`);
  }

  return withTenant(tenantId, async (client) => {
    // Get or create Stripe customer
    const email = await client.query(
      'SELECT billing_email FROM billing_accounts WHERE tenant_id = $1',
      [tenantId]
    );
    const stripeCustomerId = await getOrCreateStripeCustomer(
      tenantId,
      email.rows[0]?.billing_email || 'billing@company.com',
      null
    );

    // Create subscription if plan has a price
    let subscription = null;
    if (plan.price_cents > 0) {
      subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: { name: plan.name },
              unit_amount: plan.price_cents,
              recurring: { interval: 'month' },
            },
            quantity: seats,
          },
        ],
        metadata: { tenantId, planKey, seats },
      });
    }

    // Store subscription in our database
    const result = await client.query(
      `INSERT INTO subscriptions (tenant_id, stripe_subscription_id, plan, seats, status, current_period_start, current_period_end)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW() + INTERVAL '1 month')
       RETURNING *`,
      [tenantId, subscription?.id || null, planKey, seats]
    );

    // Update billing account
    await client.query(
      'UPDATE billing_accounts SET plan = $2, updated_at = NOW() WHERE tenant_id = $1',
      [tenantId, planKey]
    );

    logger.info({ tenantId, planKey, subscriptionId: subscription?.id }, 'subscription_created');
    return result.rows[0];
  });
}

/**
 * Handle Stripe webhook event
 */
async function handleWebhookEvent(event) {
  const { type, data } = event;

  try {
    switch (type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailure(data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(data.object);
        break;

      default:
        logger.debug({ eventType: type }, 'unhandled_webhook_event');
    }
  } catch (error) {
    logger.error({ err: error, eventType: type }, 'webhook_handler_error');
    throw error;
  }
}

/**
 * Verify Stripe webhook signature
 */
function verifyWebhookSignature(body, signature) {
  if (!_stripeWebhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  try {
    return stripe.webhooks.constructEvent(body, signature, _stripeWebhookSecret);
  } catch (error) {
    logger.error({ err: error }, 'webhook_signature_verification_failed');
    throw new Error('Invalid signature');
  }
}

/**
 * Get active subscription for tenant
 */
async function getActiveSubscription(tenantId) {
  return withTenant(tenantId, async (client) => {
    const result = await client.query(
      "SELECT * FROM subscriptions WHERE tenant_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [tenantId]
    );
    return result.rows[0] || null;
  });
}

/**
 * Record usage for overage billing
 */
async function recordUsage(tenantId, metric, quantity = 1) {
  return withTenant(tenantId, async (client) => {
    const result = await client.query(
      'INSERT INTO usage_records (tenant_id, metric, quantity, recorded_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [tenantId, metric, quantity]
    );
    return result.rows[0];
  });
}

/**
 * Generate invoice with usage overages
 */
async function generateInvoice(tenantId) {
  return withTenant(tenantId, async (client) => {
    const subscription = await getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('no_active_subscription');
    }

    // Calculate usage and overage
    const usage = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM usage_records
       WHERE tenant_id = $1 AND recorded_at >= $2 AND recorded_at < $3`,
      [tenantId, subscription.current_period_start, subscription.current_period_end]
    );

    const totalUsage = Number(usage.rows[0].total);
    const includedUnits = 1000;
    const overageUnits = Math.max(0, totalUsage - includedUnits);
    const overageCentsPer1000 = 500; // $5 per 1000 units
    const overageCents = Math.round((overageUnits / 1000) * overageCentsPer1000);

    const basePriceCents = subscription.stripe_subscription_id ?
      (PLAN_PRICING[subscription.plan]?.price_cents || 0) * subscription.seats : 0;
    const totalCents = basePriceCents + overageCents;

    // Create invoice record
    const invoice = await client.query(
      `INSERT INTO invoices (tenant_id, subscription_id, amount_cents, overage_cents, usage_total, status, issued_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [tenantId, subscription.id, totalCents, overageCents, totalUsage]
    );

    logger.info({ tenantId, invoiceId: invoice.rows[0].id, amountCents: totalCents }, 'invoice_generated');
    return invoice.rows[0];
  });
}

/**
 * Cancel subscription
 */
async function cancelSubscription(tenantId) {
  return withTenant(tenantId, async (client) => {
    const subscription = await getActiveSubscription(tenantId);
    if (!subscription || !subscription.stripe_subscription_id) {
      throw new Error('no_active_subscription');
    }

    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    await client.query(
      "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW() WHERE id = $1",
      [subscription.id]
    );

    await client.query(
      "UPDATE billing_accounts SET plan = 'free', updated_at = NOW() WHERE tenant_id = $1",
      [tenantId]
    );

    logger.info({ tenantId }, 'subscription_cancelled');
    return { status: 'cancelled' };
  });
}

/**
 * Update subscription (change plan or seats)
 */
async function updateSubscription(tenantId, planKey, seats = 1) {
  const plan = PLAN_PRICING[planKey];
  if (!plan) {
    throw new Error(`Unknown plan: ${planKey}`);
  }

  return withTenant(tenantId, async (client) => {
    const subscription = await getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('no_active_subscription');
    }

    if (subscription.stripe_subscription_id) {
      // Update in Stripe
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [
          {
            id: subscription.stripe_item_id,
            quantity: seats,
          },
        ],
        metadata: { planKey, seats },
      });
    }

    // Update in database
    const result = await client.query(
      'UPDATE subscriptions SET plan = $2, seats = $3, updated_at = NOW() WHERE id = $1 RETURNING *',
      [subscription.id, planKey, seats]
    );

    await client.query(
      'UPDATE billing_accounts SET plan = $2, updated_at = NOW() WHERE tenant_id = $1',
      [tenantId, planKey]
    );

    logger.info({ tenantId, planKey, seats }, 'subscription_updated');
    return result.rows[0];
  });
}

// ============ PRIVATE WEBHOOK HANDLERS ============

async function handlePaymentSuccess(paymentIntent) {
  const { metadata } = paymentIntent;
  if (metadata?.tenantId) {
    logger.info({ tenantId: metadata.tenantId, paymentIntentId: paymentIntent.id }, 'payment_succeeded');
    // Additional logic: send confirmation email, activate features, etc.
  }
}

async function handlePaymentFailure(paymentIntent) {
  const { metadata, client_secret } = paymentIntent;
  if (metadata?.tenantId) {
    logger.warn({ tenantId: metadata.tenantId, paymentIntentId: paymentIntent.id }, 'payment_failed');
    // Additional logic: send retry email, downgrade service, etc.
  }
}

async function handleInvoicePaymentSucceeded(invoice) {
  const { customer, metadata } = invoice;
  logger.info({ customerId: customer, invoiceId: invoice.id }, 'invoice_payment_succeeded');
}

async function handleInvoicePaymentFailed(invoice) {
  const { customer } = invoice;
  logger.warn({ customerId: customer, invoiceId: invoice.id }, 'invoice_payment_failed');
  // Send retry email, request payment update, etc.
}

async function handleSubscriptionUpdated(subscription) {
  const { id, metadata } = subscription;
  logger.info({ subscriptionId: id }, 'subscription_updated');
}

async function handleSubscriptionCancelled(subscription) {
  const { id, metadata } = subscription;
  logger.info({ subscriptionId: id }, 'subscription_cancelled');
  // Disable features, notify admins, etc.
}

module.exports = {
  stripe,
  PLAN_PRICING,
  getOrCreateStripeCustomer,
  createSubscription,
  handleWebhookEvent,
  verifyWebhookSignature,
  getActiveSubscription,
  recordUsage,
  generateInvoice,
  cancelSubscription,
  updateSubscription,
};
