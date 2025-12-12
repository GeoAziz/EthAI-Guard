'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Plus, Activity, AlertCircle } from 'lucide-react';

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
    <div className="rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2">
            {loading ? '—' : error ? '!' : value}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="text-muted-foreground ml-4">{icon}</div>
      </div>
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const modelName = report.modelId || report.model || '—';
  const datasetName = report.datasetId || report.dataset || '—';
  const createdDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—';

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-3 text-sm truncate">{report.id}</td>
      <td className="py-3 px-3 text-sm hidden sm:table-cell truncate">{modelName}</td>
      <td className="py-3 px-3 text-sm hidden md:table-cell truncate">{datasetName}</td>
      <td className="py-3 px-3 text-sm hidden lg:table-cell">{createdDate}</td>
      <td className="py-3 px-3 text-sm">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          report.status === 'completed' ? 'bg-green-100 text-green-700' :
            report.status === 'running' ? 'bg-blue-100 text-blue-700' :
              report.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
        }`}
        >
          {report.status || 'pending'}
        </span>
      </td>
      <td className="py-3 px-3 text-right">
        <div className="flex gap-2 justify-end">
          <a href={`/dashboard/analyst/reports/${report.id}`} className="text-sm text-primary hover:underline">View</a>
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

        {/* Action buttons */}
        <div className="mt-6 flex gap-2 flex-wrap">
          <Link href="/dashboard/analyst/run">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Analysis Run</span>
              <span className="sm:hidden">New Run</span>
            </Button>
          </Link>
          <Link href="/dashboard/analyst/datasets">
            <Button variant="outline">Upload Dataset</Button>
          </Link>
          <Link href="/dashboard/analyst/reports">
            <Button variant="outline">View All Reports</Button>
          </Link>
        </div>

        {/* KPI Cards */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/*
            Analyst-focused KPIs: show only Active Runs and Alerts.
            Datasets and Models metrics are less relevant to analyst workflows
            and are accessible via dashboard CTAs if needed.
          */}
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
        </section>

        {/* Recent Reports */}
        <section className="mt-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Recent Analysis Runs</h2>
          <div className="rounded-lg border bg-white overflow-hidden">
            {reportsLoading && (
              <div className="p-4 sm:p-6 text-sm text-muted-foreground text-center">
                Loading reports…
              </div>
            )}
            {!reportsLoading && reports.length === 0 && (
              <div className="p-4 sm:p-6 text-sm text-muted-foreground text-center">
                No reports found. <a href="/dashboard/analyst/run" className="text-primary hover:underline">Start an analysis run</a>
              </div>
            )}
            {!reportsLoading && reports.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left py-3 px-3 font-medium text-xs">Run ID</th>
                      <th className="text-left py-3 px-3 font-medium text-xs hidden sm:table-cell">Model</th>
                      <th className="text-left py-3 px-3 font-medium text-xs hidden md:table-cell">Dataset</th>
                      <th className="text-left py-3 px-3 font-medium text-xs hidden lg:table-cell">Created</th>
                      <th className="text-left py-3 px-3 font-medium text-xs">Status</th>
                      <th className="text-right py-3 px-3 font-medium text-xs">Actions</th>
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
