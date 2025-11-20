#!/usr/bin/env node
/**
 * Seed demo status data. If MONGO_URI env var is set, inserts documents into MongoDB
 * Collections: "status_meta" (single doc) and "incidents"
 * Otherwise writes/overwrites public/demo-status.json for local dev fallback.
 */
const fs = require('fs');
const path = require('path');

const demoFile = path.join(__dirname, '../../public/demo-status.json');

const demo = JSON.parse(fs.readFileSync(demoFile, 'utf8'));

async function seedToMongo() {
  const { MongoClient } = require('mongodb');
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGO_DB || 'ethai');

  // Upsert a single status document
  const meta = {
    lastChecked: demo.lastChecked,
    overall: demo.overall,
    services: demo.services.map(s => ({ id: s.id, name: s.name, status: s.status, uptime: s.uptime, latency: s.latency, lastChecked: s.lastChecked }))
  };
  await db.collection('status_meta').updateOne({ _id: 'singleton' }, { $set: meta }, { upsert: true });

  // Insert incidents (replace existing demo incidents with same ids)
  for (const inc of demo.incidents) {
    await db.collection('incidents').updateOne({ id: inc.id }, { $set: inc }, { upsert: true });
  }

  console.log('Seeded demo status data into MongoDB');
  await client.close();
}

async function seedToFile() {
  // Already present in public/demo-status.json — just confirm
  const p = path.join(process.cwd(), 'public', 'demo-status.json');
  fs.writeFileSync(p, JSON.stringify(demo, null, 2));
  console.log('Wrote demo-status.json to public/');
}

(async () => {
  try {
    if (process.env.MONGO_URI) {
      await seedToMongo();
    } else {
      await seedToFile();
    }
  } catch (err) {
    console.error('Failed to seed demo data:', err);
    process.exit(1);
  }
})();
