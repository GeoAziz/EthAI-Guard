'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AuthLayout } from '@/components/auth/auth-layout';

export default function VerifyEmailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [sending, setSending] = React.useState(false);

  async function handleResend() {
    setSending(true);
    try {
      const current = auth.currentUser;
      if (!current) {
        toast({ title: 'Not signed in', description: 'Please sign in first to resend verification email.', variant: 'destructive' });
        setSending(false);
        return;
      }
      await sendEmailVerification(current);
      toast({ title: 'Verification Sent', description: 'A verification email was sent. Check your inbox and click the link to verify.', duration: 8000 });
    } catch (e) {
      console.error('resend failed', e);
      toast({ title: 'Failed to send', description: 'Could not send verification email. Try again later.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout title="Verify your email" description="We sent a verification link to your email." quote="Check your inbox and follow the verification link to continue.">
      <div className="space-y-4 max-w-md mx-auto text-center">
        <p>If you didn't receive the email, click the button below to resend the verification email.</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleResend} disabled={sending}>{sending ? 'Sending...' : 'Resend verification email'}</Button>
          <Button variant="ghost" onClick={() => router.push('/login')}>Back to sign in</Button>
        </div>
        <p className="text-sm text-muted-foreground">If you still don't receive the email, check spam folders or contact support.</p>
      </div>
    </AuthLayout>
  );
}
