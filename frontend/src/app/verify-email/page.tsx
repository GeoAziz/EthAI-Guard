'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAnnounce } from '@/contexts/AnnounceContext';
import { Button } from '@/components/ui/button';
import { AuthLayout } from '@/components/auth/auth-layout';
import { toastMessages, getFirebaseErrorMessage } from '@/lib/toast-messages';
import type { ToastMessage } from '@/lib/toast-messages';
import { extractRoles } from '@/lib/auth-routing';
import { defaultRouteForRoles } from '@/lib/rbac';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Loader2, Mail, RotateCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const { toast } = useToast();
  const router = useRouter();
  const announce = useAnnounce();
  const [sending, setSending] = React.useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = React.useState(true);
  const [nextResendTime, setNextResendTime] = React.useState<number | null>(null);
  const [pollInterval, setPollInterval] = React.useState<NodeJS.Timeout | null>(null);
  const [resendAttempts, setResendAttempts] = React.useState(0);
  const [userEmail, setUserEmail] = React.useState<string>('');
  const [pollAttempt, setPollAttempt] = React.useState(0);
  const [pollingComplete, setPollingComplete] = React.useState(false);

  // Auto-redirect when email is verified (Phase 1 - Core)
  React.useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    const checkEmailVerified = async () => {
      try {
        // Refresh the current user to check email status
        if (!auth.currentUser) {
          if (isMounted) {
            toast(toastMessages.verifyEmail.sessionExpiredVerify);
            announce('Your session has ended. Please sign in again.');
            setTimeout(() => router.push('/login'), 1500);
          }
          return;
        }

        // Reload to get fresh emailVerified state
        await auth.currentUser.reload();

        if (isMounted) {
          setUserEmail(auth.currentUser.email || '');
        }

        if (auth.currentUser.emailVerified) {
          // Email verified! Get fresh roles and redirect
          if (isMounted) {
            try {
              const meRes = await api.get('/v1/users/me');
              const backendRoles = meRes?.data?.role;
              const roles = extractRoles(backendRoles);
              const destination = defaultRouteForRoles(roles);

              toast(toastMessages.verifyEmail.verificationDetected);
              announce('Your email has been verified. Redirecting to your dashboard.');

              // Give toast time to display, then redirect
              setTimeout(() => {
                if (isMounted) {
                  router.push(destination);
                }
              }, 2000);
            } catch (_) {
              // If role fetch fails, go to generic dashboard
              toast(toastMessages.verifyEmail.verificationDetected);
              announce('Your email has been verified. Redirecting.');
              setTimeout(() => {
                if (isMounted) {
                  router.push('/dashboard');
                }
              }, 2000);
            }
          }

          // Clear polling interval if it exists
          if (checkInterval) {
            clearInterval(checkInterval);
          }
          return;
        }
      } catch (err) {
        // Silently fail and continue polling
      }

      if (isMounted) {
        setIsCheckingVerification(false);
      }
    };

    // Initial check
    checkEmailVerified();

    // Set up polling every 5 seconds for 5 minutes max
    const maxChecks = 60; // 5 minutes * 60 seconds / 5 second interval
    let checkCount = 0;
    checkInterval = setInterval(() => {
      checkCount++;
      if (isMounted) {
        setPollAttempt(checkCount);
      }

      if (checkCount > maxChecks) {
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        // Polling timeout - show notification
        if (isMounted) {
          setPollingComplete(true);
          announce('Email verification check timed out. Please try resending the verification email.');
        }
      } else {
        checkEmailVerified();
      }
    }, 5000);

    setPollInterval(checkInterval);

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [router, toast, announce]);

  // Parse Firebase error codes and return appropriate toast message (Phase 1 - Core)
  function getResendErrorMessage(errorCode: string): ToastMessage {
    switch (errorCode) {
      case 'auth/too-many-requests':
        return toastMessages.verifyEmail.tooManyAttempts;
      case 'auth/network-request-failed':
      case 'auth/network-error':
        return toastMessages.verifyEmail.networkError;
      case 'auth/user-disabled':
        return getFirebaseErrorMessage(errorCode);
      case 'auth/operation-not-allowed':
        return getFirebaseErrorMessage(errorCode);
      default:
        return toastMessages.verifyEmail.resendFailure;
    }
  }

  // Handle resend with cooldown (Phase 2 - Resilience)
  async function handleResend() {
    const now = Date.now();

    // Check cooldown
    if (nextResendTime && now < nextResendTime) {
      const secondsRemaining = Math.ceil((nextResendTime - now) / 1000);
      toast({
        ...toastMessages.verifyEmail.tooManyAttempts,
        description: `${toastMessages.verifyEmail.tooManyAttempts.description} (${secondsRemaining}s)`,
      });
      announce(`Please wait ${secondsRemaining} seconds before resending.`);
      return;
    }

    // Check if user is still logged in
    if (!auth.currentUser) {
      toast(toastMessages.verifyEmail.sessionExpiredVerify);
      announce('Your session has ended. Redirecting to sign in.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    setSending(true);
    try {
      await sendEmailVerification(auth.currentUser);

      // Set 5-minute cooldown
      const cooldownEnd = Date.now() + 5 * 60 * 1000;
      setNextResendTime(cooldownEnd);
      setResendAttempts(prev => prev + 1);

      toast(toastMessages.verifyEmail.resendSuccess);
      announce('Verification email sent. Check your inbox for the link.');

      // Countdown timer for the UI
      let remaining = 300; // 5 minutes in seconds
      const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          setNextResendTime(null);
        }
      }, 1000);
    } catch (e) {
      const errorCode = (e as any)?.code || 'unknown';
      const errorMessage = getResendErrorMessage(errorCode);

      toast(errorMessage);
      announce(`Failed to send verification email: ${errorMessage.title}`);

      // Track attempts to warn user about rate limiting
      if (errorCode === 'auth/too-many-requests') {
        setResendAttempts(prev => prev + 1);
      }
    } finally {
      setSending(false);
    }
  }

  // Calculate resend button disabled state
  const isResendDisabled = sending || (nextResendTime !== null && Date.now() < nextResendTime);
  const secondsUntilResend = nextResendTime ? Math.ceil((nextResendTime - Date.now()) / 1000) : 0;
  const resendButtonText = nextResendTime && Date.now() < nextResendTime
    ? `Resend email in ${secondsUntilResend}s`
    : sending
      ? 'Sending...'
      : 'Resend email';

  if (isCheckingVerification) {
    return (
      <AuthLayout
        title="Verify your email"
        description="We sent a verification link to your email."
        quote="Trust takes verification. Secure your account."
      >
        <div className="space-y-6 max-w-md mx-auto text-center flex flex-col items-center">
          <LoadingSpinner />
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">
              Checking email verification status...
            </p>
            {userEmail && (
              <p className="text-sm text-muted-foreground">
                {userEmail}
              </p>
            )}
            {pollAttempt > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>Attempt {pollAttempt} of 60</span>
              </div>
            )}
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      description={userEmail ? `We sent a link to ${userEmail}` : 'We sent a verification link to your email.'}
      quote="Trust takes verification. Secure your account."
    >
      <div className="space-y-4 max-w-md mx-auto text-center">
        <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
          <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-200">
            Check your email for the verification link
          </p>
        </div>

        <p className="text-sm">
          If you didn't receive the email, click the button below to resend the verification email.
        </p>

        {/* Responsive button layout (mobile-first) */}
        <div className="flex flex-col sm:flex-row gap-2 justify-center w-full pt-2">
          <Button
            onClick={handleResend}
            disabled={isResendDisabled}
            className="w-full sm:w-auto gap-2"
            aria-label={userEmail ? `Resend verification email to ${userEmail}` : 'Resend verification email'}
          >
            {sending && <Loader2 className="w-4 h-4 animate-spin" />}
            {resendButtonText}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
            className="w-full sm:w-auto"
            aria-label="Return to sign in page"
          >
            Back to sign in
          </Button>
        </div>

        {/* Change email link */}
        <div className="text-xs text-muted-foreground">
          <p>
            Wrong email?{' '}
            <Link
              href="/support"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
              aria-label="Go to support page to change email address"
            >
              Contact support to change it
            </Link>
          </p>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground border-t pt-4">
          <p>
            Check spam folders if you don't see the email. Still having trouble?{' '}
            <Link
              href="/support"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
              aria-label="Go to support page for help with email verification"
            >
              Contact support
            </Link>
            {'.'}
          </p>
        </div>

        {/* Show help alert earlier - after 1st failed attempt (was >3) */}
        {resendAttempts > 1 && (
          <div
            className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-md text-sm"
            role="alert"
            aria-live="polite"
          >
            <p className="text-amber-200 font-medium mb-2">Verification email not arriving?</p>
            <ul className="text-amber-200/90 text-xs space-y-1 list-disc list-inside">
              <li>Check your spam or promotions folder</li>
              <li>Whitelist noreply@firebase.com</li>
              <li>Wait 5 minutes between resend attempts</li>
              <li>Contact support if still having issues</li>
            </ul>
          </div>
        )}

        {/* Timeout warning after 5 minutes of polling */}
        {pollingComplete && !isCheckingVerification && (
          <div
            className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded-md text-sm"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-red-200 font-medium">
              Email verification check timed out (5 minutes)
            </p>
            <p className="text-red-200/90 text-xs mt-1">
              Please try resending the verification email or contact support for assistance.
            </p>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
