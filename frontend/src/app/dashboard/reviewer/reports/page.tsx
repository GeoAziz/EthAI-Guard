'use client';
import React, { useCallback, useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import formatDate from '@/lib/formatDate';

export default function ReviewerReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      q.set('role', 'reviewer');
      const path = `/v1/reports?${q.toString()}`;
      const res = await api.get(path);
      const data = res?.data;
      if (Array.isArray(data)) {
        setReports(data);
        setTotal(null);
      } else {
        setReports(data?.items || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load reviewer reports', err);
      toast?.({ title: 'Failed to load reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex justify-between items-center">
          <PageHeader title="Reviewer inbox" subtitle="Reports assigned to you for review" />
          <div className="flex gap-2 items-center">
            <label htmlFor="reviewer-page-size-select" className="text-sm">Page size:</label>
            <select id="reviewer-page-size-select" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && reports.length === 0 && <div className="text-sm text-muted-foreground">No reports assigned</div>}
          {!loading && reports.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Report ID</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Dataset</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id || r.reportId} className="border-b">
                    <td className="py-2">{r.id || r.reportId}</td>
                    <td className="py-2">{r.modelId || r.model || '—'}</td>
                    <td className="py-2">{r.datasetId || r.dataset || '—'}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{formatDate(r.createdAt)}</td>
                    <td className="py-2"><Link className="text-primary" href={`/dashboard/reviewer/reports/${r.id || r.reportId}`}>View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total !== null ? `Showing page ${page} — ${reports.length} of ${total}` : `Showing page ${page} — ${reports.length}`}
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
