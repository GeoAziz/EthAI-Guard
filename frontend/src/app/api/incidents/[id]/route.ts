import { NextResponse } from 'next/server';

// Protect this route with a simple shared secret. Set INC_SECRET in environment variables
function checkAuth(req: Request) {
  const secret = process.env.INC_SECRET;
  if (!secret) {return false;} // no secret configured => deny
  const header = req.headers.get('x-inc-secret');
  return header === secret;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!checkAuth(req)) {return NextResponse.json({ error: 'unauthorized' }, { status: 401 });}

  const id = params.id;
  try {
    const body = await req.json();
    const { action } = body;
    if (!action) {return NextResponse.json({ error: 'missing action' }, { status: 400 });}

    const { MongoClient } = await import('mongodb');
    const uri = process.env.MONGO_URI;
    if (!uri) {return NextResponse.json({ error: 'MONGO_URI not configured' }, { status: 500 });}
    const client = new MongoClient(uri as string);
    await client.connect();
    const db = client.db(process.env.MONGO_DB || 'ethai');

    if (action === 'resolve') {
      const now = new Date().toISOString();
      const res = await db.collection('incidents').updateOne({ id }, { $set: { resolved: true, resolvedAt: now, updatedAt: now } });
      await client.close();
      if (res.matchedCount === 0) {return NextResponse.json({ error: 'not found' }, { status: 404 });}
      return NextResponse.json({ success: true });
    }

    await client.close();
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Failed to update incident', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
