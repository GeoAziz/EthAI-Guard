#!/usr/bin/env node
/**
 * update-status-meta.js
 * Update the singleton `status_meta` document timestamps to now so the frontend/demo shows fresh lastChecked values.
 * Usage:
 *   MONGO_URI='...' MONGO_DB='ethixai' node tools/status/update-status-meta.js
 */
const { MongoClient } = require('mongodb');

const uri = process.argv[2] || process.env.MONGO_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('MONGO_URI is required (env or first arg)');
  process.exit(2);
}
const dbName = process.env.MONGO_DB || 'ethixai';

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB', dbName);
    const db = client.db(dbName);
    const now = new Date();

    const metaColl = db.collection('status_meta');
    const doc = await metaColl.findOne({ _id: 'singleton' });
    if (!doc) {
      console.error('No status_meta singleton found');
      process.exit(1);
    }

    // Update top-level fields and service timestamps
    const update = {
      $set: {
        lastChecked: now.toISOString(),
        updatedAt: now,
        'overall.updatedAt': now,
      }
    };

    if (Array.isArray(doc.services)) {
      // set each service.lastChecked to now
      const services = doc.services.map(s => ({ ...s, lastChecked: now.toISOString() }));
      update.$set.services = services;
    }

    const res = await metaColl.updateOne({ _id: 'singleton' }, update);
    console.log('Update result:', res.result || res);

  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (require.main === module) main();
