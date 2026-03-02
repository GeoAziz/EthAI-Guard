'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl">
        <Breadcrumbs />
        <PageHeader title="Organization settings" subtitle="Manage organization-wide defaults and integrations" />

        <div className="mt-6 rounded-lg border bg-card p-4 sm:p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="default-timeout" className="text-sm font-medium">Default analysis timeout (minutes)</label>
              <input
                id="default-timeout"
                type="number"
                className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={timeout ?? ''}
                onChange={e => setTimeoutVal(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={loading}
              />
            </div>
            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded">{error}</div>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTimeoutVal(60)}
                disabled={saving || loading}
                className="min-h-9"
                aria-label="Reset to default timeout"
              >
                Reset
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || loading}
                className="min-h-9"
                aria-label="Save settings"
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-4">Integration keys and data retention policies can be managed here.</p>
          </form>
        </div>
      </div>
    </RoleProtected>
  );
}
