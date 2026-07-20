const AuditCallback = require('../models/AuditCallback');
const logger = require('../utils/logger');
const axios = require('axios');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const { v4: uuidv4 } = require('uuid');

function isPrivateOrLoopbackIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) {
    const octets = ip.split('.').map(Number);
    return (
      octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 169 && octets[1] === 254) ||
      octets[0] === 0
    );
  }
  if (version === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe80')
    );
  }
  return true; // Not a valid IP at all — reject rather than risk it.
}

async function assertSafeWebhookUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Invalid webhook URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Webhook URL must use https');
  }

  let addresses;
  try {
    addresses = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw new Error('Unable to resolve webhook host');
  }

  if (addresses.length === 0 || addresses.some(a => isPrivateOrLoopbackIp(a.address))) {
    throw new Error('Webhook URL resolves to a disallowed (private/internal) address');
  }
}

class AuditCallbackService {
  static async registerCallback(callbackData) {
    try {
      await assertSafeWebhookUrl(callbackData.url);

      const callback = new AuditCallback({
        callbackId: callbackData.callbackId || `cb-${Date.now()}-${uuidv4().slice(0, 8)}`,
        name: callbackData.name,
        url: callbackData.url,
        description: callbackData.description,
        auth: callbackData.auth || { type: 'none' },
        headers: callbackData.headers || {},
        eventFilters: callbackData.eventFilters || {
          eventTypes: [],
          entityTypes: [],
          statuses: [],
          tags: [],
        },
        delivery: callbackData.delivery || {
          maxRetries: 3,
          retryDelaySeconds: 300,
          timeoutSeconds: 30,
        },
        tenantId: callbackData.tenantId,
        createdBy: callbackData.createdBy,
        tags: callbackData.tags || [],
      });

      await callback.save();

      logger.info({
        msg: 'audit_callback_registered',
        callbackId: callback.callbackId,
        url: callback.url,
      });

      return callback;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_register_audit_callback' });
      throw err;
    }
  }

  static async dispatchEvent(event) {
    try {
      const callbacks = await AuditCallback.getApplicable(event);

      if (callbacks.length === 0) {
        logger.debug({ msg: 'no_applicable_callbacks', eventType: event.eventType });
        return [];
      }

      const deliveries = [];
      for (const callback of callbacks) {
        if (callback.status !== 'active') {
          continue;
        }

        const deliveryId = `del-${uuidv4().slice(0, 8)}`;
        const delivery = {
          deliveryId,
          eventId: event.eventId || uuidv4(),
          eventType: event.eventType,
          entityType: event.entityType,
          entityId: event.entityId,
          timestamp: new Date(),
          status: 'pending',
          attempts: 0,
        };

        callback.deliveryHistory.push(delivery);
        await callback.save();

        // Queue for async delivery
        this._queueDelivery(callback, event, deliveryId);

        deliveries.push(deliveryId);
      }

      return deliveries;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_dispatch_audit_callbacks' });
      throw err;
    }
  }

