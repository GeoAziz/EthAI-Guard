'use client';
import React, { useCallback, useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type ModelRow = {
  id: string;
  name?: string;
  version?: string;
  active?: boolean;
  createdAt?: string;
};

export default function AnalystModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      const res = await api.get(`/v1/models?${q.toString()}`);
      const data = res?.data;
      if (Array.isArray(data)) {
        setModels(data as any);
        setTotal(null);
      } else {
        setModels((data?.items as any[]) || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load models', err);
      toast?.({ title: 'Failed to load models', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex justify-between items-center">
          <PageHeader title="Models registry" subtitle="Registered models and versions" />
          <div className="flex gap-2 items-center">
            <label htmlFor="analyst-models-page-size-select" className="text-sm">Page size:</label>
            <select id="analyst-models-page-size-select" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && models.length === 0 && <div className="text-sm text-muted-foreground">No models found</div>}
          {!loading && models.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Model</th>
                  <th className="py-2">Version</th>
                  <th className="py-2">Active</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-2">{m.name || m.id}</td>
                    <td className="py-2">{m.version || '—'}</td>
                    <td className="py-2">{m.active ? 'yes' : 'no'}</td>
                    <td className="py-2">{m.createdAt ? new Date(m.createdAt).toISOString().slice(0,10) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total !== null ? `Showing page ${page} — ${models.length} of ${total}` : `Showing page ${page} — ${models.length}`}
          </div>
          <div className="flex gap-2 items-center">
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className="btn" disabled={total !== null && page * limit >= (total || 0)} onClick={() => setPage((p) => p + 1)}>Next</button>
            {total !== null && (
              <div className="flex gap-1 items-center ml-2">
                {Array.from({ length: Math.max(1, Math.ceil(total / limit)) }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`btn ${n === page ? 'btn-active' : ''}`} onClick={() => setPage(n)} disabled={n === page}>{String(n)}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
