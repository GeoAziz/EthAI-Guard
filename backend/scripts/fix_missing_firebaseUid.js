#!/usr/bin/env node
/*
 Patch users that have missing or null `firebaseUid` to a generated uuid.
 This avoids duplicate-key collisions when inserting new users on collections that
 have a non-sparse unique index on `firebaseUid`.
*/
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/ethixai';

async function main(){
  console.log('Connecting to', MONGO_URL);
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection.db;
  const qr = { $or: [ { firebaseUid: { $exists: false } }, { firebaseUid: null } ] };
  const docs = await db.collection('users').find(qr, { projection: { _id: 1, email: 1, firebaseUid: 1, firebase_uid: 1 } }).toArray();
  console.log('Found', docs.length, 'users with missing/null firebaseUid');
  for (const d of docs) {
    try {
      const newUid = uuidv4();
      await db.collection('users').updateOne({ _id: d._id }, { $set: { firebaseUid: newUid } });
      console.log('Patched', d.email || d._id, '-> firebaseUid=', newUid);
    } catch (e) {
      console.error('Failed to patch', d._id, e && e.message ? e.message : e);
    }
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(2); });
