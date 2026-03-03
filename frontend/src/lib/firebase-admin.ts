/**
 * Firebase Admin SDK initialization for Vercel serverless
 * Reused across invocations
 */
import 'server-only';

import * as admin from 'firebase-admin';

let initialized = false;

export function initializeFirebase() {
  if (initialized) {
    return admin;
  }

  // Firebase Admin auto-initializes with FIREBASE_CONFIG environment variable
  // or from service account key (set via Firebase CLI or manually)
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } catch (e) {
      // Already initialized
    }
  }

  initialized = true;
  return admin;
}

/**
 * Verify Firebase ID token and extract user info
 */
export async function verifyToken(token: string) {
  const admin = initializeFirebase();

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || decoded.claims?.role || 'user',
      emailVerified: decoded.email_verified || false,
      decoded,
    };
  } catch (error: any) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Set custom claims (role) for user
 */
export async function setUserRole(uid: string, role: string) {
  const admin = initializeFirebase();

  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    return { success: true, uid, role };
  } catch (error: any) {
    throw new Error(`Failed to set user role: ${error.message}`);
  }
}
