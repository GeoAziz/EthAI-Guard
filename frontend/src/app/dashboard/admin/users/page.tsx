'use client';
import React, { useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAnnounce } from '@/contexts/AnnounceContext';

export default function UsersAdminPage() {
  const [email, setEmail] = useState('');
  const [users, setUsers] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const announce = useAnnounce();

  const promote = async () => {
    if (!email) {return toast({ title: 'Enter an email' });}
    setLoading(true);
    try {
      const res = await api.post('/v1/users/promote', { email, role: 'admin' });
      toast({ title: 'User promoted', description: `${email} set to admin` });
      const claimsSync = res?.data?.claimsSync;
      if (claimsSync) {
        if (claimsSync.status === 'success') {
          toast({ title: 'Claims synced', description: 'Firebase custom claims updated.' });
          announce('Claims synced: Firebase custom claims updated.');
        } else if (claimsSync.status === 'skipped') {
          toast({ title: 'Claims not attempted', description: claimsSync.message });
          announce(`Claims not attempted: ${claimsSync.message}`);
        } else {
          toast({ title: 'Claims sync failed', description: claimsSync.message, variant: 'destructive' });
          announce(`Claims sync failed: ${claimsSync.message}`);
        }
      }
    } catch (err) {
      toast({ title: 'Promote failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const retry = async () => {
    if (!email) {return toast({ title: 'Enter an email' });}
    setLoading(true);
    try {
      const res = await api.post('/v1/users/sync-claims', { email });
      const body = res?.data;
      if (body?.status === 'success') {
        toast({ title: 'Claims synced', description: 'Firebase custom claims updated.' });
        announce('Claims synced: Firebase custom claims updated.');
      } else if (body?.status === 'skipped') {
        toast({ title: 'Claims not attempted', description: body.message });
        announce(`Claims not attempted: ${body.message}`);
      } else {
        toast({ title: 'Claims sync failed', description: body?.message || 'Unknown error', variant: 'destructive' });
        announce(`Claims sync failed: ${body?.message || 'Unknown error'}`);
      }
    } catch (err) {
      toast({ title: 'Claims sync failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/v1/users?page=${p}&limit=50`);
      const data = res?.data;
      let items, count, resLimit;
      if (Array.isArray(data)) {
        items = data;
        count = data.length;
        resLimit = 50;
      } else {
        items = data?.items || [];
        count = typeof data?.total === 'number' ? data.total : (typeof data?.count === 'number' ? data.count : items.length);
        resLimit = typeof data?.limit === 'number' ? data.limit : 50;
      }
      const totalP = Math.max(1, Math.ceil(count / resLimit));
      setUsers(items);
      setTotalCount(count);
      setTotalPages(totalP);
      setPage(Number(data?.page || p));
    } catch (e) {
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (userId: string) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/v1/users/${userId}/history`);
      setSelectedHistory(res?.data?.logs || []);
    } catch (e) {
      toast({ title: 'Failed to load history', variant: 'destructive' });
    } finally {
      setHistoryLoading(false);
    }
  };

  React.useEffect(() => { loadUsers(); }, []);

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <Breadcrumbs />
        <PageHeader title="Users administration" subtitle="Manage users, promote roles, and sync claims" />
        <Card>
          <CardHeader>
            <CardTitle>Search / Promote / Retry claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="flex-1" />
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                <Button onClick={promote} disabled={loading} className="flex-1 sm:flex-none">Promote</Button>
                <Button variant="outline" onClick={retry} disabled={loading} className="flex-1 sm:flex-none">Sync</Button>
                <Button variant="ghost" onClick={() => loadUsers()} className="flex-1 sm:flex-none">Refresh</Button>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">Promote will create or update a user in the DB and attempt to set Firebase custom claims. Retry will attempt to sync existing user's custom claims by email.</p>
          </CardContent>
        </Card>

        <div className="mt-6">
          <h2 className="text-lg font-medium mb-3">Users</h2>
          {loading && <div className="py-8 text-center text-muted-foreground">Loading…</div>}
          {!loading && users && users.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No users found.</div>}
          <div className="space-y-2">
            {users && users.map(u => (
              <Card key={u._id}>
                <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.email}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground overflow-hidden text-ellipsis">{u.name} • role: {u.role} • uid: {u.firebase_uid || '—'}</div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <Button size="sm" onClick={() => { setEmail(u.email); }} className="min-h-9 text-xs">Use</Button>
                    <Button size="sm" variant="secondary" onClick={async () => { try { await api.patch(`/v1/users/${u._id}/role`, { role: 'admin' }); toast({ title: 'Role updated' }); loadUsers(); } catch(e){ toast({ title: 'Update failed', variant: 'destructive' }); } }} className="min-h-9 text-xs">Promote</Button>
                    <Button size="sm" variant="outline" onClick={async () => { try { const res = await api.post('/v1/users/sync-claims', { email: u.email }); if (res?.data?.status === 'success') {toast({ title: 'Claims synced' });} else {toast({ title: res?.data?.message || 'Failed', variant: 'destructive' });} } catch(e){ toast({ title: 'Sync failed', variant: 'destructive' }); } }} className="min-h-9 text-xs">Sync</Button>
                    <Button size="sm" variant="ghost" onClick={() => loadHistory(u._id)} className="min-h-9 text-xs">History</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Pagination controls */}
          <div className="mt-4 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between text-xs sm:text-sm">
            <div className="text-muted-foreground">Showing {users ? users.length : 0} of {totalCount} users</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => loadUsers(Math.max(1, page - 1))} disabled={loading || page <= 1} className="min-h-8">Prev</Button>
              <div className="text-xs sm:text-sm whitespace-nowrap">Page {page} / {totalPages}</div>
              <Button size="sm" variant="outline" onClick={() => loadUsers(Math.min(totalPages, page + 1))} disabled={loading || page >= totalPages} className="min-h-8">Next</Button>
              {totalPages > 1 && totalPages <= 10 && (
                <div className="flex gap-1 items-center flex-wrap ml-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Button key={n} size="sm" variant={n === page ? 'default' : 'ghost'} onClick={() => loadUsers(n)} disabled={n === page || loading} className="min-h-8 px-2">{String(n)}</Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History modal */}
        {selectedHistory && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-12 sm:pt-8">
            <div className="bg-card p-4 sm:p-6 rounded-lg shadow-lg max-h-[80vh] w-full max-w-2xl overflow-auto border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h3 className="font-semibold text-sm sm:text-base">User history</h3>
                <Button variant="ghost" onClick={() => setSelectedHistory(null)} size="sm">Close</Button>
              </div>
              {historyLoading && <div className="py-8 text-center text-muted-foreground">Loading…</div>}
              {!historyLoading && selectedHistory && selectedHistory.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No history found.</div>}
              <div className="space-y-3">
                {selectedHistory && selectedHistory.map((l:any) => (
                  <div key={l._id} className="border-b pb-3 last:border-b-0">
                    <div className="text-xs sm:text-sm font-medium">{l.event_type}</div>
                    <div className="text-xs text-muted-foreground mt-1">{new Date(l.timestamp).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground mt-1">{l.actor} — {l.action}</div>
                    <pre className="text-xs mt-2 bg-muted p-2 rounded overflow-auto max-h-40">{JSON.stringify(l.details || {}, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleProtected>
  );
}
