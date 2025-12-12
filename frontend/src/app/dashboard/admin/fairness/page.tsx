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
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl">
        <Breadcrumbs />
        <PageHeader title="Fairness thresholds" subtitle="Editable thresholds for monitored metrics" />

        <div className="mt-6 rounded-lg border bg-white p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2 px-2 text-left">Metric</th>
                  <th className="py-2 px-2 text-left hidden sm:table-cell">Threshold</th>
                  <th className="py-2 px-2 text-left hidden md:table-cell">Applies to</th>
                  <th className="py-2 px-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">Loading…</td></tr>}
                {!loading && thresholds.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">No thresholds configured</td></tr>}
                {thresholds.map(t => (
                  <tr key={t.metric} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 truncate">{t.label}</td>
                    <td className="py-2 px-2 hidden sm:table-cell">
                      <label htmlFor={`th-${t.metric}`} className="sr-only">Threshold for {t.label}</label>
                      <input 
                        id={`th-${t.metric}`} 
                        type="number"
                        className="border rounded px-2 py-1 w-20 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                        value={String(t.threshold)} 
                        onChange={e => updateThreshold(t.metric, Number(e.target.value))} 
                      />
                    </td>
                    <td className="py-2 px-2 hidden md:table-cell text-xs">{t.applies_to}</td>
                    <td className="py-2 px-2">
                      <button 
                        onClick={() => saveThreshold(t.metric)} 
                        disabled={savingMetric === t.metric} 
                        className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
                      >
                        {savingMetric === t.metric ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile view - show form for threshold input */}
          <div className="sm:hidden mt-4 space-y-3">
            {thresholds.map(t => (
              <div key={t.metric} className="border p-3 rounded bg-muted/50 space-y-2">
                <label className="text-xs font-medium">{t.label}</label>
                <input 
                  type="number"
                  className="w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                  value={String(t.threshold)} 
                  onChange={e => updateThreshold(t.metric, Number(e.target.value))} 
                />
                <button 
                  onClick={() => saveThreshold(t.metric)} 
                  disabled={savingMetric === t.metric}
                  className="w-full px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingMetric === t.metric ? 'Saving…' : 'Save'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
