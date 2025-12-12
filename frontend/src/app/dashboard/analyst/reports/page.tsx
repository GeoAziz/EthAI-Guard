'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function computeBiasSeverity(report: any) {
  // If backend provides biasSeverity, use it. Otherwise heuristically compute from groups.
  if (report?.biasSeverity !== undefined) {return report.biasSeverity;}
  if (!report?.metrics) {return 'unknown';}
  const di = report.metrics?.DI ?? 1;
  if (di < 0.8) {return 'high';}
  if (di < 0.95) {return 'medium';}
  return 'low';
}

function computeDriftScore(report: any) {
  if (report?.driftScore !== undefined) {return report.driftScore;}
  // Simple heuristic: average of feature drift values if present
  const drifts = report?.featureDrift?.map((f: any) => f.drift) || [];
  if (drifts.length === 0) {return null;}
  const avg = drifts.reduce((s: number, v: number) => s + v, 0) / drifts.length;
  return Number(avg.toFixed(2));
}

export default function AnalystReportsPage() {
  const [reports, setReports] = useState<Array<any>>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      q.set('role', 'analyst');
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
      console.error('Failed to load analyst reports', err);
      toast?.({ title: 'Failed to load reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleExport(r: any) {
    try {
      const resp = await api.get(`/v1/reports/${r.id}/export`, { responseType: 'blob' as any });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename || `${r.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast?.({ title: 'Export started', variant: 'default' });
    } catch (err) {
      console.error('Export failed', err);
      toast?.({ title: 'Export failed', variant: 'destructive' });
    }
  }

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Analyst reports" subtitle="Saved explainability & fairness analyses" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && reports.length === 0 && <div className="text-sm text-muted-foreground">No reports found</div>}
          {!loading && reports.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Report</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Bias Severity</th>
                  <th className="py-2">Drift Score</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.name || r.title || r.id}</td>
                    <td className="py-2">{r.type || r.reportType || '—'}</td>
                    <td className="py-2">{r.modelId || r.model || '—'}</td>
                    <td className="py-2">{r.createdAt ? new Date(r.createdAt).toISOString().slice(0,10) : '—'}</td>
                    <td className="py-2">{String(computeBiasSeverity(r))}</td>
                    <td className="py-2">{computeDriftScore(r) ?? '—'}</td>
                    <td className="py-2">
                      <a className="text-sm text-primary mr-3" href={`/dashboard/analyst/reports/${r.id}`}>View</a>
                      <button onClick={() => handleExport(r)} className="text-sm text-primary">Export</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
