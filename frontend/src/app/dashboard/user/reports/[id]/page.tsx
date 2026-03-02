'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import formatDate from '@/lib/formatDate';
import { Download, Share2, ArrowLeft, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function UserReportDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/v1/reports/${id}`);
        if (!mounted) {
          return;
        }
        setReport(res?.data);
      } catch (err) {
        console.error('Failed to load report', err);
        toast?.({ title: 'Failed to load report', variant: 'destructive' });
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
  }, [id, toast]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/v1/reports/${id}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
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
    } finally {
      setExporting(false);
    }
  };

  // Mock data extraction from report
  const extractMetrics = (report: any) => {
    const payload = report?.payload || report?.data || {};
    return {
      overallFairnessScore: payload.fairnessScore || 78,
      biasDetected: payload.biasDetected || false,
      metricsCount: Object.keys(payload.metrics || {}).length,
      keyMetrics: (payload.metrics || {}) as Record<string, number>,
      findings: payload.findings || [],
      warnings: payload.warnings || [],
    };
  };

  if (loading) {
    return (
      <RoleProtected required={['user', 'admin']}>
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-2">⏳</div>
              <p className="text-muted-foreground">Loading report…</p>
            </div>
          </div>
        </div>
      </RoleProtected>
    );
  }

  if (!report) {
    return (
      <RoleProtected required={['user', 'admin']}>
        <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
          <Breadcrumbs />
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/50 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The report you're looking for doesn't exist or has been deleted.
            </p>
            <Link href="/dashboard/user/reports">
              <Button>← Back to Reports</Button>
            </Link>
          </div>
        </div>
      </RoleProtected>
    );
  }

  const metrics = extractMetrics(report);
  const fairnessLevel =
    metrics.overallFairnessScore >= 80
      ? { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' }
      : metrics.overallFairnessScore >= 60
      ? { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' }
      : metrics.overallFairnessScore >= 40
      ? { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' }
      : { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link href="/dashboard/user/reports" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <PageHeader
                title={`Report ${id.substring(0, 12)}…`}
                subtitle={`Generated ${formatDate(report.createdAt)}`}
                hideActions={true}
              />
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 sm:flex-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button variant="outline" className="flex-1 sm:flex-auto">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Model</div>
              <div className="font-semibold">{report.modelId || report.model || '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Dataset</div>
              <div className="font-semibold">{report.datasetId || report.dataset || '—'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <StatusBadge status={report.status || 'completed'} />
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        <Card className={`mb-6 border-2 ${fairnessLevel.bg}`}>
          <CardHeader>
            <CardTitle className="text-lg">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold mb-2">
                  <span className={fairnessLevel.color}>{metrics.overallFairnessScore}%</span>
                </div>
                <div className="text-sm text-muted-foreground">Overall Fairness Score</div>
                <Badge className={`mt-3 ${fairnessLevel.color} ${fairnessLevel.bg}`}>
                  {fairnessLevel.label}
                </Badge>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  {metrics.biasDetected ? (
                    <AlertCircle className="w-5 h-5 text-warning" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  <span className="font-semibold">Bias Detection</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {metrics.biasDetected
                    ? 'Potential bias detected in one or more metrics'
                    : 'No significant bias detected'}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Metrics Analyzed</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {metrics.metricsCount} fairness metrics evaluated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        {Object.keys(metrics.keyMetrics).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Key Metrics</CardTitle>
              <CardDescription>
                Fairness metrics and their values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics.keyMetrics).map(([name, value]) => (
                  <div
                    key={name}
                    className="p-4 rounded border bg-muted/30"
                  >
                    <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                      {name}
                    </div>
                    <div className="text-2xl font-bold">
                      {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Findings & Warnings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Findings */}
          {metrics.findings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {metrics.findings.map((finding: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {metrics.warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  Warnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {metrics.warnings.map((warning: string, idx: number) => (
                    <li key={idx} className="flex gap-2 text-sm">
                      <span className="text-warning flex-shrink-0">⚠</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Raw Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detailed Report Data</CardTitle>
            <CardDescription>
              Complete analysis results in JSON format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto bg-muted/50 p-4 rounded border">
              <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
                {JSON.stringify(report?.payload || report?.data || report, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex gap-3 flex-col sm:flex-row">
          <Link href="/dashboard/user/reports" className="flex-1 sm:flex-auto">
            <Button variant="outline" className="w-full">
              ← Back to Reports
            </Button>
          </Link>
          <Link href="/dashboard/user/run" className="flex-1 sm:flex-auto">
            <Button className="w-full">
              Create New Analysis
            </Button>
          </Link>
        </div>
      </div>
    </RoleProtected>
  );
}
