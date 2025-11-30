'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';

const POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 3000;

export default function UserRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      if (statusFilter) { q.set('status', statusFilter); }
      const path = `/v1/analysis/history?${q.toString()}`;
      const res = await api.get(path);
      const data = res?.data;
      if (Array.isArray(data)) {
        setRuns(data);
        setTotal(null);
      } else {
        setRuns(data?.items || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
      toast?.({ title: 'Failed to load runs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit, statusFilter]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Poll status for running/queued runs
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      if (!mounted) {return;}
      const active = runs.filter((r) => ['running', 'queued'].includes(r.status));
      if (active.length === 0) {return;}
      try {
        // poll each active run
        const updates = await Promise.all(active.map((r) => api.get(`/v1/analysis/${r.runId || r.id}/status`)));
        const updatedRuns = runs.slice();
        updates.forEach((u) => {
          const data = u?.data;
          const idx = updatedRuns.findIndex((rr) => rr.runId === data?.runId || rr.id === data?.id);
          if (idx !== -1) {updatedRuns[idx] = { ...updatedRuns[idx], ...data };}
        });
        setRuns(updatedRuns);
      } catch (e) {
        // ignore poll errors
      }
    }, POLL_INTERVAL);
    return () => { mounted = false; clearInterval(interval); };
  }, [runs]);

  const handleNew = async (payload: { modelId: string; datasetId: string; runType: string }) => {
    setSubmitting(true);
    try {
      const res = await api.post('/v1/analysis', payload);
      const run = res?.data || { runId: res?.data?.id || `tmp-${Date.now()}`, status: 'queued', ...payload, createdAt: new Date().toISOString() };
      // optimistic add
      setRuns((prev) => [run, ...prev]);
      toast?.({ title: 'Run queued' });
      setShowNew(false);
    } catch (err) {
      console.error('Failed to start run', err);
      toast?.({ title: 'Failed to start run', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (runId: string) => {
    try {
      await api.post(`/v1/analysis/${runId}/cancel`);
      setRuns((prev) => prev.map((r) => (r.runId === runId || r.id === runId ? { ...r, status: 'cancelled' } : r)));
      toast?.({ title: 'Run cancelled' });
    } catch (err) {
      console.error('Failed to cancel run', err);
      toast?.({ title: 'Failed to cancel', variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="My runs" subtitle="Your submitted analysis runs" />

        <div className="mt-6 mb-4 flex justify-end">
          <div className="flex gap-2 items-center">
            <label htmlFor="status-select" className="text-sm">Status:</label>
            <select id="status-select" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="border p-1 rounded text-sm">
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <label htmlFor="page-size-select" className="text-sm">Page size:</label>
            <select id="page-size-select" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>Request analysis</button>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && runs.length === 0 && <div className="text-sm text-muted-foreground">No runs found</div>}
          {!loading && runs.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Run ID</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Dataset</th>
                  <th className="py-2">Run Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.runId || r.id} className="border-b">
                    <td className="py-2">{r.runId || r.id}</td>
                    <td className="py-2">{r.modelId || r.model || '—'}</td>
                    <td className="py-2">{r.datasetId || r.dataset || '—'}</td>
                    <td className="py-2">{r.runType || r.type || '—'}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{formatDate(r.createdAt)}</td>
                    <td className="py-2">
                      {['queued','running'].includes(r.status) && (
                        <button className="text-destructive" onClick={() => handleCancel(r.runId || r.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total !== null ? `Showing page ${page} — ${runs.length} of ${total}` : `Showing page ${page} — ${runs.length}`}
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

        {showNew && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black/40">
            <div className="bg-white p-6 rounded w-full max-w-md">
              <h3 className="text-lg font-medium mb-4">Request analysis</h3>
              <RequestForm onSubmit={handleNew} submitting={submitting} onCancel={() => setShowNew(false)} />
            </div>
          </div>
        )}
      </div>
    </RoleProtected>
  );
}

function RequestForm({ onSubmit, submitting, onCancel }: any) {
  const [modelId, setModelId] = useState('m1');
  const [datasetId, setDatasetId] = useState('d1');
  const [runType, setRunType] = useState('baseline');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ modelId, datasetId, runType }); }}>
      <div className="mb-3">
        <label htmlFor="model-input" className="block text-sm">Model</label>
        <input id="model-input" value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full border p-2 rounded" />
      </div>
      <div className="mb-3">
        <label htmlFor="dataset-input" className="block text-sm">Dataset</label>
        <input id="dataset-input" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} className="w-full border p-2 rounded" />
      </div>
      <div className="mb-3">
        <label htmlFor="runtype-select" className="block text-sm">Run type</label>
        <select id="runtype-select" value={runType} onChange={(e) => setRunType(e.target.value)} className="w-full border p-2 rounded">
          <option value="baseline">Baseline</option>
          <option value="drift">Drift</option>
          <option value="quick">Quick</option>
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn">Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Start'}</button>
      </div>
    </form>
  );
}
