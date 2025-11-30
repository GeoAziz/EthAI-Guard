'use client';
import { useState } from 'react';

export default function FirebaseExchangeDemo() {
  const [idToken, setIdToken] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function exchange() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/auth/firebase/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const json = await res.json();
      setResult({ status: res.status, body: json });
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Firebase → Backend Exchange Demo</h2>
      <p>Paste a Firebase ID token to exchange for backend access/refresh tokens.</p>
      <textarea rows={6} style={{ width: '100%' }} value={idToken} onChange={e => setIdToken(e.target.value)} />
      <div style={{ marginTop: 8 }}>
        <button onClick={exchange} disabled={loading || !idToken}>Exchange</button>
      </div>
      <pre style={{ marginTop: 12, background: '#f6f8fa', padding: 12 }}>
        {result ? JSON.stringify(result, null, 2) : 'No result yet'}
      </pre>
    </div>
  );
}
