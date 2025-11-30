import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const url = `${backend.replace(/\/$/, '')}/report/${id}/export`;
    const headers: Record<string,string> = {};
    const cookie = req.headers.get('cookie');
    if (cookie) {headers['cookie'] = cookie;}
    const auth = req.headers.get('authorization');
    if (auth) {headers['authorization'] = auth;}

    const resp = await fetch(url, { headers, method: 'GET' });
    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const body = await resp.arrayBuffer();
    return new NextResponse(body, { status: resp.status, headers: { 'content-type': contentType } });
  } catch (e) {
    return new NextResponse(JSON.stringify({ error: 'proxy_failed' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
}