  static async deliverCallback(callbackId, deliveryId) {
    try {
      const callback = await AuditCallback.findOne({ callbackId });
      if (!callback) {
        throw new Error('Callback not found');
      }

      const delivery = callback.deliveryHistory.find(d => d.deliveryId === deliveryId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

      if (delivery.status !== 'pending' && delivery.attempts >= callback.delivery.maxRetries) {
        logger.warn({
          msg: 'delivery_max_retries_exceeded',
          callbackId,
          deliveryId,
        });
        return;
      }

      const payload = {
        deliveryId,
        eventId: delivery.eventId,
        eventType: delivery.eventType,
        entityType: delivery.entityType,
        entityId: delivery.entityId,
        timestamp: delivery.timestamp,
        testMode: callback.testMode,
      };

      const headers = this._buildHeaders(callback, payload);

      try {
        await assertSafeWebhookUrl(callback.url);

        const startTime = Date.now();

        const response = await axios.post(callback.url, payload, {
          headers,
          timeout: (callback.delivery.timeoutSeconds || 30) * 1000,
          validateStatus: () => true, // Accept any status
          maxRedirects: 0,
        });

        const responseTimeMs = Date.now() - startTime;

        delivery.attempts = (delivery.attempts || 0) + 1;
        delivery.lastAttemptTime = new Date();
        delivery.statusCode = response.status;
        delivery.response = {
          status: response.status,
          headers: response.headers,
          data: response.data,
        };

        if (response.status >= 200 && response.status < 300) {
          delivery.status = 'delivered';

          callback.metrics.successfulDeliveries = (callback.metrics.successfulDeliveries || 0) + 1;
          callback.metrics.lastDeliveryTime = new Date();
          callback.metrics.averageResponseTimeMs = this._updateAverage(
            callback.metrics.averageResponseTimeMs || 0,
            responseTimeMs,
            callback.metrics.successfulDeliveries,
          );
          callback.errorCount = 0;

          logger.info({
            msg: 'audit_callback_delivered',
            callbackId,
            deliveryId,
            statusCode: response.status,
          });
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        delivery.attempts = (delivery.attempts || 0) + 1;
        delivery.lastAttemptTime = new Date();
        delivery.error = err.message;
        delivery.status = 'failed';

        callback.metrics.failedDeliveries = (callback.metrics.failedDeliveries || 0) + 1;
        callback.errorCount = (callback.errorCount || 0) + 1;
        callback.lastErrorMessage = err.message;
        callback.lastErrorTime = new Date();

        // Schedule retry if applicable
        if (delivery.attempts < callback.delivery.maxRetries) {
          delivery.status = 'pending';
          delivery.nextRetryTime = new Date(
            Date.now() + (callback.delivery.retryDelaySeconds || 300) * 1000 * delivery.attempts,
          );
        }

        logger.warn({
          msg: 'audit_callback_delivery_failed',
          callbackId,
          deliveryId,
          attempt: delivery.attempts,
          error: err.message,
        });

        // Disable callback after too many failures
        if (callback.errorCount > 10) {
          callback.status = 'error';
          callback.disabledReason = 'Too many consecutive failures';
          callback.disabledAt = new Date();

          logger.error({
            msg: 'audit_callback_disabled',
            callbackId,
            reason: 'Too many consecutive failures',
          });
        }
      }

      callback.metrics.totalDeliveryAttempts = (callback.metrics.totalDeliveryAttempts || 0) + 1;
      await callback.save();

      return delivery;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_deliver_audit_callback', callbackId });
      throw err;
    }
  }

  static async retryPendingDeliveries() {
    try {
      const callbacks = await AuditCallback.getPendingDeliveries();

      let retryCount = 0;
      for (const callback of callbacks) {
        const pendingDeliveries = callback.deliveryHistory.filter(
          d => d.status === 'pending' && d.nextRetryTime && d.nextRetryTime <= new Date(),
        );

        for (const delivery of pendingDeliveries) {
          await this.deliverCallback(callback.callbackId, delivery.deliveryId);
          retryCount++;
        }
      }

      if (retryCount > 0) {
        logger.info({ msg: 'audit_callback_retries_processed', count: retryCount });
      }

      return retryCount;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_retry_pending_deliveries' });
      throw err;
    }
  }

  static async testCallback(callbackId, testPayload) {
    try {
      const callback = await AuditCallback.findOne({ callbackId });
      if (!callback) {
        throw new Error('Callback not found');
      }

      const payload = testPayload || {
        deliveryId: `test-${uuidv4().slice(0, 8)}`,
        eventId: `test-event-${uuidv4().slice(0, 8)}`,
        eventType: 'test_event',
        entityType: 'test',
        entityId: 'test-entity',
        timestamp: new Date(),
        testMode: true,
      };

      await assertSafeWebhookUrl(callback.url);

      const headers = this._buildHeaders(callback, payload);

      const response = await axios.post(callback.url, payload, {
        headers,
        timeout: 10000,
        maxRedirects: 0,
      });

      callback.testMode = false;
      callback.lastTestTime = new Date();
      callback.testResponse = {
        status: response.status,
        headers: response.headers,
        data: response.data,
      };

      await callback.save();

      logger.info({
        msg: 'audit_callback_test_successful',
        callbackId,
        statusCode: response.status,
      });

      return {
        success: true,
        statusCode: response.status,
        response: response.data,
      };
    } catch (err) {
      logger.warn({
        msg: 'audit_callback_test_failed',
        callbackId,
        error: err.message,
      });

      throw {
        success: false,
        error: err.message,
      };
    }
  }

  static async updateCallback(callbackId, updateData) {
    try {
      if (updateData.url) {
        await assertSafeWebhookUrl(updateData.url);
      }

      const callback = await AuditCallback.findOneAndUpdate(
        { callbackId },
        updateData,
        { new: true },
      );

      if (!callback) {
        throw new Error('Callback not found');
      }

      logger.info({
        msg: 'audit_callback_updated',
        callbackId,
      });

      return callback;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_update_audit_callback' });
      throw err;
    }
  }

  static async disableCallback(callbackId, reason) {
    try {
      const callback = await AuditCallback.findOneAndUpdate(
        { callbackId },
        {
          status: 'disabled',
          disabledAt: new Date(),
          disabledReason: reason,
        },
        { new: true },
      );

      logger.info({
        msg: 'audit_callback_disabled',
        callbackId,
        reason,
      });

      return callback;
    } catch (err) {
      logger.error({ err, msg: 'failed_to_disable_audit_callback' });
      throw err;
    }
  }

  static async getCallbackMetrics(callbackId) {
    try {
      const callback = await AuditCallback.findOne({ callbackId });
      if (!callback) {
        throw new Error('Callback not found');
      }

      const deliveryStatus = callback.getDeliveryStatus();

      return {
        callbackId,
        name: callback.name,
        status: callback.status,
        metrics: callback.metrics,
        deliveryStatus,
        errorCount: callback.errorCount,
        lastErrorMessage: callback.lastErrorMessage,
        lastErrorTime: callback.lastErrorTime,
      };
    } catch (err) {
      logger.error({ err, msg: 'failed_to_get_callback_metrics' });
      throw err;
    }
  }

  // Private helper methods
  static _buildHeaders(callback, payload) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Delivery-ID': payload.deliveryId,
      'X-Event-Type': payload.eventType,
      ...callback.headers,
    };

    // Add authentication
    if (callback.auth && callback.auth.type !== 'none') {
      switch (callback.auth.type) {
        case 'basic':
          headers['Authorization'] = `Basic ${Buffer.from(
            `${callback.auth.credentials.username}:${callback.auth.credentials.password}`,
          ).toString('base64')}`;
          break;
        case 'bearer':
          headers['Authorization'] = `Bearer ${callback.auth.credentials.token}`;
          break;
        case 'api_key':
          headers[callback.auth.credentials.headerName] = callback.auth.credentials.token;
          break;
        case 'hmac_sha256':
          const signature = crypto
            .createHmac('sha256', callback.auth.credentials.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Signature'] = signature;
          break;
      }
    }

    return headers;
  }

  static _queueDelivery(callback, event, deliveryId) {
    // In production, would queue to message broker (RabbitMQ, SQS, etc.)
    // For now, schedule for immediate async execution
    setImmediate(() => {
      this.deliverCallback(callback.callbackId, deliveryId).catch(err => {
        logger.error({ err, msg: 'unhandled_callback_delivery_error' });
      });
    });
  }

  static _updateAverage(currentAvg, newValue, count) {
    return (currentAvg * (count - 1) + newValue) / count;
  }
}

module.exports = AuditCallbackService;
