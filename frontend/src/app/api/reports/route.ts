import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${backend.replace(/\/$/, '')}/reports`;
    const headers: Record<string,string> = {};
    const cookie = req.headers.get('cookie');
    if (cookie) headers['cookie'] = cookie;
    const auth = req.headers.get('authorization');
    if (auth) headers['authorization'] = auth;

    const resp = await fetch(url, { headers, method: 'GET' });
    const body = await resp.text();
    return new NextResponse(body, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: 'proxy_failed' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}
