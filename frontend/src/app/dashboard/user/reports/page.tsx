'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';

export default function UserReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        q.set('userId', 'me');
        q.set('page', String(page));
        q.set('limit', String(limit));
        const path = `/v1/reports?${q.toString()}`;
        const res = await api.get(path);
        if (!mounted) {return;}
        const data = res?.data;
        if (Array.isArray(data)) {
          setReports(data);
          setTotal(null);
        } else {
          setReports(data?.items || []);
          setTotal(typeof data?.total === 'number' ? data.total : null);
        }
      } catch (err) {
        console.error('Failed to load user reports', err);
        toast?.({ title: 'Failed to load reports', variant: 'destructive' });
      } finally {
        if (mounted) {setLoading(false);}
      }
    };
    load();
    return () => { mounted = false; };
  }, [toast, page, limit]);

  const handleExport = async (id: string) => {
    try {
      const res = await api.get(`/v1/reports/${id}/export`, { responseType: 'blob' });
      const blob = res?.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export report', err);
      toast?.({ title: 'Failed to export', variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="My reports" subtitle="Reports you can view" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && reports.length === 0 && <div className="text-sm text-muted-foreground">No reports available</div>}
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
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.id}</td>
                    <td className="py-2">{r.modelId || r.model || '—'}</td>
                    <td className="py-2">{r.datasetId || r.dataset || '—'}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{formatDate(r.createdAt)}</td>
                    <td className="py-2">
                      <a className="text-primary mr-3" href={`/dashboard/user/reports/${r.id}`}>View</a>
                      <button onClick={() => handleExport(r.id)} className="text-muted">Export</button>
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
                {total !== null ? `Showing page ${page} — ${reports.length} of ${total}` : `Showing page ${page} — ${reports.length}`}
              </div>
              <div className="flex gap-2">
                <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                <button className="btn" disabled={total !== null && page * limit >= (total || 0)} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
      </div>
    </RoleProtected>
  );
}
