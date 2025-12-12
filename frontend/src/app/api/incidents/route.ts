import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

async function readDemoIncidents() {
  const p = path.join(process.cwd(), 'public', 'demo-status.json');
  const raw = await fs.promises.readFile(p, 'utf8');
  const json = JSON.parse(raw);
  return json.incidents || [];
}

async function readIncidentsFromMongo(limit = 20) {
  const { MongoClient } = await import('mongodb');
  const uri = process.env.MONGO_URI;
  if (!uri) {throw new Error('MONGO_URI not configured');}
  const client = new MongoClient(uri as string);
  await client.connect();
  const db = client.db(process.env.MONGO_DB || 'ethai');
  const rows = await db.collection('incidents').find({}).sort({ date: -1 }).limit(limit).toArray();
  await client.close();
  return rows;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    if (process.env.MONGO_URI) {
      const data = await readIncidentsFromMongo(limit);
      return NextResponse.json({ source: 'mongo', incidents: data });
    }
  } catch (err) {
    console.error('Failed to read incidents from Mongo', err);
  }

  try {
    const demo = await readDemoIncidents();
    return NextResponse.json({ source: 'demo', incidents: demo });
  } catch (err) {
    console.error('Failed to read demo incidents', err);
    return NextResponse.json({ source: 'empty', incidents: [] });
  }
}
