'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { FileText, Plus } from 'lucide-react';

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

function ReportTableRow({ report, onExport }: { report: any; onExport: () => void }) {
  const [showMenu, setShowMenu] = React.useState(false);

  return (
    <tr className="border-b hover:bg-muted/60 transition-colors duration-200 ease-out group">
      <td className="py-3 px-3 truncate font-medium text-sm">{report.name || report.title || report.id}</td>
      <td className="py-3 px-3 hidden sm:table-cell text-sm">{report.type || report.reportType || '—'}</td>
      <td className="py-3 px-3 hidden md:table-cell truncate text-sm">{report.modelId || report.model || '—'}</td>
      <td className="py-3 px-3 hidden lg:table-cell text-sm">{report.createdAt ? new Date(report.createdAt).toISOString().slice(0,10) : '—'}</td>
      <td className="py-3 px-3 text-sm">
        <Badge variant={String(computeBiasSeverity(report)).toLowerCase() as any}>
          {String(computeBiasSeverity(report))}
        </Badge>
      </td>
      <td className="py-3 px-3 hidden md:table-cell text-sm">{computeDriftScore(report) ?? '—'}</td>
      <td className="py-3 px-3 text-right relative">
        <div className="flex gap-2 justify-end items-center">
          <a 
            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors opacity-0 group-hover:opacity-100" 
            href={`/dashboard/analyst/reports/${report.id}`}
          >
            View
          </a>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            title="More actions"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-max">
              <a
                href={`/dashboard/analyst/reports/${report.id}`}
                className="block px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                Open report
              </a>
              <button
                onClick={() => { onExport(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                Download CSV
              </button>
              <hr className="my-1" />
              <button
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setShowMenu(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
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
          {loading && <div className="p-8 text-center text-sm text-muted-foreground">Loading reports…</div>}
          {!loading && reports.length === 0 && (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No reports yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Run an analysis to generate your first report and track model performance over time.</p>
              <Link href="/dashboard/analyst/run">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Start your first analysis
                </Button>
              </Link>
            </div>
          )}
          {!loading && reports.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium">Report</th>
                    <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Type</th>
                    <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Model</th>
                    <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Date</th>
                    <th className="text-left py-3 px-3 font-medium">Bias Severity</th>
                    <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Drift Score</th>
                    <th className="text-right py-3 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <ReportTableRow key={r.id} report={r} onExport={() => handleExport(r)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
