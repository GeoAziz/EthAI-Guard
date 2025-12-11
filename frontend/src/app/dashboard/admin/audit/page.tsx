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
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl">
        <Breadcrumbs />
        <PageHeader title="Audit logs (admin)" subtitle="Full organization audit history" />

        <div className="mt-6 rounded-lg border bg-white p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mb-4">
            <input 
              placeholder="Filter by user email" 
              className="border rounded px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary" 
              value={filterUser} 
              onChange={e => setFilterUser(e.target.value)} 
            />
            <button 
              onClick={() => setPage(1)} 
              className="px-3 py-2 border rounded text-sm hover:bg-muted"
            >
              Apply
            </button>
            <button 
              onClick={handleExport} 
              className="px-3 py-2 bg-primary text-white rounded text-sm hover:bg-primary/90 whitespace-nowrap"
            >
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b bg-muted/50">
                <tr>
                  <th className="py-2 px-2 text-left">Timestamp</th>
                  <th className="py-2 px-2 text-left hidden sm:table-cell">Actor</th>
                  <th className="py-2 px-2 text-left">Event</th>
                  <th className="py-2 px-2 text-left hidden md:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">Loading…</td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No audit entries</td></tr>}
                {logs.map((l) => (
                  <tr key={l.id || `${l.timestamp}-${l.actor}`} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-2 text-xs">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-2 hidden sm:table-cell text-xs truncate">{l.actor}</td>
                    <td className="py-2 px-2 text-xs">{l.event}</td>
                    <td className="py-2 px-2 hidden md:table-cell text-xs truncate">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
