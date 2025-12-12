'use client';
import React, { useEffect, useRef, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function RunAnalysisPage() {
  const [modelId, setModelId] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [runType, setRunType] = useState('full');
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (pollingRef.current) {window.clearInterval(pollingRef.current);}
    };
  }, []);

  async function handleStart(e?: React.FormEvent) {
    if (e) {e.preventDefault();}
    setLoading(true);
    try {
      const res = await api.post('/v1/analysis', { modelId, datasetId, runType });
      const rid = res?.data?.runId || res?.data?.id || null;
      if (!rid) {throw new Error('No runId returned');}
      setRunId(rid);
      setStatus('running');
      toast?.({ title: 'Run started', variant: 'default' });

      // start polling interval: configurable via env for tests
      const interval = parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS || '2000', 10);
      pollingRef.current = window.setInterval(async () => {
        try {
          const sres = await api.get(`/v1/analysis/${encodeURIComponent(rid)}/status`);
          const st = sres?.data?.status;
          setStatus(st);
          if (st === 'completed') {
            const ridReport = sres?.data?.reportId || sres?.data?.result?.reportId || null;
            setReportId(ridReport);
            // emit global event so history pages can refresh
            try {
              window.dispatchEvent(new CustomEvent('analysis:runCompleted', { detail: { runId: rid, reportId: ridReport } }));
            } catch (e) {
              // ignore
            }
            toast?.({ title: 'Run completed', variant: 'default' });
            if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          } else if (st === 'failed') {
            toast?.({ title: 'Run failed', variant: 'destructive' });
            if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
          }
        } catch (err) {
          console.error('Polling failed', err);
          toast?.({ title: 'Polling failed', variant: 'destructive' });
          if (pollingRef.current) { window.clearInterval(pollingRef.current); pollingRef.current = null; }
        }
      }, interval) as unknown as number;
    } catch (err) {
      console.error('Failed to start run', err);
      toast?.({ title: 'Failed to start run', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Run analysis" subtitle="Start a new explainability or fairness analysis" />

        <form className="mt-6 rounded-lg border bg-white p-4" onSubmit={handleStart}>
          <div className="grid grid-cols-1 gap-4">
            <label className="block">
              <div className="text-sm font-medium">Model ID</div>
              <input className="mt-1 w-full" value={modelId} onChange={(e) => setModelId(e.target.value)} placeholder="model-id" />
            </label>

            <label className="block">
              <div className="text-sm font-medium">Dataset ID</div>
              <input className="mt-1 w-full" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} placeholder="dataset-id" />
            </label>

            <label className="block">
              <div className="text-sm font-medium">Run type</div>
              <select className="mt-1" value={runType} onChange={(e) => setRunType(e.target.value)}>
                <option value="full">Full</option>
                <option value="quick">Quick</option>
              </select>
            </label>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading} className="px-3 py-1 bg-primary text-white rounded">{loading ? 'Starting…' : 'Start run'}</button>
              {runId && <div className="text-sm text-muted-foreground">Run ID: {runId}</div>}
            </div>

            <div className="mt-2">
              {status === 'running' && <div className="text-sm">Status: running…</div>}
              {status === 'completed' && reportId && (
                <div className="text-sm">Status: completed — <a className="text-primary" href={`/dashboard/analyst/reports/${reportId}`}>View report</a></div>
              )}
              {status === 'failed' && <div className="text-sm text-destructive">Status: failed</div>}
            </div>
          </div>
        </form>
      </div>
    </RoleProtected>
  );
}
