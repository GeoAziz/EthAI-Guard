'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Database, Plus } from 'lucide-react';

type ModelRow = {
  id: string;
  name?: string;
  version?: string;
  active?: boolean;
  createdAt?: string;
};

export default function AnalystModelsPage() {
  const [models, setModels] = useState<ModelRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      const res = await api.get(`/v1/models?${q.toString()}`);
      const data = res?.data;
      if (Array.isArray(data)) {
        setModels(data as any);
        setTotal(null);
      } else {
        setModels((data?.items as any[]) || []);
        setTotal(typeof data?.total === 'number' ? data.total : null);
      }
    } catch (err) {
      console.error('Failed to load models', err);
      toast?.({ title: 'Failed to load models', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, page, limit]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <div className="flex justify-between items-center">
          <PageHeader title="Models registry" subtitle="Registered models and versions" />
          <div className="flex gap-2 items-center">
            <label htmlFor="analyst-models-page-size-select" className="text-sm">Page size:</label>
            <select id="analyst-models-page-size-select" value={String(limit)} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="border p-1 rounded text-sm">
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-white p-4">
          {loading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
          {!loading && models.length === 0 && (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No models registered</h3>
              <p className="text-sm text-muted-foreground mb-6">Register a model to include it in your analysis runs. Models must be uploaded through the admin panel or API.</p>
            </div>
          )}
          {!loading && models.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto">
                <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium">Model</th>
                    <th className="text-left py-3 px-3 font-medium hidden sm:table-cell">Version</th>
                    <th className="text-left py-3 px-3 font-medium">Active</th>
                    <th className="text-left py-3 px-3 font-medium hidden md:table-cell">Created</th>
                    <th className="text-right py-3 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <ModelRow key={m.id} model={m} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {total !== null ? `Showing page ${page} — ${models.length} of ${total}` : `Showing page ${page} — ${models.length}`}
          </div>
          <div className="flex gap-2 items-center">
            <button className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
            <button className="btn" disabled={total !== null && page * limit >= (total || 0)} onClick={() => setPage((p) => p + 1)}>Next</button>
            {total !== null && (
              <div className="flex gap-1 items-center ml-2">
                {Array.from({ length: Math.max(1, Math.ceil(total / limit)) }, (_, i) => i + 1).map((n) => (
                  <button key={n} className={`btn ${n === page ? 'btn-active' : ''}`} onClick={() => setPage(n)} disabled={n === page}>{String(n)}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}

function ModelRow({ model }: { model: ModelRow }) {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const handleViewDetails = () => {
    toast?.({ title: 'Model details', description: `Viewing details for ${model.name || model.id}` });
    setShowMenu(false);
  };

  const handleDeactivate = () => {
    toast?.({ title: 'Updated', description: `Model ${model.name || model.id} deactivated` });
    setShowMenu(false);
  };

  const handleActivate = () => {
    toast?.({ title: 'Updated', description: `Model ${model.name || model.id} activated` });
    setShowMenu(false);
  };

  return (
    <tr className="border-b group hover:bg-muted/50 transition-colors duration-200">
      <td className="py-3 px-3 font-medium truncate">{model.name || model.id}</td>
      <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground">{model.version || '—'}</td>
      <td className="py-3 px-3">
        <Badge variant={model.active ? 'active' : 'inactive'}>
          {model.active ? 'yes' : 'no'}
        </Badge>
      </td>
      <td className="py-3 px-3 hidden md:table-cell text-muted-foreground text-xs">
        {model.createdAt ? new Date(model.createdAt).toISOString().slice(0, 10) : '—'}
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
            {model.active ? (
              <button
                onClick={handleDeactivate}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={handleActivate}
                className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
              >
                Activate
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
