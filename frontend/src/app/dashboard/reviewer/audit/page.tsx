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

export default function ReviewerAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      const path = `/v1/audit?${q.toString()}`;
      const res = await api.get(path);
      const data = res?.data;
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(null);
      } else {
        setLogs(data?.items || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load audit logs', err);
      setError('Failed to load audit logs. Please try again.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <PageHeader title="Audit Log Viewer" subtitle="Read-only audit logs for reviewers" />
          <div className="flex gap-2 items-center flex-wrap">
            <ExportButton
              data={logs}
              filename={`audit-logs-${new Date().toISOString().split('T')[0]}`}
              columns={[
                { label: 'Timestamp', key: 'timestamp' },
                { label: 'Actor', key: 'actor' },
                { label: 'Event', key: 'event' },
                { label: 'Details', key: 'details' },
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
            title="Failed to load audit logs"
            message={error}
            onRetry={fetchLogs}
            icon="📋"
          />
        ) : (
          <div className="mt-6 animate-in fade-in duration-500">
            <PaginatedResponsiveTable
              columns={[
                { key: 'timestamp', label: 'Timestamp', render: (val, row) => row.timestamp || row.createdAt || '—' },
                { key: 'actor', label: 'Actor', hidden: 'mobile', render: (val, row) => row.actor || row.userId || '—' },
                { key: 'event', label: 'Event', hidden: 'tablet', render: (val, row) => row.event || row.action || '—' },
                {
                  key: 'details',
                  label: 'Details',
                  render: (val, row) => {
                    const details = row.details || row.description || '—';
                    return typeof details === 'string' && details.length > 100
                      ? `${details.substring(0, 100)}...`
                      : details;
                  },
                },
              ]}
              data={logs}
              loading={loading}
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={setLimit}
              emptyMessage="No audit logs found"
            />
          </div>
        )}
      </div>
    </RoleProtected>
  );
}
}
