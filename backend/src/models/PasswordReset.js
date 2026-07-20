/**
 * Password Reset Mongoose Model
 *
 * Tracks password reset tokens with expiry for security.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },

  email: {
    type: String,
    required: true,
    index: true,
  },

  resetTokenHash: {
    type: String,
    required: true,
    unique: true,
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },

  usedAt: {
    type: Date,
    required: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  collection: 'password_resets',
});

// TTL index: Auto-delete expired reset tokens after 24 hours
passwordResetSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

// Static method to generate reset token
passwordResetSchema.statics.generateResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

// Static method to create reset request
passwordResetSchema.statics.createReset = async function (userId, email) {
  const { token, hash } = this.generateResetToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Invalidate any existing resets for this user
  await this.updateMany({ userId, usedAt: { $exists: false } }, { usedAt: new Date() });

  const reset = new this({
    userId,
    email,
    resetTokenHash: hash,
    expiresAt,
  });

  await reset.save();
  return { token, expiresAt };
};

// Static method to verify reset token
passwordResetSchema.statics.verifyReset = async function (userId, token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await this.findOne({
    userId,
    resetTokenHash: hash,
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  return reset;
};

// Instance method to mark as used
passwordResetSchema.methods.markUsed = function () {
  this.usedAt = new Date();
  return this.save();
};

module.exports = mongoose.models?.PasswordReset || mongoose.model('PasswordReset', passwordResetSchema);
