'use client';
import React, { useCallback, useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

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
      if (modelId) {q.set('modelId', modelId);}
      if (datasetId) {q.set('datasetId', datasetId);}
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
          <div className="rounded-lg border bg-white p-6">
            <div>
              <h3 className="text-lg font-medium">Key Fairness Metrics</h3>
              <p className="text-sm text-muted-foreground">Summary of overall model fairness indicators</p>
            </div>
            <div className="mt-6">
              {loadingMetrics ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading metrics…</div>
              ) : metrics ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-6 border rounded-lg hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer group">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Disparate Impact</div>
                    <div className="text-3xl sm:text-4xl font-bold mt-3 text-blue-600">
                      {metrics.DI !== undefined && metrics.DI !== null ? typeof metrics.DI === 'number' ? metrics.DI.toFixed(3) : metrics.DI : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Ratio of favorable outcomes between groups</p>
                    <div className="h-1 w-0 group-hover:w-full bg-blue-400 transition-all duration-300 mt-3 rounded" />
                  </div>
                  <div className="p-6 border rounded-lg hover:shadow-lg hover:border-green-200 transition-all duration-200 cursor-pointer group">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Equal Opportunity Difference</div>
                    <div className="text-3xl sm:text-4xl font-bold mt-3 text-green-600">
                      {metrics.EOD !== undefined && metrics.EOD !== null ? typeof metrics.EOD === 'number' ? metrics.EOD.toFixed(3) : metrics.EOD : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Difference in true positive rates</p>
                    <div className="h-1 w-0 group-hover:w-full bg-green-400 transition-all duration-300 mt-3 rounded" />
                  </div>
                  <div className="p-6 border rounded-lg hover:shadow-lg hover:border-purple-200 transition-all duration-200 cursor-pointer group">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Statistical Parity</div>
                    <div className="text-3xl sm:text-4xl font-bold mt-3 text-purple-600">
                      {metrics.SP !== undefined && metrics.SP !== null ? typeof metrics.SP === 'number' ? metrics.SP.toFixed(3) : metrics.SP : '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Difference in selection rates</p>
                    <div className="h-1 w-0 group-hover:w-full bg-purple-400 transition-all duration-300 mt-3 rounded" />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Provide <code className="bg-gray-100 px-2 py-1 rounded text-xs">modelId</code> and <code className="bg-gray-100 px-2 py-1 rounded text-xs">datasetId</code> query parameters to load metrics
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">Fairness heatmap</h3>
                <p className="text-sm text-muted-foreground">Metric values across sensitive groups and protected attributes</p>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 text-right">
                <div className="flex items-center gap-2 justify-end"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />High fairness</div>
                <div className="flex items-center gap-2 justify-end"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }} />Medium fairness</div>
                <div className="flex items-center gap-2 justify-end"><span className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />Low fairness</div>
              </div>
            </div>
            <div className="mt-6">
              {loadingHeatmap ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading heatmap…</div>
              ) : heatmap ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left py-3 px-3 font-medium text-xs" />
                        {heatmap.xLabels.map((x) => (
                          <th className="text-center py-3 px-2 font-medium text-xs" key={x}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {heatmap.yLabels.map((yLabel, rowIdx) => (
                        <tr key={yLabel}>
                          <td className="py-3 px-3 font-medium text-xs text-muted-foreground">{yLabel}</td>
                          {heatmap.values[rowIdx]?.map((v, colIdx) => {
                            // Determine color based on value (1.0 = perfect fairness, 0 = worst)
                            let bgColor = '#10B981'; // Green (good)
                            if (typeof v === 'number') {
                              if (v < 0.5) bgColor = '#EF4444'; // Red (bad)
                              else if (v < 0.75) bgColor = '#F59E0B'; // Amber (medium)
                            }
                            return (
                              <td
                                key={colIdx}
                                className="py-3 px-2 text-center group relative cursor-pointer hover:opacity-80 transition-opacity"
                                title={`${yLabel} × ${heatmap.xLabels[colIdx]}: ${v}`}
                              >
                                <div
                                  className="rounded py-2 px-2 text-white font-medium text-sm"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  {typeof v === 'number' ? v.toFixed(2) : v}
                                </div>
                                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                                  {`${yLabel} × ${heatmap.xLabels[colIdx]}: ${v}`}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">Provide modelId and datasetId in query to load heatmap.</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <div>
              <h3 className="text-lg font-medium">Bias Metrics per Model</h3>
              <p className="text-sm text-muted-foreground">Per-group fairness metrics for the selected model</p>
            </div>
            <div className="mt-6">
              {loadingMetrics ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Loading metrics…</div>
              ) : metrics && metrics.groups && metrics.groups.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-3 font-medium">Group</th>
                        <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Disparate Impact</th>
                        <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Equal Opp. Diff</th>
                        <th className="text-left py-3 px-3 font-medium">Stat. Parity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.groups.map((g: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50 transition-colors duration-200">
                          <td className="py-3 px-3 font-medium text-sm">{g.group}</td>
                          <td className="py-3 px-3 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-2">
                              <span className="font-mono">{typeof g.DI === 'number' ? g.DI.toFixed(3) : g.DI}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <span className="inline-flex items-center gap-2">
                              <span className="font-mono">{typeof g.EOD === 'number' ? g.EOD.toFixed(3) : g.EOD}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-2">
                              <span className="font-mono">{typeof g.SP === 'number' ? g.SP.toFixed(3) : g.SP}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm text-muted-foreground">No bias metrics available</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Provide modelId and datasetId in query parameters to load metrics</p>
                </div>
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
              {loadingEvents && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
              {!loadingEvents && events.length === 0 && (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No fairness events</h3>
                  <p className="text-sm text-muted-foreground">Run an analysis with fairness metrics to generate and view fairness audit events here.</p>
                </div>
              )}
              {!loadingEvents && events.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-auto">
                    <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                      <tr>
                        <th className="text-left py-3 px-3 font-medium">Timestamp</th>
                        <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Model</th>
                        <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Dataset</th>
                        <th className="text-left py-3 px-3 font-medium hidden lg:table-cell">Type</th>
                        <th className="text-left py-3 px-3 font-medium">Severity</th>
                        <th className="text-right py-3 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e, idx) => (
                        <FairnessEventRow key={e.id || idx} event={e} />
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

function FairnessEventRow({ event }: { event: any }) {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const getSeverityVariant = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'unknown';
    }
  };

  const handleViewDetails = () => {
    toast?.({ title: 'Event Details', description: `Viewing details for event from ${event.timestamp || event.createdAt}` });
    setShowMenu(false);
  };

  const handleExport = () => {
    toast?.({ title: 'Export started', description: 'Downloading event data...' });
    setShowMenu(false);
  };

  return (
    <tr className="border-b group hover:bg-muted/50 transition-colors duration-200">
      <td className="py-3 px-3 text-xs">{event.timestamp || event.createdAt || '—'}</td>
      <td className="py-3 px-3 hidden sm:table-cell truncate text-muted-foreground">{event.modelId || event.model || '—'}</td>
      <td className="py-3 px-3 hidden md:table-cell truncate text-muted-foreground">{event.datasetId || event.dataset || '—'}</td>
      <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">{event.type || '—'}</td>
      <td className="py-3 px-3">
        <Badge variant={getSeverityVariant(event.severity) as any}>
          {event.severity || 'unknown'}
        </Badge>
      </td>
      <td className="py-3 px-3 text-right relative">
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded relative z-10"
          onClick={() => setShowMenu(!showMenu)}
          title="More actions"
        >
          ⋮
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-md z-20 min-w-[150px]">
            <button
              onClick={handleViewDetails}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
            >
              View details
            </button>
            <button
              onClick={handleExport}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
            >
              Export data
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
