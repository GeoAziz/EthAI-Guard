const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema({
  name: String,
  type: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dataset', DatasetSchema);
