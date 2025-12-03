'use client';
import React, { useEffect, useState, useCallback } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import formatDate from '@/lib/formatDate';
import { useToast } from '@/hooks/use-toast';

export default function AnalysisHistoryPage() {
  const [jobs, setJobs] = useState<Array<any>>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      const path = `/v1/analysis/history?${q.toString()}`;
      const res = await api.get(path);
      const data = res?.data;
      if (Array.isArray(data)) {
        setJobs(data);
        setTotal(null);
      } else {
        setJobs(data?.items || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load analysis history', err);
      toast?.({ title: 'Failed to load job history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    function onComplete(e: any) {
      // refresh history when a run completes
      fetchHistory();
    }
    window.addEventListener('analysis:runCompleted', onComplete as EventListener);
    return () => window.removeEventListener('analysis:runCompleted', onComplete as EventListener);
  }, [fetchHistory]);

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex justify-between items-center">
          <PageHeader title="Analysis history" subtitle="Previously executed analysis runs" />
          <div className="flex gap-2 items-center">
            <label htmlFor="analyst-history-page-size-select" className="text-sm">Page size:</label>
            <select id="analyst-history-page-size-select" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && jobs.length === 0 && <div className="text-sm text-muted-foreground">No runs found</div>}
          {!loading && jobs.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Run ID</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Dataset</th>
                  <th className="py-2">Run Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Completed</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.runId || j.id} className="border-b">
                    <td className="py-2">{j.runId || j.id}</td>
                    <td className="py-2">{j.modelId || j.model || '—'}</td>
                    <td className="py-2">{j.datasetId || j.dataset || '—'}</td>
                    <td className="py-2">{j.runType || j.type || '—'}</td>
                    <td className="py-2">{j.status}</td>
                    <td className="py-2">{formatDate(j.createdAt)}</td>
                    <td className="py-2">{formatDate(j.completedAt)}</td>
                    <td className="py-2">{j.status === 'completed' && j.reportId ? <a className="text-primary" href={`/dashboard/analyst/reports/${j.reportId}`}>View report</a> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total !== null ? `Showing page ${page} — ${jobs.length} of ${total}` : `Showing page ${page} — ${jobs.length}`}
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
