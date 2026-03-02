'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/v1/reports')
      .then(res => {
        if (!mounted) {return;}
        setReports(Array.isArray(res?.data) ? res.data : (res?.data?.items || []));
      })
      .catch(err => {
        console.error('Failed to load reports', err);
        toast?.({ title: 'Failed to load reports', variant: 'destructive' });
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, []);

  async function handleExport(r: any) {
    try {
      const resp = await api.get(`/v1/reports/${r.id}/export`, { responseType: 'blob' as any });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filename || `${r.id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast?.({ title: 'Export started', variant: 'default' });
    } catch (err) {
      console.error('Export failed', err);
      toast?.({ title: 'Export failed', variant: 'destructive' });
    }
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Admin reports" subtitle="Organization-level reports and exports" />

        <div className="mt-6 rounded-lg border bg-card p-4 sm:p-6">
          <h4 className="font-medium mb-3">Available exports</h4>
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && reports.length === 0 && (
            <div className="text-sm text-muted-foreground">No reports available</div>
          )}
          {!loading && reports.length > 0 && (
            <ul className="space-y-3">
              {reports.map((r: any) => (
                <li key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">{r.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{r.description}</div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleExport(r)} 
                    className="min-h-9 shrink-0 w-full sm:w-auto"
                    aria-label={`Export ${r.name}`}
                  >
                    Export
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
