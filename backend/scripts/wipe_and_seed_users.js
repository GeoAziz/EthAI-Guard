#!/usr/bin/env node
/*
 Wipe the `users` collection completely and recreate the five seeded test users.
 WARNING: Destructive. Only run in local/dev environments where you control the DB.

 Usage:
   MONGO_URL=mongodb://mongo:27017/ethixai node backend/scripts/wipe_and_seed_users.js
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
  const db = mongoose.connection.db;

  console.log('Wiping users collection...');
  try {
    const res = await db.collection('users').deleteMany({});
    console.log('Deleted', res.deletedCount, 'documents from users collection');
  } catch (e) {
    console.error('Failed to delete users collection documents:', e && e.message ? e.message : e);
  }

  console.log('Seeding test users...');
  for (const u of USERS) {
    try {
      const hash = await bcrypt.hash(u.password, 10);
      const doc = {
        name: u.name,
        email: u.email,
        password_hash: hash,
        role: u.role,
        firebaseUid: uuidv4(),
        createdAt: new Date()
      };
      await db.collection('users').insertOne(doc);
      console.log('Inserted', u.email);
    } catch (e) {
      console.error('Failed inserting', u.email, e && e.message ? e.message : e);
    }
  }

  console.log('Seeding complete. Disconnecting.');
  await mongoose.disconnect();
}

main().catch(err => { console.error('Script failed:', err && err.message ? err.message : err); process.exit(2); });
