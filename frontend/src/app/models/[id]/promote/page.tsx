"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PromotePage() {
  const params = useParams();
  const sp = useSearchParams();
  const modelId = params?.id as string;
  const versionParam = sp.get('version') || '';
  const [version, setVersion] = useState(versionParam);
  const [requestId, setRequestId] = useState('');
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<any>(null);
  const { user, loading, hasRole } = useAuth();

  async function promote() {
    if (confirm !== 'PROMOTE') {
      setResult({ error: 'type PROMOTE to confirm' });
      return;
    }
    try {
      const res = await api.post(`/v1/models/${modelId}/promote`, { version, requestId });
      setResult(res.data || { success: true });
    } catch (err: any) {
      console.error('Promote error', err);
      setResult({ error: err?.response?.data || 'promote_failed' });
    }
  }

  if (!loading && !hasRole('admin')) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-2">Promote Model</h1>
        <p className="text-sm text-muted-foreground mb-4">You are not authorized to promote models. If you believe this is an error, request access from your administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Promote Model</h1>
      <p className="text-sm text-gray-600 mb-4">Model: {modelId}</p>
      <div className="space-y-3 max-w-xl">
        <div>
          <label className="block text-sm">Version</label>
          <input value={version} onChange={e => setVersion(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm">Retrain Request ID (optional)</label>
          <input value={requestId} onChange={e => setRequestId(e.target.value)} className="border rounded px-2 py-1 w-full" />
          <p className="text-xs text-gray-500">When provided, promotion is allowed only if the retrain request is validated_pass.</p>
        </div>
        <div>
          <label className="block text-sm">Type "PROMOTE" to confirm</label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        <button onClick={promote} className="bg-green-600 text-white px-4 py-2 rounded">Promote</button>
        {result && (<pre className="bg-gray-100 p-3 rounded text-sm mt-4">{JSON.stringify(result, null, 2)}</pre>)}
      </div>
    </div>
  );
}
