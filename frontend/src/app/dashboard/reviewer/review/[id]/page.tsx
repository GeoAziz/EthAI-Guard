'use client';
import React, { useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/loading-state';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ReviewerReviewPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/v1/reports/${id}`);
        if (!mounted) return;
        setReport(res?.data);
      } catch (err) {
        console.error('Failed to load report', err);
        toast?.({ title: 'Failed to load report', variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchReport();
    return () => { mounted = false; };
  }, [id, toast]);

  const handleAction = async (action: 'approve' | 'reject' | 'request-changes') => {
    setActionInProgress(true);
    try {
      await api.post(`/v1/reports/${id}/${action}`);
      toast?.({ title: `Report ${action === 'request-changes' ? 'flagged for changes' : action + 'ed'}` });
      // Reload report to reflect new status
      const res = await api.get(`/v1/reports/${id}`);
      setReport(res?.data);
    } catch (err) {
      console.error(`Failed to ${action} report`, err);
      toast?.({ title: `Failed to ${action}`, variant: 'destructive' });
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader 
          title={`Quick Review — Report ${id}`} 
          subtitle="Quickly review and make a decision" 
        />

        <div className="mt-6">
          <LoadingState loading={loading} onRetry={() => window.location.reload()} loadingText="Loading report...">
            {report ? (
              <div className="space-y-4">
              {/* Quick Summary Card */}
              <div className="rounded-lg border bg-white p-4 sm:p-6">
                <h3 className="font-semibold text-sm sm:text-base mb-4">Report Summary</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">Model:</span>
                    <p className="font-medium">{report.modelId || report.model || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dataset:</span>
                    <p className="font-medium">{report.datasetId || report.dataset || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium">{report.status}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{report.reportType || 'Review'}</p>
                  </div>
                </div>
              </div>

              {/* Key Findings */}
              {report.payload || report.data ? (
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <h3 className="font-semibold text-sm sm:text-base mb-3">Key Data</h3>
                  <div className="bg-gray-50 p-3 rounded text-xs font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {JSON.stringify(report.payload || report.data, null, 2).substring(0, 500)}
                    {JSON.stringify(report.payload || report.data || {}).length > 500 ? '...' : ''}
                  </div>
                </div>
              ) : null}

              {/* Recent Notes */}
              {report.comments && report.comments.length > 0 ? (
                <div className="rounded-lg border bg-white p-4 sm:p-6">
                  <h3 className="font-semibold text-sm sm:text-base mb-3">Recent Notes</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {report.comments.slice(-2).map((c: any, i: number) => (
                      <div key={i} className="p-2 bg-muted/30 rounded text-xs">
                        <div className="text-muted-foreground mb-1">{c.author || 'unknown'}</div>
                        <div>{c.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="rounded-lg border bg-white p-4 sm:p-6">
                <h3 className="font-semibold text-sm sm:text-base mb-4">Decision</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="btn btn-success text-xs sm:text-sm px-4 sm:px-6 py-2 w-full sm:w-auto"
                    onClick={() => handleAction('approve')}
                    disabled={actionInProgress}
                    aria-label="Approve this report"
                  >
                    {actionInProgress ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    className="btn text-xs sm:text-sm px-4 sm:px-6 py-2 w-full sm:w-auto border"
                    onClick={() => handleAction('request-changes')}
                    disabled={actionInProgress}
                    aria-label="Request changes to this report"
                  >
                    {actionInProgress ? 'Processing...' : 'Request Changes'}
                  </button>
                  <button
                    className="btn btn-destructive text-xs sm:text-sm px-4 sm:px-6 py-2 w-full sm:w-auto"
                    onClick={() => handleAction('reject')}
                    disabled={actionInProgress}
                    aria-label="Reject this report"
                  >
                    {actionInProgress ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-4 sm:p-6 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground">Report not found</p>
              </div>
            )}
          </LoadingState>
        </div>
      </div>
    </RoleProtected>
  );
}
