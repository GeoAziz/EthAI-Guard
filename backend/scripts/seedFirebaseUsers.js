#!/usr/bin/env node

/**
 * Seed Firebase Authentication with test users matching backend seeded accounts
 * 
 * Usage:
 *   node backend/scripts/seedFirebaseUsers.js
 * 
 * Prerequisites:
 *   - serviceAccountKey.json in project root OR GOOGLE_APPLICATION_CREDENTIALS set
 *   - Valid Firebase project configured
 * 
 * This script:
 *   1. Creates test users in Firebase Auth matching creds.md
 *   2. Sets custom claims (role) for each user
 *   3. Handles existing users gracefully (updates claims or skips)
 *   4. Reports results for each user
 */

const path = require('path');
const fs = require('fs');

// Load from serviceAccountKey if available, otherwise rely on environment
const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
  console.log(`✓ Using serviceAccountKey.json at ${serviceAccountPath}`);
}

// Now load Firebase Admin SDK
const firebaseAdmin = require('../src/services/firebaseAdmin');

// Test users matching creds.md
const TEST_USERS = [
  {
    name: 'Promote Test (Admin)',
    email: 'promote-test@example.com',
    password: 'PromotePass123!',
    role: 'admin',
  },
  {
    name: 'Analyst Test',
    email: 'analyst-test@example.com',
    password: 'AnalystPass123!',
    role: 'analyst',
  },
  {
    name: 'Reviewer Test',
    email: 'reviewer-test@example.com',
    password: 'ReviewerPass123!',
    role: 'reviewer',
  },
  {
    name: 'User Test',
    email: 'user-test@example.com',
    password: 'UserPass123!',
    role: 'user',
  },
  {
    name: 'Guest Test',
    email: 'guest-test@example.com',
    password: 'GuestPass123!',
    role: 'guest',
  },
];

async function seedFirebaseUsers() {
  console.log('\n🔥 Firebase User Seeding Script\n');
  console.log(`Target environment: ${process.env.FIREBASE_PROJECT_ID || 'unknown (will use default)'}\n`);

  // Initialize Firebase Admin
  firebaseAdmin.initFirebase();

  const results = {
    created: [],
    updated: [],
    failed: [],
  };

  for (const user of TEST_USERS) {
    try {
      console.log(`📝 Processing: ${user.email} (role: ${user.role})...`);

      let uid;
      let isNew = false;

      // Try to fetch existing user by email
      try {
        const existing = await firebaseAdmin.getUserByEmail(user.email);
        uid = existing.uid;
        console.log(`   └─ User exists (uid: ${uid})`);
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Create new user
          const created = await firebaseAdmin.createUser({
            email: user.email,
            password: user.password,
            displayName: user.name,
          });
          uid = created.uid;
          isNew = true;
          console.log(`   └─ User created (uid: ${uid})`);
        } else {
          throw err;
        }
      }

      // Set or update custom claims with role
      try {
        await firebaseAdmin.setCustomUserClaims(uid, { role: user.role });
        console.log(`   ✓ Custom claims set: { role: '${user.role}' }`);

        if (isNew) {
          results.created.push({ email: user.email, role: user.role, uid });
        } else {
          results.updated.push({ email: user.email, role: user.role, uid });
        }
      } catch (err) {
        throw new Error(`Failed to set custom claims: ${err.message}`);
      }

      console.log(`   ✅ Complete\n`);
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}\n`);
      results.failed.push({
        email: user.email,
        role: user.role,
        error: err.message,
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Created: ${results.created.length}`);
  if (results.created.length > 0) {
    results.created.forEach(u => {
      console.log(`  • ${u.email} (${u.role})`);
    });
  }

  console.log(`\n📝 Updated: ${results.updated.length}`);
  if (results.updated.length > 0) {
    results.updated.forEach(u => {
      console.log(`  • ${u.email} (${u.role})`);
    });
  }

  console.log(`\n❌ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(u => {
      console.log(`  • ${u.email}: ${u.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  const total = results.created.length + results.updated.length;
  const success = total > 0;

  if (success) {
    console.log(`\n✅ Firebase user seeding ${total === TEST_USERS.length ? 'successful' : 'partially successful'}!`);
    console.log('\n🧪 Next: Test login with credentials from creds.md\n');
    process.exit(0);
  } else if (results.failed.length > 0) {
    console.log(`\n❌ All operations failed. Check Firebase credentials and project setup.\n`);
    process.exit(1);
  } else {
    console.log(`\n⚠️  No users were processed. Check Firebase initialization.\n`);
    process.exit(1);
  }
}

seedFirebaseUsers().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
