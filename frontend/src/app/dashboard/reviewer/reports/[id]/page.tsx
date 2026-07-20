'use client';
import React, { useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/loading-state';
import { useRouter } from 'next/navigation';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';

interface Props {
  params: { id: string };
}

export default function ReviewerReportDetail({ params }: Props) {
  const { id } = params;
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchReport = async () => {
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
    fetchReport();
    return () => { mounted = false; };
  }, [id, toast]);

  const handleComment = async () => {
    if (!comment.trim()) {return;}
    try {
      await api.post(`/v1/reports/${id}/comment`, { text: comment });
      toast?.({ title: 'Comment posted' });
      setComment('');
      // reload
      const res = await api.get(`/v1/reports/${id}`);
      setReport(res?.data);
    } catch (err) {
      console.error('Failed to post comment', err);
      toast?.({ title: 'Failed to post comment', variant: 'destructive' });
    }
  };

  const handleCommentKeydown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleComment();
    }
  };

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={report?.id || `Report ${id}`} subtitle="Review report and leave feedback" />

        <div className="mt-6">
          <LoadingState loading={loading} onRetry={() => window.location.reload()} loadingText="Loading report...">
            {report ? (
              <div className="space-y-6">
              <div className="rounded-lg border bg-white p-4 sm:p-6 animate-in fade-in slide-in-from-left-2 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <strong className="text-xs sm:text-sm">Model:</strong>
                    <p className="text-xs sm:text-sm text-muted-foreground">{report.modelId || report.model || '—'}</p>
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm">Dataset:</strong>
                    <p className="text-xs sm:text-sm text-muted-foreground">{report.datasetId || report.dataset || '—'}</p>
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm">Status:</strong>
                    <p className="text-xs sm:text-sm text-muted-foreground">{report.status}</p>
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm">Created:</strong>
                    <p className="text-xs sm:text-sm text-muted-foreground">{formatDate(report.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-medium text-sm sm:text-base mb-3">Details</h3>
                  <div className="overflow-x-auto bg-gray-50 p-3 sm:p-4 rounded text-xs sm:text-sm font-mono whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {JSON.stringify(report.payload || report.data || {}, null, 2)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 sm:p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-100">
                <h3 className="font-medium text-sm sm:text-base mb-3">Comments</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {(report.comments || []).length === 0 ? (
                    <div className="text-xs sm:text-sm text-muted-foreground">No comments yet</div>
                  ) : (
                    (report.comments || []).map((c: any, i: number) => (
                      <div key={i} className="p-3 border rounded bg-muted/30 animate-in fade-in duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {c.author || 'unknown'} — {formatDate(c.createdAt)}
                        </div>
                        <div className="text-xs sm:text-sm">{c.text}</div>
                      </div>
                    ))
                  )}
                </div>

              <div className="border-t pt-4">
                  <label htmlFor="comment-input" className="block text-xs sm:text-sm font-medium mb-2">
                    Add comment
                  </label>
                  <textarea
                    id="comment-input"
                    className="w-full p-2 border rounded text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={handleCommentKeydown}
                    placeholder="Share your feedback or notes... (Ctrl+Enter to submit)"
                    rows={3}
                  />
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <button
                      className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2"
                      onClick={handleComment}
                      aria-label="Post comment"
                    >
                      Post comment
                    </button>
                    <button
                      className="btn text-xs sm:text-sm px-3 sm:px-4 py-2"
                      onClick={() => setComment('')}
                      aria-label="Clear comment"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-4 sm:p-6 animate-in fade-in slide-in-from-left-2 duration-500 delay-200">
                <h3 className="font-medium text-sm sm:text-base mb-4">Action</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="btn btn-success text-xs sm:text-sm px-3 sm:px-6 py-2 w-full sm:w-auto hover:scale-105 transition-transform duration-200"
                    onClick={() => handleAction('approve')}
                    aria-label="Approve report"
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-destructive text-xs sm:text-sm px-3 sm:px-6 py-2 w-full sm:w-auto hover:scale-105 transition-transform duration-200"
                    onClick={() => handleAction('reject')}
                    aria-label="Reject report"
                  >
                    Reject
                  </button>
                </div>
              </div>
              </div>
            ) : null}
          </LoadingState>
        </div>
      </div>
    </RoleProtected>
  );
}
