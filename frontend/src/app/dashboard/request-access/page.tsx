'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function RequestAccessPage() {
  const { user, loading, roles, refreshRoles, hasRole } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);

  const { toast } = useToast();

  const submit = async () => {
    if (!reason) {return;}
    setStatus('submitting');
    try {
      const payload: any = { reason };
      // include name/email if available from auth
      if ((user as any)?.name) {payload.name = (user as any).name;}
      if ((user as any)?.email) {payload.email = (user as any).email;}
      const res = await api.post('/v1/access-requests', payload);
      // backend returns { status: 'created', id }
      setRequestId(res.data?.id || null);
      setStatus('submitted');
      toast({ title: 'Request submitted', description: 'An administrator will review your request.', variant: 'default' });
    } catch (err: any) {
      console.error('Access request failed', err);
      setStatus('error');
      toast({ title: 'Request failed', description: 'Unable to submit access request. Try again later.', variant: 'destructive' });
    }
  };

  // After submission, poll for role changes so the UI updates automatically when an admin approves
  const pollRef = useRef<number | null>(null);
  useEffect(() => {
    if (status !== 'submitted') {return;}
    let attempts = 0;
    const maxAttempts = 24; // poll for up to ~2 minutes (24 * 5s)

    const doPoll = async () => {
      attempts += 1;
      try {
        await refreshRoles();
        if (hasRole('admin')) {
          toast({ title: 'Access granted', description: 'Your role is now admin. Reloading…' });
          // stop polling
          if (pollRef.current) {window.clearInterval(pollRef.current);}
        }
      } catch (e) {
        // ignore errors during polling
      }
      if (attempts >= maxAttempts && pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };

    // run immediately then every 5s
    doPoll();
    pollRef.current = window.setInterval(doPoll, 5000);

    return () => {
      if (pollRef.current) {window.clearInterval(pollRef.current);}
    };
  }, [status, refreshRoles, hasRole, toast]);

  if (loading) {return <div className="p-8">Loading…</div>;}

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Request Admin Access</h1>
      <p className="text-sm text-muted-foreground mb-4">Current roles: {roles && roles.length ? roles.join(', ') : 'none'}</p>

      {status === 'submitted' ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <p>Your request has been submitted. An administrator will review it.</p>
          {requestId && <p className="text-sm text-muted-foreground">Request ID: <code>{requestId}</code></p>}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm">Why do you need admin access?</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded p-2" rows={4} />
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!reason || status === 'submitting'}>{status === 'submitting' ? 'Sending…' : 'Send Request'}</Button>
          </div>
          {status === 'error' && <p className="text-sm text-red-500">Failed to send request. Try again later.</p>}
        </div>
      )}
    </div>
  );
}
