#!/usr/bin/env node
/*
 Clear and recreate seeded test users for RBAC testing.
 WARNING: This script will DELETE user documents matching seeded emails
 and any users with a NULL or missing `firebaseUid`. Intended for local/dev only.

 Usage (from repo root):
   MONGO_URL=mongodb://mongo:27017/ethixai node backend/scripts/clear_and_recreate_seeded_users.js
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

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
  const db = mongoose.connection.db;

  // Preview what will be deleted
  const emails = USERS.map(u => u.email);
  const toDelete = await db.collection('users').find({ $or: [ { email: { $in: emails } }, { firebaseUid: null }, { firebaseUid: { $exists: false } } ] }).project({ email: 1, firebaseUid: 1 }).toArray();
  console.log('Found', toDelete.length, 'user documents matching delete criteria:');
  for (const d of toDelete) console.log(' -', d.email || d._id, 'firebaseUid=', d.firebaseUid);

  // Proceed to delete
  const delRes = await db.collection('users').deleteMany({ $or: [ { email: { $in: emails } }, { firebaseUid: null }, { firebaseUid: { $exists: false } } ] });
  console.log('Deleted', delRes.deletedCount, 'user documents.');

  // Recreate seeded users
  for (const u of USERS) {
    try {
      const hash = await bcrypt.hash(u.password, 10);
      const doc = { name: u.name, email: u.email, password_hash: hash, role: u.role };
      await db.collection('users').insertOne(doc);
      console.log('Created', u.email);
    } catch (e) {
      console.error('Failed creating', u.email, e && e.message ? e.message : e);
    }
  }

  console.log('Recreation complete. Disconnecting.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script failed:', err && err.message ? err.message : err);
  process.exit(2);
});
