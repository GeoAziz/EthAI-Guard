'use client';
import React, { useState } from 'react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

type Props = {
  onCreated: (datasetId: string) => void;
  onClose: () => void;
};

export default function CreateDatasetModal({ onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | 0 | 7 | 30 | 90 | 365>(0);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) {return setError('Name is required');}
    setCreating(true);
    setError(null);
    try {
      const body: any = { name };
      if (retentionDays && retentionDays !== 0) {body.retention_days = retentionDays;}
      const resp = await api.post('/v1/datasets', body);
      const datasetId = resp.data?.datasetId || resp.data?.id;
      if (datasetId) {onCreated(datasetId);}
    } catch (err: any) {
      setError(err?.response?.data?.error || 'create_failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog defaultOpen onOpenChange={(o) => { if (!o) {onClose();} }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create dataset</DialogTitle>
          <DialogDescription>Create a new dataset record and set a default retention.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm">Name</label>
            <input data-autofocus value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label htmlFor="create-retention" className="block text-sm">Retention</label>
            <select id="create-retention" value={String(retentionDays)} onChange={e => setRetentionDays(Number(e.target.value) as any)} className="border rounded px-2 py-1">
              <option value="0">Keep forever</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
            </select>
            <div className="text-xs text-muted-foreground mt-1">Default retention for versions created under this dataset.</div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => onClose()} className="px-3 py-1 border rounded">Cancel</button>
            <button type="submit" disabled={creating} className="px-3 py-1 bg-primary text-white rounded">
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
