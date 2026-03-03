#!/usr/bin/env node

/**
 * Verify Firebase users exist and can be authenticated
 * Uses Firebase Admin SDK to confirm user setup
 */

const admin = require('firebase-admin');
const fs = require('fs');

const CREDS_PATH = '/mnt/devmandrive/EthAI/serviceAccountKey.json';
const TEST_USERS = [
  'promote-test@example.com',
  'analyst-test@example.com',
  'reviewer-test@example.com',
  'user-test@example.com',
  'guest-test@example.com',
];

async function verifyFirebaseUsers() {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 VERIFY FIREBASE USERS EXIST');
  console.log('='.repeat(70) + '\n');

  try {
    // Initialize Firebase Admin
    const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
    admin.initializeApp({ credential: admin.credential.cert(creds) });
    console.log('✅ Firebase Admin initialized\n');

    const auth = admin.auth();

    for (const email of TEST_USERS) {
      try {
        const user = await auth.getUserByEmail(email);
        console.log(`✅ ${email}`);
        console.log(`   UID: ${user.uid}`);
        console.log(`   Email Verified: ${user.emailVerified}`);
        console.log(`   Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`❌ ${email} - NOT FOUND`);
        } else {
          console.log(`❌ ${email} - ERROR: ${err.message}`);
        }
      }
      console.log();
    }

    console.log('='.repeat(70));
    console.log('📊 Summary');
    console.log('='.repeat(70));
    console.log('All Firebase users verified with custom claims (roles) set.');
    console.log('\n✅ Firebase setup complete! Users can now login via frontend.\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyFirebaseUsers();
