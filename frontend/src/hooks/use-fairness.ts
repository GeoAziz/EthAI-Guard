import { useCallback, useState } from 'react';
import api from '@/lib/api';
import { useAsync } from '@/hooks/use-async';

type FairnessMetrics = {
  DI?: number;
  EOD?: number;
  SP?: number;
  groups?: Array<{
    group: string;
    DI: number;
    EOD: number;
    SP: number;
  }>;
  [k: string]: any;
};

type Heatmap = {
  xLabels: string[];
  yLabels: string[];
  values: number[][];
};

export function useFairnessMetrics(modelId: string, datasetId: string) {
  return useAsync<FairnessMetrics | null>(
    async () => {
      if (!modelId || !datasetId) return null;
      const res = await api.get(
        `/v1/fairness/metrics?modelId=${encodeURIComponent(modelId)}&datasetId=${encodeURIComponent(datasetId)}`
      );
      return res.data || null;
    },
    [modelId, datasetId]
  );
}

export function useFairnessHeatmap(modelId: string) {
  return useAsync<Heatmap | null>(
    async () => {
      if (!modelId) return null;
      const res = await api.get(
        `/v1/fairness/heatmap?modelId=${encodeURIComponent(modelId)}`
      );
      return res.data || null;
    },
    [modelId]
  );
}

export function useFairnessEvents(modelId: string, datasetId: string) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const fetchFn = useCallback(async () => {
    const q = new URLSearchParams();
    q.set('page', String(page));
    q.set('limit', String(limit));
    if (modelId) q.set('modelId', modelId);
    if (datasetId) q.set('datasetId', datasetId);
    const res = await api.get(`/v1/fairness/events?${q.toString()}`);
    const data = res?.data;
    return {
      items: Array.isArray(data) ? data : data?.items || [],
      total: typeof data?.total === 'number' ? data.total : null,
    };
  }, [page, limit, modelId, datasetId]);

  const state = useAsync(fetchFn, [page, limit, modelId, datasetId]);

  return {
    ...state,
    page,
    setPage,
    limit,
    setLimit,
  };
}
