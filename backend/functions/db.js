/**
 * MongoDB Connection Management for Cloud Functions
 * Implements connection pooling since Cloud Functions reuse instances
 */

const mongoose = require('mongoose');
const logger = require('../src/logger');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/ethixai';
const USE_IN_MEMORY = process.env.NODE_ENV === 'test' || process.env.USE_IN_MEMORY_DB === '1';

let User, Dataset, Report, RefreshToken;
let connectionPromise = null;
let isConnected = false;

/**
 * Connect to MongoDB (reuses existing connection)
 */
async function getConnection() {
  if (USE_IN_MEMORY) {
    return null; // In-memory mode
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(MONGO_URL, {
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => {
      isConnected = true;
      logger.info('MongoDB connected');
      return mongoose.connection;
    })
    .catch(err => {
      logger.error({ err }, 'MongoDB connection failed');
      connectionPromise = null;
      throw err;
    });

  return connectionPromise;
}

/**
 * Load models (lazy load to avoid issues before connection)
 */
async function loadModels() {
  if (USE_IN_MEMORY) {
    return null;
  }

  if (!User) {
    await getConnection();
    User = require('../src/models/User');
    Dataset = require('../src/models/Dataset');
    Report = require('../src/models/Report');
    RefreshToken = require('../src/models/RefreshToken');
  }

  return { User, Dataset, Report, RefreshToken };
}

module.exports = {
  getConnection,
  loadModels,
  USE_IN_MEMORY,
  get User() { return User; },
  get Dataset() { return Dataset; },
  get Report() { return Report; },
  get RefreshToken() { return RefreshToken; },
};
