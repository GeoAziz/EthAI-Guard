'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

function computeBiasSeverity(report: any) {
  if (report?.biasSeverity !== undefined) {return report.biasSeverity;}
  if (!report?.metrics) {return 'unknown';}
  const di = report.metrics?.DI ?? 1;
  if (di < 0.8) {return 'high';}
  if (di < 0.95) {return 'medium';}
  return 'low';
}

function computeDriftScore(report: any) {
  if (report?.driftScore !== undefined) {return report.driftScore;}
  const drifts = report?.featureDrift?.map((f: any) => f.drift) || [];
  if (drifts.length === 0) {return null;}
  const avg = drifts.reduce((s: number, v: number) => s + v, 0) / drifts.length;
  return Number(avg.toFixed(2));
}

export default function AnalystReportDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get(`/v1/reports/${encodeURIComponent(id)}`)
      .then(res => { if (!mounted) {return;} setReport(res.data); })
      .catch(err => { console.error('Failed to load report', err); toast?.({ title: 'Failed to load report', variant: 'destructive' }); })
      .finally(() => { if (mounted) {setLoading(false);} });
    return () => { mounted = false; };
  }, [id]);

  async function handleExport() {
    try {
      const resp = await api.get(`/v1/reports/${encodeURIComponent(id)}/export`, { responseType: 'blob' as any });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = report?.filename || `${id}.csv`;
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
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={`Report ${id}`} subtitle="Report details" />
        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading report…</div>}
          {!loading && !report && <div className="text-sm text-muted-foreground">Report not found</div>}
          {!loading && report && (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium">{report.name || report.title || id}</h2>
                  <div className="text-sm text-muted-foreground">Model: {report.modelId || report.model || '—'}</div>
                </div>
                <div>
                  <button onClick={handleExport} className="px-3 py-1 bg-primary text-white rounded">Export</button>
                </div>
              </div>

              <div>
                <h3 className="font-medium">Bias Severity</h3>
                <div className="text-sm">{String(computeBiasSeverity(report))}</div>
              </div>

              <div>
                <h3 className="font-medium">Drift Score</h3>
                <div className="text-sm">{computeDriftScore(report) ?? '—'}</div>
              </div>

              <div>
                <h3 className="font-medium">Raw payload</h3>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(report, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
