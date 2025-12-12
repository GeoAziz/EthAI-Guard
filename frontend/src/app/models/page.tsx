'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

type ModelVersion = {
  modelId: string;
  version: string;
  status: string;
  metadata?: any;
  validation_report?: any;
  promotedBy?: string;
  promotedAt?: string;
  createdAt?: string;
};

export default function ModelsPage() {
  const [modelId, setModelId] = useState('default-model');
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  async function fetchVersions() {
    setLoading(true);
    try {
      const res = await fetch(`${backend}/v1/models/${modelId}/versions`, { cache: 'no-cache' });
      const data = await res.json();
      setVersions(data || []);
    } catch {
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchVersions(); }, []);

  return (
    <RoleProtected required={['analyst', 'admin']}>
      <div className="p-8">
        <Breadcrumbs />
        <PageHeader title="Models" subtitle="Inspect, retrain, and promote model versions" />

        <div className="mb-4 flex gap-2 items-center">
          <label className="text-sm text-gray-600">Model ID</label>
          <input
            value={modelId}
            onChange={e => {
              const val = e.target.value;
              // Only allow alphanumeric, underscore, dash
              if (/^[\w-]+$/.test(val)) {
                setModelId(val);
              }
            }}
            className="border px-2 py-1 rounded"
          />
          <button onClick={fetchVersions} className="bg-blue-600 text-white px-3 py-1 rounded">Refresh</button>
        </div>
        {loading ? <p>Loading…</p> : (
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Version</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Promoted</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map(v => (
                <tr key={v.version} className="border-t">
                  <td className="p-2">{v.version}</td>
                  <td className="p-2">{v.status}</td>
                  <td className="p-2">{v.promotedBy ? `${v.promotedBy} @ ${v.promotedAt}` : '-'}</td>
                  <td className="p-2">
                    <a href={`/models/${modelId}/retrain`} className="text-blue-600 underline mr-3">Retrain</a>
                    {v.status === 'ready_for_promote' && (
                      <a href={`/models/${modelId}/promote?version=${v.version}`} className="text-green-600 underline">Promote</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </RoleProtected>
  );
}
