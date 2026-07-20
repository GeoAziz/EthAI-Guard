const logger = require('../logger');
const { withTenant } = require('../db/postgres');

/**
 * Audit middleware for payment-related events
 * Logs all payment actions with full context for compliance
 */
function paymentAuditLog(eventType) {
  return async (req, res, next) => {
    const originalSend = res.send;
    let responseData = null;

    // Intercept response to log result
    res.send = function (data) {
      responseData = data;
      return originalSend.call(this, data);
    };

    // Call next to execute route handler
    next();

    // After route execution, log the payment event
    res.on('finish', async () => {
      try {
        const auditEntry = {
          event_type: eventType,
          user_id: req.user?._id || req.user?.sub || null,
          tenant_id: req.tenantId || req.user?.tenantId,
          user_email: req.user?.email,
          user_role: req.user?.role,
          status_code: res.statusCode,
          success: res.statusCode < 400,
          request_body: sanitizePaymentData(req.body),
          response_status: res.statusCode,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          timestamp: new Date().toISOString(),
          request_id: req.id, // from tracing middleware
        };

        // Log to application logs
        logger.info(auditEntry, `payment_audit:${eventType}`);

        // Store in database if tenant available
        if (auditEntry.tenant_id) {
          await logPaymentEventToDatabase(auditEntry).catch((err) => {
            logger.warn({ err, event: eventType }, 'payment_audit_db_failed');
          });
        }
      } catch (error) {
        logger.error({ err: error }, 'payment_audit_log_error');
      }
    });
  };
}

/**
 * Sanitize payment data before logging (remove sensitive PII)
 */
function sanitizePaymentData(body) {
  if (!body) return null;

  const sanitized = { ...body };

  // Remove sensitive fields
  delete sanitized.paymentMethodId;
  delete sanitized.stripeToken;
  delete sanitized.cardNumber;
  delete sanitized.cvv;
  delete sanitized.expiryDate;
  delete sanitized.password;
  delete sanitized.secret;

  // Log sanitized versions
  if (sanitized.plan) sanitized.plan = sanitized.plan; // keep plan
  if (sanitized.seats) sanitized.seats = sanitized.seats; // keep seat count

  return sanitized;
}

/**
 * Store payment event in database for audit trail
 */
async function logPaymentEventToDatabase(auditEntry) {
  const { tenant_id, event_type, user_email, status_code, success, timestamp } = auditEntry;

  if (!tenant_id) return; // Skip if no tenant

  return withTenant(tenant_id, async (client) => {
    await client.query(
      `INSERT INTO audit_logs (
        tenant_id, event_type, user_email, status_code, success,
        event_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        tenant_id,
        event_type,
        user_email,
        status_code,
        success,
        JSON.stringify(auditEntry),
        new Date(timestamp),
      ]
    );
  });
}

/**
 * Specific audit event: Subscription created/updated
 */
async function logSubscriptionEvent(tenantId, userId, action, subscriptionData, success = true) {
  const auditEntry = {
    event_type: `subscription_${action}`,
    user_id: userId,
    tenant_id: tenantId,
    status_code: success ? 200 : 400,
    success,
    data: {
      plan: subscriptionData.plan,
      seats: subscriptionData.seats,
      stripeId: subscriptionData.stripe_subscription_id,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(auditEntry, `subscription_event:${action}`);
  return logPaymentEventToDatabase(auditEntry).catch((err) => {
    logger.warn({ err }, 'subscription_audit_failed');
  });
}

/**
 * Specific audit event: Invoice generated
 */
async function logInvoiceEvent(tenantId, userId, invoiceData, success = true) {
  const auditEntry = {
    event_type: 'invoice_generated',
    user_id: userId,
    tenant_id: tenantId,
    status_code: success ? 200 : 400,
    success,
    data: {
      amount_cents: invoiceData.amount_cents,
      currency: invoiceData.currency || 'usd',
      stripeId: invoiceData.stripe_invoice_id,
      period_start: invoiceData.period_start,
      period_end: invoiceData.period_end,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(auditEntry, 'invoice_event');
  return logPaymentEventToDatabase(auditEntry).catch((err) => {
    logger.warn({ err }, 'invoice_audit_failed');
  });
}

/**
 * Specific audit event: Payment processed (webhook)
 */
async function logPaymentProcessedEvent(tenantId, stripeEventType, stripeEventId, success = true) {
  const auditEntry = {
    event_type: 'payment_webhook',
    tenant_id: tenantId,
    status_code: success ? 200 : 400,
    success,
    data: {
      stripeEventType,
      stripeEventId,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(auditEntry, `stripe_webhook:${stripeEventType}`);
  return logPaymentEventToDatabase(auditEntry).catch((err) => {
    logger.warn({ err }, 'payment_webhook_audit_failed');
  });
}

/**
 * Specific audit event: Usage recorded (for metered billing)
 */
async function logUsageEvent(tenantId, userId, metric, quantity) {
  const auditEntry = {
    event_type: 'usage_recorded',
    user_id: userId,
    tenant_id: tenantId,
    status_code: 200,
    success: true,
    data: {
      metric,
      quantity,
    },
    timestamp: new Date().toISOString(),
  };

  logger.info(auditEntry, 'usage_event');
  return logPaymentEventToDatabase(auditEntry).catch((err) => {
    logger.warn({ err }, 'usage_audit_failed');
  });
}

module.exports = {
  paymentAuditLog,
  logSubscriptionEvent,
  logInvoiceEvent,
  logPaymentProcessedEvent,
  logUsageEvent,
};
