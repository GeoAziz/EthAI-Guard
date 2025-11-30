'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';

export default function UserReportDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/v1/reports/${id}`);
        if (!mounted) {return;}
        setReport(res?.data);
      } catch (err) {
        console.error('Failed to load report', err);
        toast?.({ title: 'Failed to load report', variant: 'destructive' });
      } finally {
        if (mounted) {setLoading(false);}
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, toast]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/v1/reports/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
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
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={report?.id || `Report ${id}`} subtitle="View report" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && report && (
            <div>
              <div className="mb-4"><strong>Model:</strong> {report.modelId || report.model || '—'}</div>
              <div className="mb-4"><strong>Dataset:</strong> {report.datasetId || report.dataset || '—'}</div>
              <div className="mb-4"><strong>Status:</strong> {report.status}</div>
              <div className="mb-4"><strong>Created:</strong> {formatDate(report.createdAt)}</div>

              <div className="mb-4">
                <h3 className="font-medium">Report</h3>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{JSON.stringify(report.payload || report.data || {}, null, 2)}</pre>
              </div>

              <div className="flex gap-2 mt-4">
                <button className="btn" onClick={handleExport}>Export</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
