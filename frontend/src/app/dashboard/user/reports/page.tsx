'use client';
import React, { useEffect, useState } from 'react';
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
import { SearchIcon, Download, Eye } from 'lucide-react';

export default function UserReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        q.set('userId', 'me');
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

        const path = `/v1/reports?${q.toString()}`;
        const res = await api.get(path);
        if (!mounted) {
          return;
        }
        const data = res?.data;
        if (Array.isArray(data)) {
          setReports(data);
          setTotal(null);
        } else {
          setReports(data?.items || []);
          setTotal(typeof data?.total === 'number' ? data.total : null);
        }
      } catch (err) {
        console.error('Failed to load user reports', err);
        toast?.({ title: 'Failed to load reports', variant: 'destructive' });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [toast, page, limit, statusFilter, searchQuery, sortBy, sortOrder]);

  const handleExport = async (id: string) => {
    try {
      const res = await api.get(`/v1/reports/${id}/export`, { responseType: 'blob' });
      const blob = res?.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast?.({ title: 'Report exported successfully' });
    } catch (err) {
      console.error('Failed to export report', err);
      toast?.({ title: 'Failed to export', variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'Report ID',
      sortable: true,
      format: (value: string) => (
        <code className="text-xs bg-muted px-2 py-1 rounded">{value.substring(0, 12)}…</code>
      ),
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
      key: 'status',
      label: 'Status',
      sortable: true,
      format: (value: string) => <StatusBadge status={value as 'completed' | 'running' | 'failed' | 'queued' | 'cancelled' | 'processing'} />,
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
          title="My Reports"
          subtitle="View, analyze and export your bias detection reports"
          hideActions={true}
        />

        {/* Filters & Search */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search reports by ID, model, or dataset…"
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
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>

            <Link href="/dashboard/user/run">
              <Button className="w-full sm:w-auto">Create Report</Button>
            </Link>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex items-center justify-center text-muted-foreground">
                  <div className="animate-spin">⏳</div>
                  <span className="ml-2">Loading reports…</span>
                </div>
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<div className="text-4xl mb-2">📋</div>}
              title="No reports yet"
              description={
                searchQuery || statusFilter
                  ? 'Try adjusting your search or filters'
                  : 'Create an analysis run to generate your first report'
              }
              actionLabel="Start Analysis"
              actionHref="/dashboard/user/run"
            />
          ) : (
            <div className="space-y-4">
              <ResponsiveDataTable
                columns={columns}
                data={reports.map((r) => ({
                  id: r.id,
                  modelId: r.modelId || r.model || '—',
                  datasetId: r.datasetId || r.dataset || '—',
                  status: r.status || 'unknown',
                  createdAt: r.createdAt,
                  _raw: r,
                }))}
                loading={loading}
                emptyMessage="No reports found"
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
              />

              {/* Actions - Mobile */}
              {reports.length > 0 && (
                <div className="space-y-2 md:hidden">
                  {reports.map((r) => (
                    <Card key={r.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">
                              {r.modelId || r.model || 'Untitled'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(r.createdAt)}
                            </div>
                          </div>
                          <StatusBadge status={r.status} size="sm" />
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/dashboard/user/reports/${r.id}`} className="flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport(r.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Desktop Actions */}
              <div className="hidden md:block space-y-2">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-end gap-2 p-2 rounded hover:bg-muted"
                  >
                    <Link href={`/dashboard/user/reports/${r.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExport(r.id)}
                      title="Export report"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded border bg-muted/30">
                <div className="text-sm text-muted-foreground">
                  {total !== null
                    ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, total)} of ${total}`
                    : `Showing page ${page} — ${reports.length}`}
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
