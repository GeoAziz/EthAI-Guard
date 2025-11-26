"use client";
import React, { useState } from 'react';
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
  const [selectedHistory, setSelectedHistory] = useState<any[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const announce = useAnnounce();

  const promote = async () => {
    if (!email) return toast({ title: 'Enter an email' });
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
    if (!email) return toast({ title: 'Enter an email' });
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
      setUsers(res?.data?.items || []);
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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-4">Users Admin</h1>
      <Card>
        <CardHeader>
          <CardTitle>Search / Promote / Retry claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
            <Button onClick={promote} disabled={loading}>Promote</Button>
            <Button variant="outline" onClick={retry} disabled={loading}>Retry claims-sync</Button>
            <Button variant="ghost" onClick={() => loadUsers()}>Refresh list</Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">Promote will create or update a user in the DB and attempt to set Firebase custom claims. Retry will attempt to sync existing user's custom claims by email.</p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-lg font-medium mb-3">Users</h2>
        {loading && <div>Loading…</div>}
        {!loading && users && users.length === 0 && <div className="text-sm text-muted-foreground">No users found.</div>}
        <div className="space-y-2">
          {users && users.map(u => (
            <Card key={u._id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="text-sm text-muted-foreground">{u.name} • role: {u.role} • uid: {u.firebase_uid || '—'}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setEmail(u.email); }}>Use</Button>
                  <Button size="sm" variant="secondary" onClick={async () => { try { await api.patch(`/v1/users/${u._id}/role`, { role: 'admin' }); toast({ title: 'Role updated' }); loadUsers(); } catch(e){ toast({ title: 'Update failed', variant: 'destructive' }) } }}>Promote</Button>
                  <Button size="sm" variant="outline" onClick={async () => { try { const res = await api.post('/v1/users/sync-claims', { email: u.email }); if (res?.data?.status === 'success') toast({ title: 'Claims synced' }); else toast({ title: res?.data?.message || 'Failed', variant: 'destructive' }); } catch(e){ toast({ title: 'Sync failed', variant: 'destructive' }) } }}>Retry claims-sync</Button>
                  <Button size="sm" variant="ghost" onClick={() => loadHistory(u._id)}>History</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* History modal */}
      {selectedHistory && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
          <div className="bg-card p-4 rounded shadow max-h-[80vh] w-full max-w-3xl overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">User history</h3>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setSelectedHistory(null)}>Close</Button>
              </div>
            </div>
            {historyLoading && <div>Loading…</div>}
            {!historyLoading && selectedHistory && selectedHistory.length === 0 && <div className="text-sm text-muted-foreground">No history found.</div>}
            <div className="space-y-2">
              {selectedHistory && selectedHistory.map((l:any) => (
                <div key={l._id} className="border-b pb-2">
                  <div className="text-sm"><strong>{l.event_type}</strong> • {new Date(l.timestamp).toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{l.actor} — {l.action}</div>
                  <pre className="text-xs mt-1 bg-muted p-2 rounded">{JSON.stringify(l.details || {}, null, 2)}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
