#!/usr/bin/env node
/**
 * release-lock.js
 * Safely remove the status worker lock document from MongoDB so another worker can acquire it.
 * Usage:
 *  MONGO_URI='...' MONGO_DB='ethixai' node tools/status/release-lock.js
 * Or pass the URI as the first arg:
 *  node tools/status/release-lock.js "mongodb+srv://..."
 */
const { MongoClient } = require('mongodb');

function getUriFromEnvOrArg() {
  if (process.argv[2]) return process.argv[2];
  return process.env.MONGO_URI || process.env.MONGO_URL || null;
}

async function main() {
  const uri = getUriFromEnvOrArg();
  if (!uri) {
    console.error('No Mongo URI provided. Set MONGO_URI or pass it as the first argument.');
    process.exit(2);
  }
  const dbName = process.env.MONGO_DB || process.env.MONGO_NAME || 'ethixai';

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(dbName);

    const locks = db.collection('worker_locks');
    const existing = await locks.find({_id: 'status_worker'}).toArray();
    if (existing.length === 0) {
      console.log('No `status_worker` lock found. Nothing to delete.');
      return;
    }

    console.log('Found lock document(s):');
    console.dir(existing, { depth: 4 });

    const confirm = process.env.FORCE || process.env.YES || (await askConfirm());
    if (!confirm) {
      console.log('Aborting: lock not deleted. To force deletion non-interactively set YES=1 or FORCE=1');
      return;
    }

    const res = await locks.deleteOne({_id: 'status_worker'});
    console.log('Delete result:', res);
    const after = await locks.find({_id: 'status_worker'}).toArray();
    console.log('Remaining docs with _id=status_worker:', after.length);
  } catch (err) {
    console.error('Error while releasing lock:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

function askConfirm() {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Delete the `status_worker` lock document? (y/N): ', (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

if (require.main === module) main();
