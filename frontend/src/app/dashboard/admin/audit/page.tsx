'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [filterUser, setFilterUser] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params: any = { page, limit };
    if (filterUser) {params.user = filterUser;}
    api.get('/v1/audit-logs', { params })
      .then(res => {
        if (!mounted) {return;}
        const data = res?.data?.items || res?.data || [];
        setLogs(Array.isArray(data) ? data : []);
      })
      .catch(err => {
        console.error('Failed to load audit logs', err);
        toast?.({ title: 'Failed to load audit logs', variant: 'destructive' });
      })
      .finally(() => { if (mounted) {setLoading(false);} });

    return () => { mounted = false; };
  }, [page, limit, filterUser]);

  async function handleExport() {
    try {
      const resp = await api.get('/v1/audit-logs/export', { responseType: 'blob' as any });
      // Trigger download
      try {
        const url = URL.createObjectURL(resp.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast?.({ title: 'Export started', variant: 'default' });
      } catch (e) {
        toast?.({ title: 'Export failed', variant: 'destructive' });
      }
    } catch (err) {
      toast?.({ title: 'Export failed', variant: 'destructive' });
    }
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Audit logs (admin)" subtitle="Full organization audit history" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex gap-2 items-center mb-3">
            <input placeholder="Filter by user email" className="border rounded px-2 py-1" value={filterUser} onChange={e => setFilterUser(e.target.value)} />
            <button onClick={() => setPage(1)} className="px-3 py-1 border rounded">Apply</button>
            <div className="ml-auto">
              <button onClick={handleExport} className="px-3 py-1 bg-primary text-white rounded">Export</button>
            </div>
          </div>

          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Timestamp</th><th className="py-2">Actor</th><th className="py-2">Event</th><th className="py-2">Details</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">Loading…</td></tr>}
              {!loading && logs.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-sm text-muted-foreground">No audit entries</td></tr>}
              {logs.map((l) => (
                <tr key={l.id || `${l.timestamp}-${l.actor}`} className="border-b">
                  <td className="py-2">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="py-2">{l.actor}</td>
                  <td className="py-2">{l.event}</td>
                  <td className="py-2">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
