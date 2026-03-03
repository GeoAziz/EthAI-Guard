const logger = require('../logger');
const firebaseAdmin = require('../services/firebaseAdmin');

// Firebase authentication middleware
async function firebaseAuth(req, res, next) {
  try {
    // Ensure admin is initialized via the centralized wrapper
    firebaseAdmin.initFirebase();
    // If wrapper determined admin can't be initialized, return 500
    // Note: firebaseAdmin.initFirebase doesn't throw; it logs and returns early when config missing
    // We attempt to call verifyIdToken and let errors bubble as 401/500 as appropriate
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const decoded = await firebaseAdmin.verifyIdToken(token);
    // Enforce that the Firebase user's email is verified. If not, reject with 403.
    if (decoded && decoded.email_verified === false) {
      return res.status(403).json({ error: 'email_not_verified' });
    }
    
    // Extract role from Firebase custom claims (single source of truth)
    // Roles are set via Firebase setCustomUserClaims() and embedded in ID token
    const firebaseRole = decoded.role || (decoded.claims && decoded.claims.role) || 'user';
    
    // Attach common fields for downstream code
    req.user = { sub: decoded.uid, email: decoded.email, role: firebaseRole };
    req.userId = decoded.uid;
    req.role = firebaseRole;

    // Auto-provision minimal user record for audit trails (NOT for auth)
    // NOTE: MongoDB User is now purely a data store, NOT an auth source
    // Role authority comes from Firebase custom claims only
    try {
      const mongoose = require('mongoose');
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const User = require('../models/User');
        let userDoc = await User.findOne({ firebase_uid: decoded.uid }) || await User.findOne({ email: decoded.email });
        if (!userDoc) {
          // Auto-create a minimal user record for Firebase-authenticated users
          const displayName = decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'firebase-user');
          try {
            userDoc = await User.create({
              name: displayName,
              email: decoded.email,
              password_hash: null,
              firebase_uid: decoded.uid,
              // Note: role is NOT stored here; it lives in Firebase custom claims
            });
          } catch (createErr) {
            // Race: if another request created it first, fetch again by firebase_uid
            userDoc = await User.findOne({ firebase_uid: decoded.uid }) || userDoc;
          }
        }
        if (userDoc) {
          // Store MongoDB ID for audit trails, but role comes from Firebase
          req.mongoUserId = String(userDoc._id);
        }
      }
    } catch (e) {
      // non-fatal; continue with Firebase UID
      logger.debug({ err: e }, 'mongo_auto_provision_failed');
    }

    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { firebaseAuth };
