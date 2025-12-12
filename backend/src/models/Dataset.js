const mongoose = require('mongoose');

const DatasetSchema = new mongoose.Schema({
  name: String,
  type: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadDate: { type: Date, default: Date.now },
  // versions: simple array to track uploaded dataset versions (MVP)
  versions: [
    {
      versionId: String,
      filename: String,
      rows: Number,
      uploadedAt: { type: Date, default: Date.now },
      // CSV metadata stored for quick preview and basic schema
      header: [String],
      rowsPreview: [[String]],
      totalRows: Number,
      // optional: store full CSV as blob (Buffer) when STORE_FULL_CSV_IN_DB=1
      blob: Buffer,
      // legacy/back-compat: previously we stored a filesystem path (not used in new flow)
      path: String,
    },
  ],
});

module.exports = mongoose.model('Dataset', DatasetSchema);
