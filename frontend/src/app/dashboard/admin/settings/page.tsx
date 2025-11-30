'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
  const [timeout, setTimeoutVal] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/v1/org/settings')
      .then((res) => {
        if (!mounted) {return;}
        const t = res?.data?.default_timeout_minutes ?? res?.data?.default_timeout ?? 60;
        setTimeoutVal(typeof t === 'number' ? t : Number(t));
      })
      .catch(() => {
        if (!mounted) {return;}
        setError('failed_load');
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { default_timeout_minutes: Number(timeout) };
      await api.put('/v1/org/settings', body);
      toast?.({ title: 'Settings saved', variant: 'default' });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'save_failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Organization settings" subtitle="Manage organization-wide defaults and integrations" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label htmlFor="default-timeout" className="text-sm">Default analysis timeout (minutes)</label>
              <input id="default-timeout" className="border rounded px-2 py-1 mt-2" value={timeout ?? ''} onChange={e => setTimeoutVal(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <button type="submit" disabled={saving || loading} className="px-3 py-1 bg-primary text-white rounded">{saving ? 'Saving…' : 'Save'}</button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Integration keys and data retention policies can be managed here.</p>
          </form>
        </div>
      </div>
    </RoleProtected>
  );
}
