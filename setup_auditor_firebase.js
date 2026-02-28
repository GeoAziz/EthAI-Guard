#!/usr/bin/env node
/**
 * Create auditor test user in Firebase and set custom claim
 * Uses Firebase Admin SDK to directly manage users
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

console.log('[1] Initializing Firebase Admin SDK...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = admin.auth();

async function setupAuditor() {
  try {
    const email = 'auditor-test@example.com';
    const password = 'AuditorPass123!';

    // Step 1: Check if user exists
    console.log('\n[2] Checking if user exists...');
    let user = null;
    try {
      user = await auth.getUserByEmail(email);
      console.log(`✅ User exists: ${user.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('⚠️  User does not exist, creating...');
        user = await auth.createUser({
          email: email,
          password: password,
          displayName: 'Auditor Test',
        });
        console.log(`✅ User created: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Step 2: Set custom claim for auditor role
    console.log('\n[3] Setting custom claim: { role: "auditor" }...');
    await auth.setCustomUserClaims(user.uid, { role: 'auditor' });
    console.log('✅ Custom claim set');

    // Step 3: Verify
    console.log('\n[4] Verifying setup...');
    const updatedUser = await auth.getUser(user.uid);
    const claims = updatedUser.customClaims || {};
    console.log(`✅ Verified:`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   UID: ${updatedUser.uid}`);
    console.log(`   Display Name: ${updatedUser.displayName}`);
    console.log(`   Custom Claims: ${JSON.stringify(claims)}`);
    console.log(`   Password: ${password}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ SUCCESS: Auditor user is ready for testing');
    console.log('='.repeat(70));
    console.log('\nTest credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Role: auditor`);
    console.log('\nNext step: Run Phase 3C tests');
    console.log('  cd /mnt/devmandrive/EthAI/tools/selenium');
    console.log('  npm run test:phase3c:headless');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Code:', error.code);
    if (error.response) {
      console.error('Response:', error.response);
    }
    process.exit(1);
  }
}

setupAuditor();
