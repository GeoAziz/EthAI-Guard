"use client";
import React, { useState } from 'react';
import { useParams } from 'next/navigation';

export default function RetrainPage() {
  const params = useParams();
  const modelId = params?.id as string;
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  const [reason, setReason] = useState('drift');
  const [notes, setNotes] = useState('');
  const [baseline, setBaseline] = useState('');
  const [result, setResult] = useState<any>(null);
  const [working, setWorking] = useState(false);

  async function trigger() {
    setWorking(true);
    setResult(null);
    try {
      const res = await fetch(`${backend}/v1/models/${modelId}/trigger-retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, notes, baseline_snapshot_id: baseline })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ error: 'failed' });
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Start Retrain Job</h1>
      <p className="text-sm text-gray-600 mb-4">Model: {modelId}</p>
      <div className="space-y-3 max-w-xl">
        <div>
          <label className="block text-sm">Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)} className="border rounded px-2 py-1 w-full">
            <option value="drift">drift</option>
            <option value="fairness">fairness</option>
            <option value="data_quality">data_quality</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Baseline Snapshot ID (optional)</label>
          <input value={baseline} onChange={e => setBaseline(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="border rounded px-2 py-1 w-full" rows={3} />
        </div>
        <button onClick={trigger} disabled={working} className="bg-blue-600 text-white px-4 py-2 rounded">
          {working ? 'Starting…' : 'Start Retrain Job'}
        </button>
        {result && (
          <pre className="bg-gray-100 p-3 rounded text-sm mt-4">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
