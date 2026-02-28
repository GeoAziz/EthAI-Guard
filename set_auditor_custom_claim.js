#!/usr/bin/env node
/**
 * Set auditor custom claim in Firebase for auditor-test@example.com
 * Usage: cd /mnt/devmandrive/EthAI && GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node set_auditor_custom_claim.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

console.log('[1] Initializing Firebase Admin SDK...');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

async function setAuditorClaim() {
  try {
    console.log('[2] Looking up auditor-test@example.com in Firebase...');
    const user = await admin.auth().getUserByEmail('auditor-test@example.com');
    console.log(`✅ Found user: ${user.uid}`);

    console.log('[3] Setting custom claim: { role: "auditor" }...');
    await admin.auth().setCustomUserClaims(user.uid, { role: 'auditor' });
    console.log('✅ Custom claim set successfully');

    console.log('[4] Verifying custom claim...');
    const updatedUser = await admin.auth().getUser(user.uid);
    const customClaims = updatedUser.customClaims || {};
    console.log(`✅ Verified role: ${customClaims.role}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS: Auditor role custom claim is now set');
    console.log('   User: auditor-test@example.com');
    console.log(`   UID: ${user.uid}`);
    console.log(`   Role claim: ${customClaims.role}`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

setAuditorClaim();
