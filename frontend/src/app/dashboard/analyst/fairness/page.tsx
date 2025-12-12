'use client';
import React, { useCallback, useEffect, useState } from 'react';
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
  // Paginated fairness events/logs
  const [events, setEvents] = useState<any[]>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsLimit, setEventsLimit] = useState(10);
  const [eventsTotal, setEventsTotal] = useState<number | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

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

  const fetchEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(eventsPage));
      q.set('limit', String(eventsLimit));
      if (modelId) q.set('modelId', modelId);
      if (datasetId) q.set('datasetId', datasetId);
      const res = await api.get(`/v1/fairness/events?${q.toString()}`);
      const data = res?.data;
      if (Array.isArray(data)) {
        setEvents(data);
        setEventsTotal(null);
      } else {
        setEvents(data?.items || []);
        setEventsTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (e) {
      console.error('Failed to load fairness events', e);
      toast({ title: 'Failed to load events', variant: 'destructive' });
    } finally {
      setLoadingEvents(false);
    }
  }, [eventsPage, eventsLimit, modelId, datasetId, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

          {/* Paginated events/logs section */}
          <div className="rounded-lg border bg-white p-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Recent fairness events</h3>
              <div className="flex gap-2 items-center">
                <label htmlFor="analyst-fairness-page-size-select" className="text-sm">Page size:</label>
                <select
                  id="analyst-fairness-page-size-select"
                  value={String(eventsLimit)}
                  onChange={(e) => { setEventsLimit(Number(e.target.value)); setEventsPage(1); }}
                  className="border p-1 rounded text-sm"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              {loadingEvents && <div className="text-sm text-muted-foreground">Loading…</div>}
              {!loadingEvents && events.length === 0 && (
                <div className="text-sm text-muted-foreground">No events</div>
              )}
              {!loadingEvents && events.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-sm table-auto">
                    <thead className="text-xs text-muted-foreground border-b">
                      <tr>
                        <th className="py-2">Timestamp</th>
                        <th className="py-2">Model</th>
                        <th className="py-2">Dataset</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e, idx) => (
                        <tr key={e.id || idx} className="border-b">
                          <td className="py-2">{e.timestamp || e.createdAt || '—'}</td>
                          <td className="py-2">{e.modelId || e.model || '—'}</td>
                          <td className="py-2">{e.datasetId || e.dataset || '—'}</td>
                          <td className="py-2">{e.type || '—'}</td>
                          <td className="py-2">{e.severity || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {eventsTotal !== null ? `Showing page ${eventsPage} — ${events.length} of ${eventsTotal}` : `Showing page ${eventsPage} — ${events.length}`}
              </div>
              <div className="flex gap-2 items-center">
                <button className="btn" disabled={eventsPage <= 1} onClick={() => setEventsPage((p) => Math.max(1, p - 1))}>Previous</button>
                <button className="btn" disabled={eventsTotal !== null && eventsPage * eventsLimit >= (eventsTotal || 0)} onClick={() => setEventsPage((p) => p + 1)}>Next</button>
                {eventsTotal !== null && (
                  <div className="flex gap-1 items-center ml-2">
                    {Array.from({ length: Math.max(1, Math.ceil((eventsTotal || 0) / eventsLimit)) }, (_, i) => i + 1).map((n) => (
                      <button key={n} className={`btn ${n === eventsPage ? 'btn-active' : ''}`} onClick={() => setEventsPage(n)} disabled={n === eventsPage}>{String(n)}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
