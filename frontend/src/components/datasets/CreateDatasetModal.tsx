"use client";
import React, { useState } from 'react';
import api from '@/lib/api';

type Props = {
  onCreated: (datasetId: string) => void;
  onClose: () => void;
};

export default function CreateDatasetModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return setError('Name is required');
    setCreating(true);
    setError(null);
    try {
      const resp = await api.post('/v1/datasets', { name });
      const datasetId = resp.data?.datasetId || resp.data?.id;
      if (datasetId) onCreated(datasetId);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'create_failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-4 border rounded bg-white max-w-md">
      <h3 className="font-medium mb-2">Create dataset</h3>
      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <label className="block text-sm">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" disabled={creating} className="px-3 py-1 bg-primary text-white rounded">
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
