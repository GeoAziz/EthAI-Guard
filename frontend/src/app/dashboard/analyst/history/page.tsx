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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/analysis/history');
      setJobs(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
    } catch (err) {
      console.error('Failed to load analysis history', err);
      toast?.({ title: 'Failed to load job history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
        <PageHeader title="Analysis history" subtitle="Previously executed analysis runs" />

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
      </div>
    </RoleProtected>
  );
}
