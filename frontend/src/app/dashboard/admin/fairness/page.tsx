'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminFairnessPage() {
  const [thresholds, setThresholds] = useState<Array<{ metric: string; label?: string; threshold: number; applies_to?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [savingMetric, setSavingMetric] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/v1/fairness/thresholds')
      .then((res) => {
        if (!mounted) {return;}
        const data = res?.data || [];
        setThresholds(Array.isArray(data) ? data.map((d: any) => ({ metric: d.metric, label: d.label || d.metric.replace(/_/g, ' '), threshold: Number(d.threshold), applies_to: d.applies_to })) : []);
      })
      .catch(() => {
        if (!mounted) {return;}
        setThresholds([]);
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, []);

  async function saveThreshold(metric: string) {
    const t = thresholds.find(t => t.metric === metric);
    if (!t) {return;}
    setSavingMetric(metric);
    try {
      await api.put('/v1/fairness/thresholds', { metric: t.metric, threshold: t.threshold });
      toast?.({ title: 'Threshold saved', variant: 'default' });
    } catch (err: any) {
      toast?.({ title: 'Save failed', variant: 'destructive' });
    } finally {
      setSavingMetric(null);
    }
  }

  function updateThreshold(metric: string, val: number) {
    setThresholds(prev => prev.map(p => p.metric === metric ? { ...p, threshold: val } : p));
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Fairness thresholds" subtitle="Editable thresholds for monitored metrics" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Metric</th><th className="py-2">Threshold</th><th className="py-2">Applies to</th><th className="py-2">Action</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">Loading…</td></tr>}
              {!loading && thresholds.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">No thresholds configured</td></tr>}
              {thresholds.map(t => (
                <tr key={t.metric} className="border-b">
                  <td className="py-2">{t.label}</td>
                  <td className="py-2">
                    <label htmlFor={`th-${t.metric}`} className="sr-only">Threshold for {t.label}</label>
                    <input id={`th-${t.metric}`} className="border rounded px-2 py-1" value={String(t.threshold)} onChange={e => updateThreshold(t.metric, Number(e.target.value))} />
                  </td>
                  <td className="py-2">{t.applies_to}</td>
                  <td className="py-2">
                    <button onClick={() => saveThreshold(t.metric)} disabled={savingMetric === t.metric} className="px-3 py-1 bg-primary text-white rounded">{savingMetric === t.metric ? 'Saving…' : 'Save'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
