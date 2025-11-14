"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Download, Trash2 } from "lucide-react";
import { FairnessCharts } from "@/components/dashboard/fairness-charts";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
              <Button variant="outline" size="icon"><Share2 className="h-4 w-4"/></Button>
              <Button variant="outline" size="icon"><Download className="h-4 w-4"/></Button>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
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
            <Card>
              <CardHeader>
                <FairnessChartsComponent summary={report?.summary} />
              </CardHeader>
              <CardContent>
                <FairnessChartsComponent summary={report?.summary} />
              </CardContent>
            </Card>
            <Card>
                <CardHeader>
                  <CardTitle>Explainability (SHAP)</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-full text-muted-foreground">
                  {report?.summary?.explanation_plot ? (
                    <div className="max-w-full">
                      <img src={report.summary.explanation_plot} alt="SHAP plot" className="max-w-full rounded" />
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="mb-2">SHAP plot not available.</p>
                      <p className="text-sm text-muted-foreground">The analysis produced feature importances; visualizations may be generated if plotting libraries are available on the ai_core service.</p>
                    </div>
                  )}
                </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compliance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{report?.summary ? 'Model summary loaded.' : 'No summary available.'}</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
