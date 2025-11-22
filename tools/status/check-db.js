#!/usr/bin/env node
/**
 * check-db.js
 * Connects to MongoDB and prints counts and sample documents for `status_meta`, `incidents`, and `worker_locks`.
 * Usage:
 *  MONGO_URI='...' MONGO_DB='ethixai' node tools/status/check-db.js
 */
const { MongoClient, ObjectId } = require('mongodb');

function getUri() {
  return process.argv[2] || process.env.MONGO_URI || process.env.MONGO_URL || null;
}

async function main() {
  const uri = getUri();
  if (!uri) {
    console.error('No Mongo URI provided. Set MONGO_URI or pass as first argument.');
    process.exit(2);
  }
  const dbName = process.env.MONGO_DB || process.env.MONGO_NAME || 'ethixai';

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB:', dbName);
    const db = client.db(dbName);

    const statusMetaCount = await db.collection('status_meta').countDocuments();
    const incidentsCount = await db.collection('incidents').countDocuments();
    const locksCount = await db.collection('worker_locks').countDocuments();

    console.log('Counts:');
    console.log('  status_meta:', statusMetaCount);
    console.log('  incidents:  ', incidentsCount);
    console.log('  worker_locks:', locksCount);

    console.log('\nSample status_meta (latest):');
    const meta = await db.collection('status_meta').find().sort({ updatedAt: -1 }).limit(1).toArray();
    console.dir(meta, { depth: 4 });

    console.log('\nRecent incidents (last 10):');
    const incs = await db.collection('incidents').find().sort({ createdAt: -1 }).limit(10).toArray();
    console.dir(incs, { depth: 4 });

    console.log('\nWorker lock(s):');
    const locks = await db.collection('worker_locks').find().toArray();
    console.dir(locks, { depth: 4 });

  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (require.main === module) main();
