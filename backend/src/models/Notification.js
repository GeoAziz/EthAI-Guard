/**
 * Notification Mongoose Model
 *
 * User notifications for system events and activity updates.
 */

const mongoose = require('mongoose');
const tenantScopePlugin = require('./plugins/tenantScope');

const notificationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    index: true,
  },

  userId: {
    type: String,
    required: true,
    index: true,
  },

  title: {
    type: String,
    required: true,
  },

  body: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ['success', 'error', 'info', 'warning'],
    default: 'info',
    index: true,
  },

  read: {
    type: Boolean,
    default: false,
    index: true,
  },

  link: {
    type: String,
    required: false,
  },

  metadata: {
    entityType: String,
    entityId: String,
    source: String,  // e.g., 'analysis', 'approval', 'system'
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  readAt: {
    type: Date,
    required: false,
  },

  deletedAt: {
    type: Date,
    required: false,
  },
}, {
  collection: 'notifications',
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

// TTL index: Auto-delete soft-deleted notifications after 30 days
notificationSchema.index(
  { deletedAt: 1 },
  { expireAfterSeconds: 2592000, sparse: true },
);

// Virtual for checking if notification is soft-deleted
notificationSchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

// Method to mark as read
notificationSchema.methods.markRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Method to soft-delete
notificationSchema.methods.softDelete = function () {
  this.deletedAt = new Date();
  return this.save();
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function (userId, tenantId) {
  return this.countDocuments({
    userId,
    tenantId,
    read: false,
    deletedAt: { $exists: false },
  });
};

// Static method to find active notifications
notificationSchema.statics.findActive = function (userId, tenantId) {
  return this.find({
    userId,
    tenantId,
    deletedAt: { $exists: false },
  }).sort({ createdAt: -1 });
};

notificationSchema.plugin(tenantScopePlugin);

module.exports = mongoose.models?.Notification || mongoose.model('Notification', notificationSchema);
