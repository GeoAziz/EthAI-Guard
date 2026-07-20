const mongoose = require('mongoose');

const JobApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    index: true,
  },
  phone: {
    type: String,
    required: true,
  },
  jobId: {
    type: String,
    required: false,
  },
  jobTitle: {
    type: String,
    required: false,
  },
  coverLetter: {
    type: String,
    required: false,
  },
  linkedIn: {
    type: String,
    required: false,
  },
  resumeUrl: {
    type: String,
    required: false,
    description: 'URL where resume is stored (e.g., S3, file system)',
  },
  resumeFileName: {
    type: String,
    required: false,
  },
  resumeSize: {
    type: Number,
    required: false,
  },
  status: {
    type: String,
    enum: ['received', 'reviewing', 'shortlisted', 'rejected', 'offered'],
    default: 'received',
  },
  source: {
    type: String,
    enum: ['job-posting', 'general-inquiry'],
    default: 'job-posting',
  },
  emailSent: {
    type: Boolean,
    default: false,
  },
  confirmationEmailSentAt: {
    type: Date,
    required: false,
  },
  notes: {
    type: String,
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

// Update updatedAt on save
JobApplicationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for finding applications by email
JobApplicationSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
