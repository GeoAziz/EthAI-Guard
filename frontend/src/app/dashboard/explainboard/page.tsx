'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, AlertCircle, Lightbulb, RefreshCw, BarChart2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import Link from 'next/link';

export default function ExplainboardPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'excel'>('pdf');
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/analyses/latest');
      setAnalysis(res.data);
    } catch (err: any) {
      console.error('Failed to fetch analysis:', err);
      setError('Failed to load analysis data. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!analysis?._id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No analysis available to export.',
      });
      return;
    }

    setExporting(true);
    try {
      const response = await api.post('/api/export/analysis', {
        reportId: analysis._id,
        exportFormat: exportFormat,
      }, {
        responseType: 'blob',
      });

      // Create blob and trigger download
      const blob = new Blob([response.data], {
        type: exportFormat === 'csv'
          ? 'text/csv'
          : exportFormat === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat;
      a.download = `shap-analysis-${timestamp}.${extension}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export Successful',
        description: `Your analysis has been exported as ${exportFormat.toUpperCase()}.`,
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err?.response?.data?.error || 'Failed to export analysis. Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {/* Card Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-40" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
            <div className="pt-4">
              <Skeleton className="h-10 w-full sm:w-80" />
              <Skeleton className="h-64 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error State with Empty State
  if (error) {
    return (
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">ExplainBoard</h2>
            <p className="text-muted-foreground mt-1">
              Understand your model's predictions with SHAP analysis.
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="py-12 sm:py-16">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Lightbulb className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Analysis Data Available</h3>
              <p className="text-sm text-muted-foreground mb-6">
                SHAP explainability visualizations require an analysis to be run first.
                Upload a dataset and run an analysis to see feature importance and prediction explanations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/dashboard">Upload Dataset</Link>
                </Button>
                <Button variant="outline" onClick={fetchLatestAnalysis}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">ExplainBoard</h2>
          <p className="text-muted-foreground mt-1">
            Understand your model's predictions with SHAP analysis.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv' | 'excel')}
            disabled={exporting}
            className="h-10 px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground"
          >
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="csv">CSV</option>
          </select>
          <Button variant="outline" onClick={fetchLatestAnalysis} disabled={loading || exporting} className="flex-1 sm:flex-none">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} disabled={exporting || !analysis} className="flex-1 sm:flex-none">
            <Download className={`mr-2 h-4 w-4 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            SHAP Analysis Visualizations
          </CardTitle>
          <CardDescription>
            Feature importance and explainability plots from your latest analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Feature Importance from Analysis */}
          {analysis?.summary?.featureImportance && (
            <div className="mb-6">
              <h3 className="font-semibold text-base sm:text-lg mb-3">Feature Importance</h3>
              <div className="space-y-3" role="list" aria-label="Feature importance ranking">
                {Object.entries(analysis.summary.featureImportance)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([feature, importance]: any, index: number) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 sm:gap-3"
                      role="listitem"
                      aria-label={`${feature}: ${(importance * 100).toFixed(1)} percent importance`}
                    >
                      <span className="text-xs sm:text-sm font-medium w-24 sm:w-32 truncate" title={feature}>
                        {feature}
                      </span>
                      <div className="flex-1 bg-muted rounded-full h-5 sm:h-6 overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all duration-500 ease-out"
                          style={{ width: `${(importance * 100).toFixed(1)}%` }}
                          role="progressbar"
                          aria-valuenow={importance * 100}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        />
                      </div>
                      <span className="text-xs sm:text-sm text-muted-foreground w-12 sm:w-14 text-right tabular-nums">
                        {(importance * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
              <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
              <TabsTrigger value="force" className="text-xs sm:text-sm">Force</TabsTrigger>
              <TabsTrigger value="dependence" className="text-xs sm:text-sm">Dependence</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">SHAP Summary Plot</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  This plot shows the most important features and their impact on the model's predictions.
                </p>
                {analysis?.summary?.shapPlots?.summary ? (
                  <div className="relative aspect-[2/1] w-full">
                    <Image
                      src={analysis.summary.shapPlots.summary}
                      alt="SHAP Summary Plot showing feature importance distribution across all predictions"
                      fill
                      className="rounded-md object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 sm:p-8 text-center border-2 border-dashed border-muted-foreground/20">
                    <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      SHAP summary plot will appear here after analysis completion.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Feature importance data shown above provides a similar overview.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="force" className="mt-4">
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">SHAP Force Plot</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  This plot shows how features contributed to a single prediction.
                </p>
                {analysis?.summary?.shapPlots?.force ? (
                  <div className="relative aspect-[4/1] w-full">
                    <Image
                      src={analysis.summary.shapPlots.force}
                      alt="SHAP Force Plot showing individual feature contributions to a single prediction"
                      fill
                      className="rounded-md object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 sm:p-8 text-center border-2 border-dashed border-muted-foreground/20">
                    <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      SHAP force plot will appear here after analysis completion.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="dependence" className="mt-4">
              <div className="p-3 sm:p-4 border rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">SHAP Dependence Plot</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  This plot shows the effect of a single feature on the model's predictions.
                </p>
                {analysis?.summary?.shapPlots?.dependence ? (
                  <div className="relative aspect-[2/1] w-full">
                    <Image
                      src={analysis.summary.shapPlots.dependence}
                      alt="SHAP Dependence Plot showing relationship between feature values and model output"
                      fill
                      className="rounded-md object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
                    />
                  </div>
                ) : (
                  <div className="bg-muted rounded-md p-6 sm:p-8 text-center border-2 border-dashed border-muted-foreground/20">
                    <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      SHAP dependence plot will appear here after analysis completion.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
