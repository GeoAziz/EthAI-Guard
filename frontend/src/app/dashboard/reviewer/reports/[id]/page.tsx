'use client';
import React, { useEffect, useState } from 'react';
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

  const handleAction = async (action: 'approve' | 'reject') => {
    try {
      await api.post(`/v1/reports/${id}/${action}`);
      toast?.({ title: `Report ${action}ed` });
      // after action, callers may navigate; we just show toast
    } catch (err) {
      console.error(`Failed to ${action} report`, err);
      toast?.({ title: `Failed to ${action}`, variant: 'destructive' });
    }
  };

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={report?.id || `Report ${id}`} subtitle="Review report and leave feedback" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && report && (
            <div>
              <div className="mb-4">
                <strong>Model:</strong> {report.modelId || report.model || '—'}
              </div>
              <div className="mb-4">
                <strong>Dataset:</strong> {report.datasetId || report.dataset || '—'}
              </div>
              <div className="mb-4">
                <strong>Status:</strong> {report.status}
              </div>
              <div className="mb-4">
                <strong>Created:</strong> {formatDate(report.createdAt)}
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Details</h3>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{JSON.stringify(report.payload || report.data || {}, null, 2)}</pre>
              </div>

              <div className="mb-4">
                <h3 className="font-medium">Comments</h3>
                <div className="space-y-2">
                  {(report.comments || []).map((c: any, i: number) => (
                    <div key={i} className="p-2 border rounded">
                      <div className="text-xs text-muted-foreground">{c.author || 'unknown'} — {formatDate(c.createdAt)}</div>
                      <div className="text-sm">{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <textarea className="w-full p-2 border rounded" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment" />
                <div className="mt-2 flex gap-2">
                  <button className="btn btn-primary" onClick={handleComment}>Post comment</button>
                  <button className="btn" onClick={() => setComment('')}>Clear</button>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn btn-success" onClick={() => handleAction('approve')}>Approve</button>
                <button className="btn btn-destructive" onClick={() => handleAction('reject')}>Reject</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
