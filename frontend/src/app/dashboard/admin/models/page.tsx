'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminModelsPage() {
  const [models, setModels] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/v1/models')
      .then(res => {
        if (!mounted) {return;}
        setModels(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
      })
      .catch(err => {
        console.error('Failed to load models', err);
        toast?.({ title: 'Failed to load models', variant: 'destructive' });
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, []);

  async function promoteModel(id: string) {
    setActionLoading(id);
    try {
      await api.post(`/v1/models/${id}/promote`);
      toast?.({ title: 'Model promoted', variant: 'default' });
      // refresh list
      const res = await api.get('/v1/models');
      setModels(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
    } catch (err) {
      toast?.({ title: 'Promotion failed', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  async function retrainModel(id: string) {
    setActionLoading(id);
    try {
      await api.post(`/v1/models/${id}/retrain`);
      toast?.({ title: 'Retrain started', variant: 'default' });
      // optimistically mark status
      setModels(prev => prev.map(m => m.id === id ? { ...m, status: 'retraining' } : m));
    } catch (err) {
      toast?.({ title: 'Retrain failed', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
        <Breadcrumbs />
        <PageHeader title="Models registry" subtitle="Manage model versions and promotions" />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <h4 className="font-medium text-sm sm:text-base">Recent model activity</h4>
            <div className="mt-4"><ChartPlaceholder title="Model activity" height={200} /></div>
          </div>

          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <h4 className="font-medium text-sm sm:text-base">Models</h4>
            {loading && <div className="text-xs sm:text-sm text-muted-foreground mt-3 py-4 text-center">Loading…</div>}
            {!loading && models.length === 0 && <div className="text-xs sm:text-sm text-muted-foreground mt-3 py-4 text-center">No models registered</div>}
            {!loading && models.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2 px-1 text-left">Model</th>
                      <th className="py-2 px-1 text-left hidden sm:table-cell">Latest</th>
                      <th className="py-2 px-1 text-left hidden sm:table-cell">Status</th>
                      <th className="py-2 px-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-1 truncate">{m.name}</td>
                        <td className="py-2 px-1 hidden sm:table-cell">{m.latest_version}</td>
                        <td className="py-2 px-1 hidden sm:table-cell"><span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{m.status}</span></td>
                        <td className="py-2 px-1">
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => promoteModel(m.id)} disabled={!!actionLoading} className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">{actionLoading === m.id ? 'Work…' : 'Promote'}</button>
                            <button onClick={() => retrainModel(m.id)} disabled={!!actionLoading} className="px-2 py-1 text-xs bg-secondary text-white rounded hover:bg-secondary/90 disabled:opacity-50">{actionLoading === m.id ? 'Work…' : 'Retrain'}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
