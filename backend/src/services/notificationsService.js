/**
 * Notifications Service
 *
 * Handles notification creation, retrieval, and management.
 */

const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class NotificationsService {
  /**
   * Create a new notification
   */
  static async create(userId, tenantId, { title, body, type = 'info', link, metadata }) {
    try {
      const notification = new Notification({
        userId,
        tenantId,
        title,
        body,
        type,
        link,
        metadata,
      });
      await notification.save();
      logger.info({ notificationId: notification._id, userId }, 'notification_created');
      return notification;
    } catch (err) {
      logger.error({ err, userId }, 'notification_create_failed');
      throw err;
    }
  }

  /**
   * Get all active notifications for a user
   */
  static async findByUser(userId, tenantId) {
    try {
      const notifications = await Notification.findActive(userId, tenantId);
      return notifications;
    } catch (err) {
      logger.error({ err, userId }, 'notifications_fetch_failed');
      throw err;
    }
  }

  /**
   * Get a single notification by ID
   */
  static async findById(notificationId, tenantId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        tenantId,
        deletedAt: { $exists: false },
      });
      return notification;
    } catch (err) {
      logger.error({ err, notificationId }, 'notification_fetch_failed');
      throw err;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId, tenantId) {
    try {
      const notification = await this.findById(notificationId, tenantId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      await notification.markRead();
      logger.info({ notificationId }, 'notification_marked_read');
      return notification;
    } catch (err) {
      logger.error({ err, notificationId }, 'notification_mark_read_failed');
      throw err;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId, tenantId) {
    try {
      const result = await Notification.updateMany(
        { userId, tenantId, read: false, deletedAt: { $exists: false } },
        { read: true, readAt: new Date() },
      );
      logger.info({ userId, count: result.modifiedCount }, 'notifications_marked_all_read');
      return result;
    } catch (err) {
      logger.error({ err, userId }, 'notifications_mark_all_read_failed');
      throw err;
    }
  }

  /**
   * Delete (soft-delete) a notification
   */
  static async delete(notificationId, tenantId) {
    try {
      const notification = await this.findById(notificationId, tenantId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      await notification.softDelete();
      logger.info({ notificationId }, 'notification_deleted');
      return notification;
    } catch (err) {
      logger.error({ err, notificationId }, 'notification_delete_failed');
      throw err;
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId, tenantId) {
    try {
      const count = await Notification.getUnreadCount(userId, tenantId);
      return count;
    } catch (err) {
      logger.error({ err, userId }, 'unread_count_fetch_failed');
      throw err;
    }
  }

  /**
   * Bulk create notifications (e.g., for system events)
   */
  static async createBulk(userIds, tenantId, { title, body, type = 'info', link, metadata }) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        tenantId,
        title,
        body,
        type,
        link,
        metadata,
      }));
      const result = await Notification.insertMany(notifications);
      logger.info({ count: result.length, tenantId }, 'notifications_bulk_created');
      return result;
    } catch (err) {
      logger.error({ err, tenantId }, 'notifications_bulk_create_failed');
      throw err;
    }
  }
}

module.exports = NotificationsService;
