'use client';
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import formatDate from '@/lib/formatDate';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus } from 'lucide-react';

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
          {loading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && jobs.length === 0 && (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No analysis runs yet</h3>
              <p className="text-sm text-muted-foreground mb-6">Start an analysis to track the history of your fairness and explainability runs.</p>
              <Link href="/dashboard/analyst/run">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Start analysis
                </Button>
              </Link>
            </div>
          )}
          {!loading && jobs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium">Run ID</th>
                    <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Model</th>
                    <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Dataset</th>
                    <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Run Type</th>
                    <th className="text-left py-3 px-3 font-medium">Status</th>
                    <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Created</th>
                    <th className="text-left py-3 px-3 font-medium hidden xl:table-cell">Completed</th>
                    <th className="text-right py-3 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <HistoryRow key={j.runId || j.id} job={j} />
                  ))}
                </tbody>
              </table>
            </div>
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

function HistoryRow({ job }: { job: any }) {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'completed';
      case 'running':
        return 'running';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  };

  const handleViewReport = () => {
    if (job.status === 'completed' && job.reportId) {
      window.location.href = `/dashboard/analyst/reports/${job.reportId}`;
      setShowMenu(false);
    }
  };

  const handleDownloadResults = () => {
    toast?.({ title: 'Download started', description: 'Downloading analysis results…' });
    setShowMenu(false);
  };

  const handleRetry = () => {
    toast?.({ title: 'Retry started', description: 'Restarting this analysis run…' });
    setShowMenu(false);
  };

  return (
    <tr className="border-b group hover:bg-muted/50 transition-colors duration-200">
      <td className="py-3 px-3">{job.runId || job.id}</td>
      <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground">{job.modelId || job.model || '—'}</td>
      <td className="py-3 px-3 hidden md:table-cell text-muted-foreground">{job.datasetId || job.dataset || '—'}</td>
      <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">{job.runType || job.type || '—'}</td>
      <td className="py-3 px-3">
        <Badge variant={getStatusVariant(job.status) as any}>
          {job.status || 'unknown'}
        </Badge>
      </td>
      <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground text-xs">{formatDate(job.createdAt)}</td>
      <td className="py-3 px-3 hidden xl:table-cell text-muted-foreground text-xs">{job.completedAt ? formatDate(job.completedAt) : '—'}</td>
      <td className="py-3 px-3 text-right relative">
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded relative z-10"
          onClick={() => setShowMenu(!showMenu)}
          title="More actions"
        >
          ⋮
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-md z-20 min-w-[150px]">
            {job.status === 'completed' && job.reportId && (
              <button
                onClick={handleViewReport}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
              >
                View report
              </button>
            )}
            <button
              onClick={handleDownloadResults}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
            >
              Download results
            </button>
            {(job.status === 'failed' || job.status === 'pending') && (
              <button
                onClick={handleRetry}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
              >
                Retry run
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
