'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

export default function ExplainboardPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/analyses/latest');
      setAnalysis(res.data);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch analysis:', err);
      setError('Failed to load analysis data. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting plots...');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ExplainBoard</h2>
          <p className="text-muted-foreground">
            Understand your model's predictions with SHAP analysis.
          </p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Plots
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-muted-foreground">Loading analysis data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>SHAP Analysis Visualizations</CardTitle>
            <CardDescription>
              Feature importance and explainability plots from your latest analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Feature Importance from Analysis */}
            {analysis?.summary?.featureImportance && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-3">Feature Importance</h3>
                <div className="space-y-3">
                  {Object.entries(analysis.summary.featureImportance)
                    .sort(([, a]: any, [, b]: any) => b - a)
                    .map(([feature, importance]: any) => (
                      <div key={feature} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-32 truncate">{feature}</span>
                        <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${(importance * 100).toFixed(1)}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {(importance * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary Plot</TabsTrigger>
                <TabsTrigger value="force">Force Plot</TabsTrigger>
                <TabsTrigger value="dependence">Dependence Plot</TabsTrigger>
              </TabsList>
              <TabsContent value="summary" className="mt-4">
                <div className="p-4 border rounded-lg bg-muted">
                  <h3 className="font-semibold mb-2">SHAP Summary Plot</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This plot shows the most important features and their impact on the model's predictions.
                  </p>
                  {analysis?.summary?.shapPlots?.summary ? (
                    <Image
                      src={analysis.summary.shapPlots.summary}
                      alt="SHAP Summary Plot"
                      width={800}
                      height={400}
                      className="rounded-md"
                      data-ai-hint="summary plot"
                    />
                  ) : (
                    <div className="bg-muted-foreground/10 rounded-md p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        SHAP summary plot will appear here after analysis completion.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Feature importance data shown above.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="force" className="mt-4">
                <div className="p-4 border rounded-lg bg-muted">
                  <h3 className="font-semibold mb-2">SHAP Force Plot</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This plot shows how features contributed to a single prediction.
                  </p>
                  {analysis?.summary?.shapPlots?.force ? (
                    <Image
                      src={analysis.summary.shapPlots.force}
                      alt="SHAP Force Plot"
                      width={800}
                      height={200}
                      className="rounded-md"
                      data-ai-hint="force plot"
                    />
                  ) : (
                    <div className="bg-muted-foreground/10 rounded-md p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        SHAP force plot will appear here after analysis completion.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="dependence" className="mt-4">
                <div className="p-4 border rounded-lg bg-muted">
                  <h3 className="font-semibold mb-2">SHAP Dependence Plot</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This plot shows the effect of a single feature on the model's predictions.
                  </p>
                  {analysis?.summary?.shapPlots?.dependence ? (
                    <Image
                      src={analysis.summary.shapPlots.dependence}
                      alt="SHAP Dependence Plot"
                      width={800}
                      height={400}
                      className="rounded-md"
                      data-ai-hint="dependence plot"
                    />
                  ) : (
                    <div className="bg-muted-foreground/10 rounded-md p-8 text-center">
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
      )}
    </div>
  );
}
