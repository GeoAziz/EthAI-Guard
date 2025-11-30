'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

type FairnessMetrics = {
  DI?: number;
  EOD?: number;
  SP?: number;
  [k: string]: any;
};

type Heatmap = {
  xLabels: string[];
  yLabels: string[];
  values: number[][]; // rows = yLabels, cols = xLabels
};

export default function FairnessPage() {
  const sp = useSearchParams();
  const modelId = sp?.get('modelId') || '';
  const datasetId = sp?.get('datasetId') || '';

  const { toast } = useToast();

  const [metrics, setMetrics] = useState<FairnessMetrics | null>(null);
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      if (!modelId || !datasetId) {return;}
      setLoadingMetrics(true);
      try {
        const res = await api.get(`/v1/fairness/metrics?modelId=${encodeURIComponent(modelId)}&datasetId=${encodeURIComponent(datasetId)}`);
        setMetrics(res.data || null);
      } catch (e) {
        toast({ title: 'Failed to load fairness metrics', variant: 'destructive' });
      } finally {
        setLoadingMetrics(false);
      }
    }
    fetchMetrics();
  }, [modelId, datasetId]);

  useEffect(() => {
    async function fetchHeatmap() {
      if (!modelId) {return;}
      setLoadingHeatmap(true);
      try {
        const res = await api.get(`/v1/fairness/heatmap?modelId=${encodeURIComponent(modelId)}`);
        setHeatmap(res.data || null);
      } catch (e) {
        toast({ title: 'Failed to load fairness heatmap', variant: 'destructive' });
      } finally {
        setLoadingHeatmap(false);
      }
    }
    fetchHeatmap();
  }, [modelId]);

  return (
    <RoleProtected required={['analyst', 'admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Fairness Dashboard" subtitle="Bias and fairness metrics for your models" />

        <section className="mt-6 space-y-6">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Metrics</h3>
            <p className="text-sm text-muted-foreground">Disparate Impact (DI), Equal Opportunity Difference (EOD), Statistical Parity (SP)</p>
            <div className="mt-4">
              {loadingMetrics ? (
                <div className="text-sm text-gray-500">Loading metrics…</div>
              ) : metrics ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <div className="text-xs text-muted-foreground">Disparate Impact</div>
                    <div className="text-2xl font-semibold">{metrics.DI ?? '—'}</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-xs text-muted-foreground">Equal Opportunity Difference</div>
                    <div className="text-2xl font-semibold">{metrics.EOD ?? '—'}</div>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="text-xs text-muted-foreground">Statistical Parity</div>
                    <div className="text-2xl font-semibold">{metrics.SP ?? '—'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Provide modelId and datasetId in query to load metrics.</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Fairness heatmap</h3>
            <p className="text-sm text-muted-foreground">Heatmap shows metric values across sensitive groups.</p>
            <div className="mt-4">
              {loadingHeatmap ? (
                <div className="text-sm text-gray-500">Loading heatmap…</div>
              ) : heatmap ? (
                <div className="overflow-auto">
                  <table className="w-full text-sm table-fixed border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border" />
                        {heatmap.xLabels.map((x) => (
                          <th className="p-2 border text-xs" key={x}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.yLabels.map((yLabel, rowIdx) => (
                        <tr key={yLabel}>
                          <td className="p-2 border text-xs font-medium">{yLabel}</td>
                          {heatmap.values[rowIdx]?.map((v, colIdx) => (
                            <td className="p-2 border text-center" key={colIdx}>
                              <div className="text-sm">{v}</div>
                              <div className="h-2 bg-gray-100 mt-1 rounded" style={{ width: `${Math.min(100, Math.abs(v) * 100)}%`, backgroundColor: v >= 0 ? '#60A5FA' : '#FCA5A5' }} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Provide modelId in query to load heatmap.</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Bias Metrics per Model</h3>
            <p className="text-sm text-muted-foreground">Per-group bias metrics for the selected model/dataset.</p>
            <div className="mt-4">
              {loadingMetrics ? (
                <div className="text-sm text-gray-500">Loading table…</div>
              ) : metrics && metrics.groups ? (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="py-2">Group</th><th className="py-2">DI</th><th className="py-2">EOD</th><th className="py-2">SP</th></tr>
                  </thead>
                  <tbody>
                    {metrics.groups.map((g: any) => (
                      <tr className="border-b" key={g.group}>
                        <td className="py-2">{g.group}</td>
                        <td className="py-2">{g.DI}</td>
                        <td className="py-2">{g.EOD}</td>
                        <td className="py-2">{g.SP}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-muted-foreground">No bias metrics available. Provide modelId and datasetId in query to populate table.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
