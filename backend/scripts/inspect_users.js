#!/usr/bin/env node
/*
 Inspect users collection documents and indexes for debugging duplicate-key issues.
 Usage: MONGO_URL=mongodb://mongo:27017/ethixai node scripts/inspect_users.js
*/
const mongoose = require('mongoose');
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ethixai';

async function main() {
  console.log('Connecting to', MONGO_URL);
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  console.log('\nIndexes on users collection:');
  try {
    const idx = await db.collection('users').indexes();
    console.log(JSON.stringify(idx, null, 2));
  } catch (e) {
    console.error('Failed to list indexes', e && e.message ? e.message : e);
  }

  console.log('\nSample user documents (first 10):');
  try {
    const docs = await db.collection('users').find({}, { projection: { password_hash: 0 } }).limit(20).toArray();
    console.log(JSON.stringify(docs, null, 2));
  } catch (e) {
    console.error('Failed to list docs', e && e.message ? e.message : e);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(2); });
