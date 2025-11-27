const admin = (() => { try { return require('firebase-admin'); } catch (e) { console.error('firebase-admin not found. Ensure dependencies are installed in backend.'); process.exit(2);} })();
const fs = require('fs');
const path = require('path');
const argv = require('yargs/yargs')(process.argv.slice(2)).options({ email: { type: 'string', demandOption: true }, password: { type: 'string', default: 'TempPass123!' }, role: { type: 'string', default: 'user' } }).argv;

const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(saPath)) { console.error('Service account key not found at', saPath); process.exit(3); }
try { admin.initializeApp({ credential: admin.credential.cert(require(saPath)) }); } catch (e) { /* ignore if already inited */ }

(async () => {
  try {
    const email = argv.email;
    const password = argv.password;
    const role = argv.role;
    let fbUser = null;
    try { fbUser = await admin.auth().getUserByEmail(email).catch(() => null); } catch (e) { fbUser = null; }
    if (!fbUser) {
      console.log('Creating Firebase user', email);
      fbUser = await admin.auth().createUser({ email, password, displayName: email.split('@')[0] });
      console.log('Created Firebase uid=', fbUser.uid);
    } else {
      console.log('Firebase user already exists uid=', fbUser.uid);
    }

    try {
      await admin.auth().setCustomUserClaims(fbUser.uid, { role });
      console.log('Set custom claims role=', role);
    } catch (e) {
      console.warn('Failed to set custom claims:', e.message || e);
    }

    const fetched = await admin.auth().getUserByEmail(email);
    console.log('Final claims for', email, '=', fetched.customClaims || null);
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message || e);
    process.exit(4);
  }
})();
