'use client';
import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { CheckCircle2, Clock, Send, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RequestAccessPage() {
  const { user, loading, roles, refreshRoles, hasRole } = useAuth();
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);

  const { toast } = useToast();

  const submit = async () => {
    if (!reason.trim()) {return;}
    setStatus('submitting');
    try {
      const payload: any = { reason: reason.trim() };
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Request Admin Access</h2>
        <p className="text-muted-foreground mt-1">
          Elevate your permissions to access admin features
        </p>
      </div>

      {/* Current Role Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Current Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {roles && roles.length > 0 ? (
              roles.map((role) => (
                <Badge key={role} variant="secondary" className="capitalize">
                  {role}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                No roles assigned
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success State */}
      {status === 'submitted' ? (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-600 dark:text-green-400">Request Submitted</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>Your request has been submitted successfully. An administrator will review it shortly.</p>
            {requestId && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Request ID: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{requestId}</code>
              </p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        /* Request Form */
        <Card>
          <CardHeader>
            <CardTitle>Request Form</CardTitle>
            <CardDescription>
              Please provide a reason for your access request. This helps administrators make informed decisions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Why do you need admin access?</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe your role and why you need elevated permissions..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be specific about the tasks you need to perform.
              </p>
            </div>

            {status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to submit request. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={submit}
              disabled={!reason.trim() || status === 'submitting'}
              className="w-full sm:w-auto"
            >
              {status === 'submitting' ? (
                <>
                  <span className="mr-2 inline-block">
                    <LoadingSpinner size="sm" />
                  </span>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
