const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password_hash: String,
  firebase_uid: { type: String, unique: true, sparse: true }, // Firebase UID
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
