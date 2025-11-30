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
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Models registry" subtitle="Manage model versions and promotions" />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Recent model activity</h4>
            <div className="mt-4"><ChartPlaceholder title="Model activity" height={200} /></div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Models</h4>
            {loading && <div className="text-sm text-muted-foreground mt-3">Loading…</div>}
            {!loading && models.length === 0 && <div className="text-sm text-muted-foreground mt-3">No models registered</div>}
            {!loading && models.length > 0 && (
              <table className="w-full text-sm mt-3">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="py-2">Model</th><th className="py-2">Latest</th><th className="py-2">Status</th><th className="py-2">Actions</th></tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="py-2">{m.name}</td>
                      <td className="py-2">{m.latest_version}</td>
                      <td className="py-2">{m.status}</td>
                      <td className="py-2">
                        <button onClick={() => promoteModel(m.id)} disabled={!!actionLoading} className="px-2 py-1 mr-2 bg-primary text-white rounded">{actionLoading === m.id ? 'Working…' : 'Promote'}</button>
                        <button onClick={() => retrainModel(m.id)} disabled={!!actionLoading} className="px-2 py-1 bg-secondary text-white rounded">{actionLoading === m.id ? 'Working…' : 'Retrain'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
