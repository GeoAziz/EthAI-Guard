'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Plus, Activity, AlertCircle, FileText } from 'lucide-react';
import { KPISkeleton, KPISkeletonGrid } from '@/components/ui/kpi-skeleton';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';

interface KPICard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  loading?: boolean;
  error?: boolean;
}

// KPI item state used for the top-level kpis state. Includes optional
// loading and error flags so we can update them consistently.
interface KPIItem {
  value: number | string;
  loading?: boolean;
  error?: boolean;
}

interface Report {
  id: string;
  modelId?: string;
  model?: string;
  datasetId?: string;
  dataset?: string;
  createdAt?: string;
  status?: string;
  accuracy?: number;
  biasSeverity?: string;
  driftScore?: number;
}

function KPICard({ title, value, subtitle, icon, loading, error }: KPICard) {
  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2 transition-colors duration-200">
            {loading ? '—' : error ? '!' : value}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="text-muted-foreground ml-4 transition-transform duration-300">{icon}</div>
      </div>
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const modelName = report.modelId || report.model || '—';
  const datasetName = report.datasetId || report.dataset || '—';
  const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—';
  const [showMenu, setShowMenu] = React.useState(false);

  // Map status to badge variant
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

  return (
    <tr className="border-b hover:bg-muted/60 transition-colors duration-200 ease-out group">
      <td className="py-3 px-3 text-sm truncate font-medium">{report.id}</td>
      <td className="py-3 px-3 text-sm hidden sm:table-cell truncate">{modelName}</td>
      <td className="py-3 px-3 text-sm hidden md:table-cell truncate">{datasetName}</td>
      <td className="py-3 px-3 text-sm hidden lg:table-cell">{createdDate}</td>
      <td className="py-3 px-3 text-sm">
        <Badge variant={getStatusVariant(report.status) as any}>
          {report.status || 'pending'}
        </Badge>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="flex gap-2 justify-end items-center relative">
          <a 
            href={`/dashboard/analyst/reports/${report.id}`} 
            className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors duration-200 opacity-0 group-hover:opacity-100"
          >
            View
          </a>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
            title="More actions"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-lg z-10 min-w-max">
              <a
                href={`/dashboard/analyst/reports/${report.id}`}
                className="block px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                Open report
              </a>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
                disabled={report.status !== 'completed'}
                title={report.status === 'completed' ? 'Download this report' : 'Only completed reports can be exported'}
              >
                Export
              </button>
              <hr className="my-1" />
              <button
                className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                onClick={() => setShowMenu(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AnalystDashboard() {
  const { toast } = useToast();
  // Analyst KPIs: only show Active Runs and Alerts (most relevant metrics)
  const [kpis, setKpis] = useState<{
    activeRuns: KPIItem;
    alertCount: KPIItem;
  }>({
    activeRuns: { value: 0, loading: true },
    alertCount: { value: 0, loading: true },
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Fetch KPI data (Active Runs and Alerts only)
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        // Fetch reports (running) to calculate Active Runs and Alerts
        const reportsRes = await api.get('/v1/reports?limit=100');
        const reportsList = Array.isArray(reportsRes?.data) ? reportsRes.data : reportsRes?.data?.items || [];
        const activeCount = reportsList.filter((r: Report) => r.status === 'running').length;
        setKpis(prev => ({
          ...prev,
          activeRuns: { value: activeCount, loading: false },
        }));

        // Fetch alerts (bias/drift)
        const alertCount = reportsList.filter((r: Report) => {
          const hasBiasSeverity = r.biasSeverity && r.biasSeverity !== 'none';
          const hasDrift = r.driftScore && r.driftScore > 0.1;
          return hasBiasSeverity || hasDrift;
        }).length;
        setKpis((_prev) => ({
          activeRuns: { value: activeCount, loading: false },
          alertCount: { value: alertCount, loading: false },
        }));
      } catch (err) {
        console.error('Failed to fetch KPIs:', err);
        setKpis((_prev) => ({
          activeRuns: { value: 0, loading: false, error: true },
          alertCount: { value: 0, loading: false, error: true },
        }));
      }
    };
    fetchKPIs();
  }, []);

  // Fetch recent reports
  useEffect(() => {
    const fetchReports = async () => {
      setReportsLoading(true);
      try {
        const res = await api.get('/v1/reports?page=1&limit=5&role=analyst');
        const data = res?.data;
        if (Array.isArray(data)) {
          setReports(data);
        } else {
          setReports(data?.items || []);
        }
      } catch (err) {
        console.error('Failed to load reports:', err);
        toast?.({ title: 'Failed to load reports', variant: 'destructive' });
      } finally {
        setReportsLoading(false);
      }
    };
    fetchReports();
  }, [toast]);

  return (
    <RoleProtected required={['analyst']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="Analyst workspace"
          subtitle="Run and manage fairness and explainability analyses"
        />

        {/* Action buttons - Stack on mobile, row on tablet+ */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link href="/dashboard/analyst/run" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Analysis Run</span>
              <span className="sm:hidden">New Run</span>
            </Button>
          </Link>
          <Link href="/dashboard/analyst/datasets" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">Upload Dataset</Button>
          </Link>
          <Link href="/dashboard/analyst/reports" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">View All Reports</Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <section className="mt-8">
          {(kpis.activeRuns.loading || kpis.alertCount.loading) ? (
            <KPISkeletonGrid count={2} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <KPICard
                title="Active Runs"
                value={kpis.activeRuns.value}
                subtitle="In progress"
                icon={<Activity className="w-5 h-5" />}
                loading={kpis.activeRuns.loading}
                error={kpis.activeRuns.error}
              />
              <KPICard
                title="Alerts"
                value={kpis.alertCount.value}
                subtitle="Bias/drift detected"
                icon={<AlertCircle className="w-5 h-5" />}
                loading={kpis.alertCount.loading}
                error={kpis.alertCount.error}
              />
            </div>
          )}
        </section>

        {/* Recent Reports */}
        <section className="mt-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4">Recent Analysis Runs</h2>
          <div className="rounded-lg border bg-white overflow-hidden">
            {reportsLoading ? (
              <div className="p-6 sm:p-8 flex items-center justify-center">
                <LoadingSpinner message="Loading your analysis runs…" />
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-12 h-12 text-muted-foreground/60" />}
                title="No analysis runs yet"
                description="Create your first fairness or explainability analysis to get started."
                actionLabel="Start Analysis"
                actionHref="/dashboard/analyst/run"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-3 font-medium">Run ID</th>
                      <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Model</th>
                      <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Dataset</th>
                      <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Created</th>
                      <th className="text-left py-3 px-3 font-medium">Status</th>
                      <th className="text-right py-3 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(report => (
                      <ReportRow key={report.id} report={report} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
