'use client';
import React, { useCallback, useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import PaginatedResponsiveTable from '@/components/common/PaginatedResponsiveTable';
import { ExportButton } from '@/components/ui/export-button';
import { ErrorState } from '@/components/ui/error-state';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import formatDate from '@/lib/formatDate';

export default function ReviewerReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      q.set('role', 'reviewer');
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
      console.error('Failed to load reviewer reports', err);
      setError('Failed to load reports. Please try again.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <PageHeader title="Reviewer inbox" subtitle="Reports assigned to you for review" />
          <div className="flex gap-2 items-center flex-wrap">
            <ExportButton
              data={reports}
              filename={`reports-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { label: 'Report ID', key: 'id' },
                { label: 'Model', key: 'modelId' },
                { label: 'Dataset', key: 'datasetId' },
                { label: 'Status', key: 'status' },
                { label: 'Created', key: 'createdAt' },
              ]}
              formats={['csv', 'json']}
            />
            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border p-1 sm:p-2 rounded text-xs sm:text-sm"
            >
              <option value="5">5/page</option>
              <option value="10">10/page</option>
              <option value="20">20/page</option>
              <option value="50">50/page</option>
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState
            title="Failed to load reports"
            message={error}
            onRetry={fetchReports}
            icon="📋"
          />
        ) : (
          <div className="mt-6 animate-in fade-in duration-500">
            <PaginatedResponsiveTable
              columns={[
                { key: 'id', label: 'Report ID' },
                { key: 'model', label: 'Model', hidden: 'mobile', render: (val, row) => row.modelId || row.model || '—' },
                { key: 'dataset', label: 'Dataset', hidden: 'mobile', render: (val, row) => row.datasetId || row.dataset || '—' },
                { key: 'status', label: 'Status' },
                { key: 'createdAt', label: 'Created', render: (val) => formatDate(val) },
                {
                  key: 'action',
                  label: 'Action',
                  render: (_, row) => (
                    <Link className="text-primary hover:underline text-xs sm:text-sm font-medium" href={`/dashboard/reviewer/reports/${row.id || row.reportId}`}>
                      View
                    </Link>
                  ),
                },
              ]}
              data={reports}
              loading={loading}
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={setLimit}
              emptyMessage="No reports assigned"
            />
          </div>
        )}
      </div>
    </RoleProtected>
  );
}
