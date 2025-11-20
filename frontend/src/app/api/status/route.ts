import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

async function readDemo() {
  const p = path.join(process.cwd(), 'public', 'demo-status.json');
  const raw = await fs.promises.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function readFromMongo() {
  const { MongoClient } = await import('mongodb');
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not configured');
  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db(process.env.MONGO_DB || 'ethai');
  const meta = await db.collection('status_meta').findOne({ _id: 'singleton' } as any);
  await client.close();
  return meta || null;
}

export async function GET() {
  try {
    if (process.env.MONGO_URI) {
      const data = await readFromMongo();
      if (data) return NextResponse.json({ source: 'mongo', ...data });
    }
  } catch (err) {
    console.error('Failed to read from Mongo in /api/status', err);
  }

  try {
    const demo = await readDemo();
    return NextResponse.json({ source: 'demo', ...demo });
  } catch (err) {
    console.error('Failed to read demo status file', err);
    return NextResponse.json({ source: 'empty', services: [], incidents: [], overall: { status: 'unknown' }, lastChecked: new Date().toISOString() });
  }
}
