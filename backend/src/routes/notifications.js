const express = require('express');
const router = express.Router();
const { authGuard } = require('../middleware/authGuard');
const { verifyTenantIsolation } = require('../middleware/tenantGuard');
const NotificationsService = require('../services/notificationsService');
const logger = require('../utils/logger');

// GET /v1/notifications - List notifications for current user
router.get('/v1/notifications', authGuard, verifyTenantIsolation, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.userId;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const notifications = await NotificationsService.findByUser(userId, tenantId);
    return res.json(notifications);
  } catch (err) {
    logger.error({ err }, 'get_notifications_failed');
    return next(err);
  }
});

// POST /v1/notifications/:notificationId/mark-read - Mark notification as read
router.post('/v1/notifications/:notificationId/mark-read', authGuard, verifyTenantIsolation, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId;

    const notification = await NotificationsService.markAsRead(notificationId, tenantId);
    if (!notification) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json(notification);
  } catch (err) {
    logger.error({ err }, 'mark_notification_read_failed');
    return next(err);
  }
});

// DELETE /v1/notifications/:notificationId - Delete notification
router.delete('/v1/notifications/:notificationId', authGuard, verifyTenantIsolation, async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const tenantId = req.user?.tenantId || req.tenantId;

    const notification = await NotificationsService.delete(notificationId, tenantId);
    if (!notification) {
      return res.status(404).json({ error: 'not_found' });
    }

    return res.json({ status: 'deleted' });
  } catch (err) {
    logger.error({ err }, 'delete_notification_failed');
    return next(err);
  }
});

// POST /v1/notifications/mark-all-read - Mark all notifications as read
router.post('/v1/notifications/mark-all-read', authGuard, verifyTenantIsolation, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.userId;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const result = await NotificationsService.markAllAsRead(userId, tenantId);
    return res.json({ updated: result.modifiedCount });
  } catch (err) {
    logger.error({ err }, 'mark_all_notifications_read_failed');
    return next(err);
  }
});

// GET /v1/notifications/unread-count - Get unread notification count
router.get('/v1/notifications/unread-count', authGuard, verifyTenantIsolation, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.userId;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!userId) {
      return res.status(401).json({ error: 'unauthenticated' });
    }

    const count = await NotificationsService.getUnreadCount(userId, tenantId);
    return res.json({ unreadCount: count });
  } catch (err) {
    logger.error({ err }, 'get_unread_count_failed');
    return next(err);
  }
});

module.exports = router;
