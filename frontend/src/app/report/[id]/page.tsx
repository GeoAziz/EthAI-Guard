'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, Download, Trash2 } from 'lucide-react';
import { FairnessCharts } from '@/components/dashboard/fairness-charts';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Cast the imported FairnessCharts to a typed React component so props are recognized by TypeScript
const FairnessChartsComponent = FairnessCharts as unknown as React.FC<{ summary?: any }>;

export default function ReportPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/report/${params.id}`);
        setReport(res.data?.report || res.data);
      } catch (e: any) {
        console.error('Failed to fetch report', e);
        setError(String(e?.response?.data?.error || e?.message || 'Failed to fetch report'));
        toast({ title: 'Failed to load report', description: String(e?.response?.data?.error || e?.message), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl">Loan Application Model Report</CardTitle>
              <CardDescription className="mt-2">
                Report ID: {params.id} {report ? `| Generated on: ${new Date().toLocaleDateString()}` : null}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Compliant</Badge>
              <Button variant="outline" size="icon"><Share2 className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent>
            <p className="text-center">Loading report...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Fairness Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Fairness Metrics</CardTitle>
                <CardDescription>Bias detection across protected attributes</CardDescription>
              </CardHeader>
              <CardContent>
                {report?.summary?.biasMetrics ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Overall Fairness Score</h4>
                      <div className="flex items-center gap-4">
                        <span className="text-4xl font-bold">{(report.summary.overallFairnessScore * 100).toFixed(0)}</span>
                        <Badge className={
                          report.summary.overallFairnessScore >= 0.9
                            ? 'bg-green-600/20 text-green-400 border-green-600/30'
                            : report.summary.overallFairnessScore >= 0.7
                              ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
                              : 'bg-red-600/20 text-red-400 border-red-600/30'
                        }
                        >
                          {report.summary.riskLevel || 'unknown'}
                        </Badge>
                      </div>
                    </div>
                    <FairnessChartsComponent summary={report?.summary} />
                  </div>
                ) : (
                  <p className="text-muted-foreground">No bias metrics available</p>
                )}
              </CardContent>
            </Card>

            {/* Explainability */}
            <Card>
              <CardHeader>
                <CardTitle>Explainability (SHAP)</CardTitle>
                <CardDescription>Feature importance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {report?.summary?.featureImportance ? (
                  <div className="space-y-2">
                    {Object.entries(report.summary.featureImportance)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 8)
                      .map(([feature, importance]: any) => (
                        <div key={feature} className="flex items-center gap-2">
                          <span className="text-sm w-32 truncate">{feature}</span>
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${importance * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono w-12 text-right">
                            {(importance * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                ) : report?.summary?.explanation_plot ? (
                  <img
                    src={report.summary.explanation_plot}
                    alt="SHAP plot"
                    className="max-w-full rounded"
                  />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p className="mb-2">Explainability data not available</p>
                    <p className="text-sm">Run analysis with SHAP enabled</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Summary</CardTitle>
              <CardDescription>
                Regulatory compliance status: {report?.summary?.complianceStatus || 'unknown'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report?.summary?.violations && report.summary.violations.length > 0 ? (
                <div className="space-y-4">
                  {report.summary.violations.map((violation: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-l-destructive pl-4 py-2">
                      <div className="flex items-start gap-2 mb-1">
                        <Badge variant="destructive" className="mt-0.5">
                          {violation.level || 'HIGH'}
                        </Badge>
                        <p className="font-semibold flex-1">{violation.description}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Recommendation:</span> {violation.recommendation}
                      </p>
                      {violation.metric && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Metric: {violation.metric} = {violation.value?.toFixed(3)}
                          (threshold: {violation.threshold?.toFixed(3)})
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Badge className="bg-green-600/20 text-green-400 border-green-600/30 mb-2">
                    ✓ COMPLIANT
                  </Badge>
                  <p className="text-muted-foreground">No compliance violations detected</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
