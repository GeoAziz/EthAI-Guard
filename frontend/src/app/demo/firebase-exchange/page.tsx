"use client";

import React, { useState } from 'react';

export default function FirebaseExchangeDemo() {
  const [idToken, setIdToken] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function doExchange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    try {
      const resp = await fetch('/auth/firebase/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(json));
      setResult(json);
    } catch (e) {
      setErr(String(e));
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Firebase → Backend Exchange Demo</h1>
      <p>Paste a Firebase ID token here (from client SDK) and hit Exchange.</p>
      <form onSubmit={doExchange}>
        <div>
          <textarea value={idToken} onChange={e => setIdToken(e.target.value)} rows={6} cols={80} placeholder="Paste ID token here" />
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit">Exchange</button>
        </div>
      </form>
      {err && <pre style={{ color: 'red' }}>{err}</pre>}
      {result && (
        <div>
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
