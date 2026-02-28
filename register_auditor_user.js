#!/usr/bin/env node
/**
 * Register auditor test user via backend /auth/login endpoint
 * This will auto-create the user in Firebase
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUDITOR_EMAIL = 'auditor-test@example.com';
const AUDITOR_PASSWORD = 'AuditorPass123!';

async function registerAuditor() {
  try {
    console.log('[1] Attempting to register auditor via backend login endpoint...');
    console.log(`   Email: ${AUDITOR_EMAIL}`);
    console.log(`   Backend URL: ${BACKEND_URL}`);

    const response = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: AUDITOR_EMAIL,
      password: AUDITOR_PASSWORD,
      deviceName: 'setup-script',
    }, {
      timeout: 5000,
      validateStatus: () => true, // Accept any status code
    });

    console.log(`[2] Response status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ Login successful - user exists or was created');
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
      return true;
    } else if (response.status === 401 || response.status === 400) {
      console.log('⚠️  Auth error (user may need to be created via Firebase Console)');
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data)}`);
      return false;
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('AUDITOR USER SETUP');
  console.log('='.repeat(60) + '\n');

  const success = await registerAuditor();

  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('✅ Auditor user is ready');
    console.log('\nNext step: Set custom claim with Firebase Admin SDK');
    console.log('Command: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node set_auditor_custom_claim.js');
  } else {
    console.log('⚠️  Could not auto-register user');
    console.log('\nManual steps required:');
    console.log('1. Create auditor-test@example.com in Firebase Console');
    console.log('2. Set password to: AuditorPass123!');
    console.log('3. Run: GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json node set_auditor_custom_claim.js');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(success ? 0 : 1);
}

main();
