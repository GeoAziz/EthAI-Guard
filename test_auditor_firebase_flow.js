const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./backend/firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();

async function testAuditorLogin() {
  try {
    console.log('1. Creating/updating auditor Firebase user...');
    const user = await auth.updateUser('auditor-test-user', {
      email: 'auditor-test@example.com',
      password: 'AuditorPass123!',
      displayName: 'Auditor Test'
    }).catch(() => 
      auth.createUser({
        uid: 'auditor-test-user',
        email: 'auditor-test@example.com',
        password: 'AuditorPass123!',
        displayName: 'Auditor Test'
      })
    );
    console.log('✓ User ready:', user.email);

    console.log('\n2. Setting custom claim role=auditor...');
    await auth.setCustomUserClaims('auditor-test-user', { role: 'auditor' });
    console.log('✓ Custom claim set');

    console.log('\n3. Getting ID token...');
    const idToken = await auth.createCustomToken('auditor-test-user', { role: 'auditor' });
    console.log('✓ Custom token created');

    console.log('\n4. Exchanging token with backend...');
    const response = await fetch('http://localhost:5000/auth/firebase/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const result = await response.json();
    
    if (result.accessToken) {
      console.log('✓ SUCCESS! Got accessToken');
      console.log('  Payload:', JSON.stringify(JSON.parse(Buffer.from(result.accessToken.split('.')[1], 'base64').toString()), null, 2));
    } else {
      console.log('✗ FAILED:', result);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

testAuditorLogin();
