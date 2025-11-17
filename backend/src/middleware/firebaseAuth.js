const fs = require('fs');
const admin = require('firebase-admin');
const logger = require('../logger');

let initialized = false;

function initFirebase() {
  if (initialized) return;
  try {
    // Try GOOGLE_APPLICATION_CREDENTIALS first (standard approach)
    const googleCredsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (googleCredsPath && fs.existsSync(googleCredsPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(googleCredsPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
        initialized = true;
        logger.info('firebase_admin_initialized');
        return;
      } catch (e) {
        logger.error({ err: e, path: googleCredsPath }, 'failed_to_load_google_application_credentials');
      }
    }

    // Fallback to individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const keyFile = process.env.FIREBASE_PRIVATE_KEY_FILE || '/etc/secrets/firebase-private-key.pem';
    if (!privateKey && fs.existsSync(keyFile)) {
      privateKey = fs.readFileSync(keyFile, 'utf8');
    }
    if (!projectId || !clientEmail || !privateKey) {
      logger.warn({ hasProjectId: !!projectId, hasClientEmail: !!clientEmail, hasKey: !!privateKey }, 'firebase_admin_missing_config');
      return;
    }

    // Handle escaped newlines when coming from env var
    if (typeof privateKey === 'string') {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    initialized = true;
    logger.info('firebase_admin_initialized');
  } catch (e) {
    logger.error({ err: e }, 'firebase_admin_init_failed');
  }
}

// Firebase authentication middleware
async function firebaseAuth(req, res, next) {
  try {
    if (!initialized) initFirebase();
    if (!initialized) return res.status(500).json({ error: 'Auth not configured' });
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = await admin.auth().verifyIdToken(token);
    // Attach common fields for downstream code
    req.user = { sub: decoded.uid, email: decoded.email, role: 'user' };
    req.userId = decoded.uid;
    req.role = 'user';

    // Optionally load user role from DB if available
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const User = require('../models/User');
        const userDoc = await User.findOne({ firebase_uid: decoded.uid }) || await User.findOne({ email: decoded.email });
        if (userDoc) {
          req.role = userDoc.role || 'user';
          req.userId = String(userDoc._id);
          req.user.sub = String(userDoc._id);
        }
      }
    } catch (e) {
      // non-fatal
    }

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { firebaseAuth, initFirebase };
