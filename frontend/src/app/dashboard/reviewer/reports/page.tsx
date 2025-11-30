'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import formatDate from '@/lib/formatDate';

export default function ReviewerReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await api.get('/v1/reports?role=reviewer');
        if (!mounted) {return;}
        setReports(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
      } catch (err) {
        console.error('Failed to load reviewer reports', err);
        toast?.({ title: 'Failed to load reports', variant: 'destructive' });
      } finally {
        if (mounted) {setLoading(false);}
      }
    };
    fetchReports();
    return () => { mounted = false; };
  }, [toast]);

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Reviewer inbox" subtitle="Reports assigned to you for review" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && reports.length === 0 && <div className="text-sm text-muted-foreground">No reports assigned</div>}
          {!loading && reports.length > 0 && (
            <table className="w-full text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Report ID</th>
                  <th className="py-2">Model</th>
                  <th className="py-2">Dataset</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id || r.reportId} className="border-b">
                    <td className="py-2">{r.id || r.reportId}</td>
                    <td className="py-2">{r.modelId || r.model || '—'}</td>
                    <td className="py-2">{r.datasetId || r.dataset || '—'}</td>
                    <td className="py-2">{r.status}</td>
                    <td className="py-2">{formatDate(r.createdAt)}</td>
                    <td className="py-2"><Link className="text-primary" href={`/dashboard/reviewer/reports/${r.id || r.reportId}`}>View</Link></td>
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
