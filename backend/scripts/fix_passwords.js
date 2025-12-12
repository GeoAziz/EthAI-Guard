#!/usr/bin/env node
/*
 Safe helper to set/overwrite password_hash for seeded test accounts.
 - Connects to MongoDB via MONGO_URL
 - For each known test email from creds.md, hashes the plaintext password and updates the user document by email.
 - If a user does not exist, creates it with a generated firebase_uid to avoid duplicate-null unique-index collisions.
 Usage: MONGO_URL=mongodb://mongo:27017/ethixai node scripts/fix_passwords.js
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ethixai';

const USERS = [
  { name: 'Promote Test', email: 'promote-test@example.com', password: 'PromotePass123!', role: 'admin' },
  { name: 'Analyst Test', email: 'analyst-test@example.com', password: 'AnalystPass123!', role: 'analyst' },
  { name: 'Reviewer Test', email: 'reviewer-test@example.com', password: 'ReviewerPass123!', role: 'reviewer' },
  { name: 'Regular User', email: 'user-test@example.com', password: 'UserPass123!', role: 'user' },
  { name: 'Guest User', email: 'guest-test@example.com', password: 'GuestPass123!', role: 'guest' }
];

async function main() {
  console.log('Connecting to MongoDB:', MONGO_URL);
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected.');

  const User = require('../src/models/User');

  for (const u of USERS) {
    try {
      const hash = await bcrypt.hash(u.password, 10);
      const found = await User.findOne({ email: u.email });
      if (found) {
        found.password_hash = hash;
        found.role = u.role || found.role;
        found.name = u.name || found.name;
        await found.save();
        console.log('Updated user:', u.email);
      } else {
        // Create user but populate both naming variants of the firebase uid field to
        // avoid duplicate-null unique-index collisions arising from previous schema/indexes.
        try {
          const firebase_uid = uuidv4();
          await User.create({ name: u.name, email: u.email, password_hash: hash, role: u.role, firebase_uid, firebaseUid: firebase_uid });
          console.log('Created user', u.email, '(with generated firebase_uid)');
        } catch (e) {
          console.error('Failed to create user', u.email, e && e.message ? e.message : e);
        }
      }
    } catch (e) {
      console.error('Error processing', u.email, e && e.message ? e.message : e);
    }
  }

  console.log('Done. Disconnecting.');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err && err.message ? err.message : err);
  process.exit(2);
});
