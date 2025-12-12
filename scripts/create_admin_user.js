#!/usr/bin/env node
/*
  create_admin_user.js

  Usage:
    node scripts/create_admin_user.js --email=admin@example.com --password=Secret123! --name="Admin User" --role=admin

  The script:
  - Initializes firebase-admin using GOOGLE_APPLICATION_CREDENTIALS or serviceAccountKey.json
  - Connects to MongoDB using MONGO_URL (default: mongodb://localhost:27017/ethixai)
  - Creates a Firebase Auth user (if not exists) with the provided email/password
  - Upserts a User document in MongoDB with firebase_uid and role

  NOTE: For safety, do not commit your serviceAccountKey.json to git. Use environment variables in CI.
*/

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv)).options({
  email: { type: 'string', demandOption: true },
  password: { type: 'string', demandOption: true },
  name: { type: 'string', default: '' },
  role: { type: 'string', default: 'admin' },
  mongo: { type: 'string', default: process.env.MONGO_URL || 'mongodb://localhost:27017/ethixai' }
}).argv;

const mongoose = require('mongoose');

async function main() {
  const fs = require('fs');
  const path = require('path');
  const admin = (() => { try { return require('firebase-admin'); } catch (e) { return null; } })();
  if (!admin) {
    console.error('firebase-admin is not installed. Run `npm install firebase-admin` in the backend folder.');
    process.exit(2);
  }

  // init firebase-admin
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve(__dirname, '../serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    console.error('Service account key not found. Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json at project root.');
    process.exit(3);
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  } catch (e) {
    console.error('Failed to initialize firebase-admin:', e.message || e);
    process.exit(4);
  }

  // connect mongoose
  try {
    await mongoose.connect(argv.mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  } catch (e) {
    console.error('Failed to connect to MongoDB:', e.message || e);
    process.exit(5);
  }

  const User = require('../backend/src/models/User');

  try {
    // Try find existing Firebase user by email
    let fbUser = null;
    try {
      fbUser = await admin.auth().getUserByEmail(argv.email).catch(() => null);
    } catch (e) {
      fbUser = null;
    }

    if (!fbUser) {
      console.log('Creating user in Firebase Auth...');
      // If --no-password was requested, create the account without a password (useful for SSO-only accounts).
      const createArgs = { email: argv.email, displayName: argv.name || undefined };
      if (!argv.noPassword) createArgs.password = argv.password;
      fbUser = await admin.auth().createUser(createArgs);
      console.log('Firebase user created:', fbUser.uid);
    } else {
      console.log('Firebase user already exists:', fbUser.uid);
    }

    // Set custom claims (role) - make this explicit and retry once on transient errors
    try {
      await admin.auth().setCustomUserClaims(fbUser.uid, { role: argv.role });
      console.log('Set custom claims role=', argv.role);
    } catch (e) {
      console.warn('Failed to set custom claims (retrying):', e.message || e);
      try { await admin.auth().setCustomUserClaims(fbUser.uid, { role: argv.role }); console.log('Set custom claims role=', argv.role); } catch (ee) { console.warn('Retry failed:', ee.message || ee); }
    }

    // Upsert user in MongoDB (do not set local password_hash when using Firebase-first flow)
    const existing = await User.findOne({ email: argv.email });
    if (existing) {
      existing.firebase_uid = fbUser.uid;
      existing.role = argv.role;
      if (argv.name) existing.name = argv.name;
      // leave existing.password_hash untouched so Firebase-only users don't get a local password
      await existing.save();
      console.log('Updated existing User document:', existing._id.toString());
    } else {
      const u = await User.create({ name: argv.name || argv.email.split('@')[0], email: argv.email, firebase_uid: fbUser.uid, role: argv.role });
      console.log('Created User document:', u._id.toString());
    }

    console.log('\nDone. Admin user is ready.');
    console.log(`Email: ${argv.email}`);
    console.log(`Password: ${argv.password}`);
    console.log(`Role: ${argv.role}`);
    console.log('You can sign in via your frontend using these credentials.');

    process.exit(0);
  } catch (e) {
    console.error('Failed to create admin user:', e.message || e);
    process.exit(6);
  }
}

main();
