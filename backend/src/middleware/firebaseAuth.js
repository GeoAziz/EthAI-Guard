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
    // decoded.email_verified is provided by firebase-admin verifyIdToken
    if (decoded && decoded.email_verified === false) {
      return res.status(403).json({ error: 'email_not_verified' });
    }
    // Attach common fields for downstream code
    req.user = { sub: decoded.uid, email: decoded.email, role: 'user' };
    req.userId = decoded.uid;
    req.role = 'user';

    // Optionally load user role from DB if available; auto-provision user if missing
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
              role: 'user',
            });
          } catch (createErr) {
            // Race: if another request created it first, fetch again by firebase_uid
            userDoc = await User.findOne({ firebase_uid: decoded.uid }) || userDoc;
          }
        }
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

module.exports = { firebaseAuth };
