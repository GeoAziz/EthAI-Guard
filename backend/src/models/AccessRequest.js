const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, index: true },
  reason: { type: String },
  requesterId: { type: String }, // optional user id
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  handledBy: { type: String, default: null },
  handledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AccessRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);
