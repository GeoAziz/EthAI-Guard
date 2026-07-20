const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const JobSubscriptionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    index: true,
  },
  fullName: {
    type: String,
    required: false,
    trim: true,
  },
  isSubscribed: {
    type: Boolean,
    default: true,
  },
  unsubscribeToken: {
    type: String,
    unique: true,
    sparse: true,
    default: () => uuidv4(),
  },
  subscriptionReason: {
    type: String,
    enum: ['user-request', 'careers-page', 'import'],
    default: 'user-request',
  },
  ipAddress: {
    type: String,
    required: false,
  },
  userAgent: {
    type: String,
    required: false,
  },
  confirmationEmailSentAt: {
    type: Date,
    required: false,
  },
  confirmedAt: {
    type: Date,
    required: false,
  },
  unsubscribedAt: {
    type: Date,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for active subscriptions
JobSubscriptionSchema.index({ isSubscribed: 1, createdAt: -1 });

// Update updatedAt on save
JobSubscriptionSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('JobSubscription', JobSubscriptionSchema);
