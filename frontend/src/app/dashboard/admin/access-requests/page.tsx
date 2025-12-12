'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import AdminDashboardShell from '@/components/layout/AdminDashboardShell';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAnnounce } from '@/contexts/AnnounceContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

export default function AdminAccessRequests() {
  const [requests, setRequests] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'promote' | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [emailUser, setEmailUser] = useState(true);
  const announce = useAnnounce();
  const confirmButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/access-requests');
      // backend returns { items, count }
      const items = res.data?.items ?? (Array.isArray(res.data) ? res.data : []);
      setRequests(items);
    } catch (err: any) {
      // If backend not implemented yet, show helpful message
      console.warn('Failed to load access requests', err?.response?.status);
      setRequests([]);
      toast({ title: 'Access requests unavailable', description: 'Backend endpoint not implemented', variant: 'default' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // When the confirm dialog opens, focus the confirm button for keyboard users
  useEffect(() => {
    if (confirmOpen) {
      // small delay to allow dialog to mount
      setTimeout(() => confirmButtonRef.current?.focus(), 50);
    }
  }, [confirmOpen]);

  const beginAction = (action: 'approve' | 'reject' | 'promote', req: any) => {
    setSelected(req);
    // Use the same confirmation dialog for approve, reject, and promote so admins
    // can choose whether to notify the user via email. Default emailUser to true.
    setConfirmAction(action === 'promote' ? 'promote' : action === 'approve' ? 'approve' : 'reject');
    setEmailUser(true);
    setConfirmOpen(true);
  };

  const performAction = async () => {
    if (!selected || !confirmAction) {return;}
    setActionLoading(true);
    try {
      let res: any = null;
      if (confirmAction === 'promote') {
        // promote endpoint accepts email and role; include emailUser flag
        const email = selected.email || selected.name;
        res = await api.post('/v1/users/promote', { email, role: 'admin', emailUser });
        toast({ title: 'User promoted', description: `${email} set to admin` });
        announce(`${email} promoted to admin.`);
      } else {
        const id = selected._id || selected.id;
        const path = `/v1/access-requests/${id}/${confirmAction}`;
        res = await api.post(path, { emailUser });
        toast({ title: confirmAction === 'approve' ? 'Approved' : 'Rejected' });
      }

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
      setConfirmOpen(false);
      setEmailUser(true);
      setSelected(null);
      setConfirmAction(null);
      fetchRequests();
    } catch (e) {
      toast({ title: `${confirmAction} failed`, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Keep promoteUser for backward compatibility where direct promotion is used
  // elsewhere; it delegates to the same API and behavior.
  const promoteUser = async (email: string) => {
    setActionLoading(true);
    try {
      const res = await api.post('/v1/users/promote', { email, role: 'admin' });
      const claimsSync = res?.data?.claimsSync;
      toast({ title: 'User promoted', description: `${email} set to admin` });
      announce(`${email} promoted to admin.`);
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
      fetchRequests();
    } catch (err) {
      toast({ title: 'Promote failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const retryClaimsSync = async (email: string) => {
    if (!email) {return;}
    setActionLoading(true);
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
    } catch (err: any) {
      toast({ title: 'Claims sync failed', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RoleProtected required="admin">
      <AdminDashboardShell>
        <div className="p-4 sm:p-6 lg:p-8 w-full">
          <h1 className="text-xl sm:text-2xl font-semibold mb-2">Access Requests</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6">List of users requesting admin access. This page requires backend endpoints to be implemented.</p>

          {loading && <div className="py-8 text-center text-muted-foreground">Loading…</div>}

          {!loading && requests && requests.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <p>No pending requests or backend endpoint missing.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {requests && requests.map((r: any) => {
              const isPending = String(r.status).toLowerCase() === 'pending';
              let badgeClass = 'bg-yellow-100 text-yellow-800';
              if (String(r.status).toLowerCase() === 'approved') {badgeClass = 'bg-green-100 text-green-800';}
              if (String(r.status).toLowerCase() === 'rejected') {badgeClass = 'bg-red-100 text-red-800';}

              return (
                <Card key={r.id || r._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <CardTitle className="text-sm sm:text-base truncate">{r.email || r.name || r.requester || 'Unknown'}</CardTitle>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${badgeClass}`} aria-hidden>
                        {String(r.status).toUpperCase()}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs sm:text-sm text-muted-foreground">Reason: {r.reason}</p>
                    {r.handledBy && <p className="text-xs sm:text-sm text-muted-foreground">Handled By: {r.handledBy}</p>}
                    <p className="text-xs text-muted-foreground">Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button aria-label={`Approve request for ${r.email || r.name}`} onClick={() => beginAction('approve', r)} disabled={!isPending || actionLoading} size="sm" className="min-h-9">
                        Approve
                      </Button>
                      <Button aria-label={`Reject request for ${r.email || r.name}`} variant="ghost" onClick={() => beginAction('reject', r)} disabled={!isPending || actionLoading} size="sm" className="min-h-9">
                        Reject
                      </Button>
                      <Button aria-label={`Promote ${r.email || r.name} to admin`} variant="secondary" onClick={() => beginAction('promote' as any, r)} disabled={actionLoading} size="sm" className="min-h-9">
                        Promote
                      </Button>
                      {r.email && (
                        <Button aria-label={`Retry claims sync for ${r.email}`} variant="outline" onClick={() => retryClaimsSync(r.email)} disabled={actionLoading} size="sm" className="min-h-9">
                          Sync
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Confirmation dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent className="w-[95vw] max-w-sm">
              <DialogHeader>
                <DialogTitle>{confirmAction === 'approve' ? 'Approve request' : confirmAction === 'promote' ? 'Promote user' : 'Reject request'}</DialogTitle>
                <DialogDescription>
                  Are you sure you want to {confirmAction} the request for <strong className="break-all">{selected?.email || selected?.name}</strong>?
                </DialogDescription>
              </DialogHeader>
              <div className="px-1 py-3 space-y-3">
                <div className="flex items-start sm:items-center gap-3">
                  <Checkbox checked={emailUser} onCheckedChange={(v:any) => setEmailUser(Boolean(v))} id="emailUserToggle" className="mt-1" />
                  <Label htmlFor="emailUserToggle" className="text-xs sm:text-sm cursor-pointer">Send email notification to user</Label>
                </div>
                <p className="text-xs text-muted-foreground">When enabled, the user will receive an approve/reject email. This action is non-blocking — failures are reported but won't prevent the request from being processed.</p>
              </div>
              <DialogFooter className="gap-2 flex flex-col-reverse sm:flex-row">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={actionLoading} className="min-h-9">Cancel</Button>
                <Button ref={confirmButtonRef} onClick={performAction} disabled={actionLoading} className="min-h-9">{actionLoading ? 'Working…' : confirmAction === 'approve' ? 'Confirm Approve' : confirmAction === 'promote' ? 'Promote' : 'Confirm Reject'}</Button>
              </DialogFooter>
              <DialogClose />
            </DialogContent>
          </Dialog>
        </div>
      </AdminDashboardShell>
    </RoleProtected>
  );
}
