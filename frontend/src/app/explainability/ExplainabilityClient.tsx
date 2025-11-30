'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

type GlobalSHAP = {
  features: Array<{ feature: string; mean_abs_shap: number }>;
};

type LocalExplanation = {
  contributions: Array<{ feature: string; contribution: number }>;
};

function ShapBarChart({ data }: { data: GlobalSHAP | null }) {
  if (!data) {return <ChartPlaceholder title="SHAP summary (bar)" height={220} />;}
  return (
    <div>
      <h5 className="text-sm text-muted-foreground">Top features</h5>
      <ul className="mt-2 space-y-2">
        {data.features.slice(0, 10).map((f) => (
          <li key={f.feature} className="flex items-center gap-3">
            <div className="w-40 text-sm">{f.feature}</div>
            <div className="h-3 bg-gray-200 rounded flex-1 relative">
              <div className="bg-blue-600 h-3 rounded" style={{ width: `${Math.min(100, f.mean_abs_shap * 100)}%` }} />
            </div>
            <div className="w-12 text-right text-xs">{(f.mean_abs_shap * 100).toFixed(1)}%</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExplainabilityClient() {
  const sp = useSearchParams();
  const modelId = sp?.get('modelId') || '';
  const datasetId = sp?.get('datasetId') || '';
  const reportId = sp?.get('reportId') || '';

  const { toast } = useToast();

  const [globalData, setGlobalData] = useState<GlobalSHAP | null>(null);
  const [localData, setLocalData] = useState<LocalExplanation | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);

  useEffect(() => {
    async function fetchGlobal() {
      if (!modelId || !datasetId) {return;}
      setLoadingGlobal(true);
      try {
        const res = await api.get(`/v1/explainability/global?modelId=${encodeURIComponent(modelId)}&datasetId=${encodeURIComponent(datasetId)}`);
        setGlobalData(res.data || null);
      } catch (e: any) {
        toast({ title: 'Failed to load global explainability', variant: 'destructive' });
      } finally {
        setLoadingGlobal(false);
      }
    }
    fetchGlobal();
  }, [modelId, datasetId]);

  useEffect(() => {
    async function fetchLocal() {
      if (!reportId) {return;}
      setLoadingLocal(true);
      try {
        const res = await api.get(`/v1/explainability/local?reportId=${encodeURIComponent(reportId)}`);
        setLocalData(res.data || null);
      } catch (e: any) {
        toast({ title: 'Failed to load local explanation', variant: 'destructive' });
      } finally {
        setLoadingLocal(false);
      }
    }
    fetchLocal();
  }, [reportId]);

  return (
    <RoleProtected required={['analyst', 'admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Explainability Viewer" subtitle="SHAP summaries, feature importance, and local explanations" />

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Global feature importance</h3>
            <p className="text-sm text-muted-foreground">SHAP summary for selected model and dataset.</p>
            <div className="mt-4">
              {loadingGlobal ? <div className="text-sm text-gray-500">Loading global explainability…</div> : <ShapBarChart data={globalData} />}
            </div>
          </div>

          <aside className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Local explanation</h4>
            <p className="text-sm text-muted-foreground">Selected instance contributions.</p>
            <div className="mt-3">
              {loadingLocal ? (
                <div className="text-sm text-gray-500">Loading local explanation…</div>
              ) : localData && localData.contributions ? (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr><th className="py-2">Feature</th><th className="py-2">Contribution</th></tr>
                  </thead>
                  <tbody>
                    {localData.contributions.map((c) => (
                      <tr className="border-b" key={c.feature}><td className="py-2">{c.feature}</td><td className="py-2">{c.contribution}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-sm text-muted-foreground">No local explanation loaded. Provide a reportId in the query string to view a local explanation.</div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </RoleProtected>
  );
}
