'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ResponsiveDataTable } from '@/components/data/responsive-data-table';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';
import { SearchIcon, Plus } from 'lucide-react';

const POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS) || 3000;

export default function UserRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      if (statusFilter) {
        q.set('status', statusFilter);
      }
      if (searchQuery) {
        q.set('search', searchQuery);
      }
      q.set('sortBy', sortBy);
      q.set('sortOrder', sortOrder);

      const path = `/v1/analysis/history?${q.toString()}`;
      const res = await api.get(path);
      const data = res?.data;
      if (Array.isArray(data)) {
        setRuns(data);
        setTotal(null);
      } else {
        setRuns(data?.items || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
      toast?.({ title: 'Failed to load runs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit, statusFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Poll status for running/queued runs
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      if (!mounted) {
        return;
      }
      const active = runs.filter((r) => ['running', 'queued'].includes(r.status));
      if (active.length === 0) {
        return;
      }
      try {
        const updates = await Promise.all(
          active.map((r) => api.get(`/v1/analysis/${r.runId || r.id}/status`)),
        );
        const updatedRuns = runs.slice();
        updates.forEach((u) => {
          const data = u?.data;
          const idx = updatedRuns.findIndex(
            (rr) => rr.runId === data?.runId || rr.id === data?.id,
          );
          if (idx !== -1) {
            updatedRuns[idx] = { ...updatedRuns[idx], ...data };
          }
        });
        setRuns(updatedRuns);
      } catch (e) {
        // ignore poll errors
      }
    }, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [runs]);

  const handleCancel = async (runId: string) => {
    try {
      await api.post(`/v1/analysis/${runId}/cancel`);
      setRuns((prev) =>
        prev.map((r) =>
          r.runId === runId || r.id === runId ? { ...r, status: 'cancelled' } : r,
        ),
      );
      toast?.({ title: 'Run cancelled' });
    } catch (err) {
      console.error('Failed to cancel run', err);
      toast?.({ title: 'Failed to cancel', variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'runId',
      label: 'Run ID',
      sortable: true,
      format: (value: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{value}</code>
      ),
      width: '140px',
    },
    {
      key: 'modelId',
      label: 'Model',
      sortable: true,
      format: (value: string) => value || '—',
    },
    {
      key: 'datasetId',
      label: 'Dataset',
      sortable: true,
      format: (value: string) => value || '—',
    },
    {
      key: 'runType',
      label: 'Type',
      sortable: true,
      format: (value: string) => {
        const typeMap: Record<string, string> = {
          baseline: '📊 Baseline',
          drift: '📈 Drift',
          quick: '⚡ Quick',
        };
        return typeMap[value] || value || '—';
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      format: (value: string) => <StatusBadge status={value} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      format: (value: string) => formatDate(value),
    },
  ];

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="My Analysis Runs"
          subtitle="View and manage your submitted analysis runs"
          onNew={() => {
            window.location.href = '/dashboard/user/run';
          }}
          newLabel="New Run"
        />

        {/* Filters & Search */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search runs by ID, model, or dataset…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={String(limit)}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>

            <Button
              onClick={() => {
                window.location.href = '/dashboard/user/run';
              }}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Run
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center text-muted-foreground">
                  <div className="animate-spin">⏳</div>
                  <span className="ml-2">Loading runs…</span>
                </div>
              </CardContent>
            </Card>
          ) : runs.length === 0 ? (
            <EmptyState
              icon={
                <div className="text-4xl mb-2">📊</div>
              }
              title="No analysis runs yet"
              description={
                searchQuery || statusFilter
                  ? 'Try adjusting your search or filters to find runs'
                  : 'Start your first bias and fairness analysis'
              }
              actionLabel="Create New Run"
              actionOnClick={() => {
                window.location.href = '/dashboard/user/run';
              }}
            />
          ) : (
            <div className="space-y-4">
              <ResponsiveDataTable
                columns={columns}
                data={runs.map((r) => ({
                  runId: r.runId || r.id,
                  modelId: r.modelId || r.model || '—',
                  datasetId: r.datasetId || r.dataset || '—',
                  runType: r.runType || r.type || '—',
                  status: r.status || 'unknown',
                  createdAt: r.createdAt,
                  _raw: r,
                }))}
                loading={loading}
                emptyMessage="No runs found"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={(field) => {
                  if (field === sortBy) {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy(field);
                    setSortOrder('desc');
                  }
                  setPage(1);
                }}
                rowClassName={(row) => {
                  if (['running', 'queued'].includes(row.status)) {
                    return 'hover:bg-blue-50';
                  }
                  return '';
                }}
              />

              {/* Actions Column - Mobile Friendly */}
              {runs.length > 0 && (
                <div className="space-y-2 md:hidden">
                  {runs.map((r) => (
                    <Card key={r.runId || r.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {r.model || r.modelId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(r.createdAt)}
                          </div>
                        </div>
                        <StatusBadge status={r.status} size="sm" />
                      </div>
                      {['queued', 'running'].includes(r.status) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(r.runId || r.id)}
                          className="mt-2 w-full"
                        >
                          Cancel
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Action Buttons - Desktop Only */}
              <div className="hidden md:flex flex-col gap-2">
                {runs
                  .filter((r) => ['queued', 'running'].includes(r.status))
                  .map((r) => (
                    <div
                      key={r.runId || r.id}
                      className="flex items-center justify-end gap-2 p-2 rounded hover:bg-muted"
                    >
                      <span className="text-xs text-muted-foreground">
                        {r.runId || r.id}
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(r.runId || r.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded border bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {total !== null
                    ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total}`
                    : `Showing page ${page} — ${runs.length}`}
                </div>
                <div className="flex gap-2 items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={total !== null && page * limit >= (total || 0)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next →
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
