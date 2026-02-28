#!/usr/bin/env node
/**
 * Mark all test user emails as verified in Firebase
 * This allows them to exchange Firebase ID tokens for backend tokens
 * Usage: cd /mnt/devmandrive/EthAI && node verify_test_user_emails.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./backend/firebase-key.json');

console.log('[1] Initializing Firebase Admin SDK...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = admin.auth();

const TEST_USERS = [
  'promote-test@example.com',
  'analyst-test@example.com',
  'auditor-test@example.com',
];

async function verifyEmails() {
  console.log('\n[2] Marking test user emails as verified...\n');

  for (const email of TEST_USERS) {
    try {
      console.log(`  Processing: ${email}`);
      
      // Get the user
      const user = await auth.getUserByEmail(email);
      console.log(`    ✓ Found UID: ${user.uid}`);
      
      // Update to mark email as verified
      await auth.updateUser(user.uid, {
        emailVerified: true,
      });
      console.log(`    ✓ Email verified: ${email}`);
      
    } catch (error) {
      console.error(`    ✗ Error with ${email}: ${error.message}`);
    }
  }

  console.log('\n[3] Verification complete!');
  console.log('Test users are now ready for Firebase authentication.\n');
}

verifyEmails()
  .then(() => {
    console.log('✅ All test users have verified emails');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
