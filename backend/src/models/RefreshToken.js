const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  // Reference to user - supports both ObjectId (JWT auth) and String (Firebase UID)
  userId: { type: mongoose.Schema.Types.Mixed, required: true, index: true },
  
  // Hashed token (Argon2) for secure storage
  tokenHash: { type: String, required: true, index: true },
  
  // Device/session metadata
  device: {
    userAgent: String,
    ipAddress: String,
    deviceId: String,  // optional client-side device identifier
    deviceName: String // e.g., "Chrome on Windows", "Safari on iPhone"
  },
  
  // Token lifecycle
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, required: true, index: true },
  lastUsedAt: { type: Date },
  revokedAt: { type: Date },  // null = active, set = revoked
  
  // Track rotation chain
  rotationId: String,  // Links tokens in a rotation chain
  parentTokenHash: String,  // Reference to previous token in chain
  
  // Metadata
  name: String  // User-friendly name like "My Laptop" or "Work Phone"
});

// Automatically remove expired tokens 30 days after expiration
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600, background: true }
);

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
