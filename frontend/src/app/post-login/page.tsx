'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useAnnounce } from '@/contexts/AnnounceContext';
import { pickPrimaryRole, defaultRouteForRoles } from '@/lib/rbac';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { UserRole } from '@/lib/rbac';

// Role-specific branding and messages
const ROLE_MESSAGES: Record<UserRole | string, { title: string; subtitle: string }> = {
  admin: {
    title: 'Preparing Admin Console',
    subtitle: 'Initializing user management and organization settings...',
  },
  analyst: {
    title: 'Loading Analysis Workspace',
    subtitle: 'Setting up your bias analysis tools...',
  },
  reviewer: {
    title: 'Loading Compliance Dashboard',
    subtitle: 'Preparing fairness review interface...',
  },
  user: {
    title: 'Welcome Back',
    subtitle: 'Loading your dashboard...',
  },
  guest: {
    title: 'Redirecting',
    subtitle: 'Please sign in to continue...',
  },
};

export default function PostLoginRedirect() {
  const { roles, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const announce = useAnnounce();

  // State management for redirect flow
  const [error, setError] = React.useState<'timeout' | 'no-role' | 'redirect-failed' | null>(null);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [destinationRole, setDestinationRole] = React.useState<UserRole | null>(null);
  const [destinationUrl, setDestinationUrl] = React.useState<string | null>(null);

  // Timeout detection hook
  useEffect(() => {
    const TIMEOUT_MS = 8000; // 8 second timeout
    const timerInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 100);
    }, 100);

    const timeoutTimer = setTimeout(() => {
      if (!destinationUrl) {
        setError('timeout');
        announce('Redirect timed out after 8 seconds. Please use the navigation links below.');
      }
    }, TIMEOUT_MS);

    return () => {
      clearInterval(timerInterval);
      clearTimeout(timeoutTimer);
    };
  }, [destinationUrl, announce]);

  // Main redirect logic
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // Determine destination role by priority
    const role = pickPrimaryRole(roles);

    if (!role || role === 'guest') {
      // No valid role found
      setError('no-role');
      announce('No valid role found. Redirecting to login.');
      setTimeout(() => {
        router.replace('/login');
      }, 2000);
      return;
    }

    // Set UI state for role-specific messaging
    setDestinationRole(role);

    // Use RBAC utility to get the destination URL
    const destination = defaultRouteForRoles(roles);
    setDestinationUrl(destination);

    // Announce to screen reader
    announce(`Redirecting to ${ROLE_MESSAGES[role]?.title || 'dashboard'}`);

    // Perform the redirect with a small delay for smooth UX
    const redirectTimer = setTimeout(() => {
      try {
        router.replace(destination);
      } catch (err) {
        setError('redirect-failed');
        announce('Failed to redirect. Please use the navigation links below.');
      }
    }, 500);

    return () => clearTimeout(redirectTimer);
  }, [authLoading, roles, router, announce]);

  // Loading state (auth still loading)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <LoadingSpinner />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Authenticating</h2>
            <p className="text-sm text-muted-foreground">
              Verifying your credentials and loading permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error: Timeout
  if (error === 'timeout') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-red-900/20 border border-red-700/30">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Redirect Timeout (8s)
            </h2>
            <p className="text-sm text-muted-foreground">
              The system took too long to redirect you. This may be a network issue or service delay.
            </p>
          </div>

          {/* Manual navigation fallback */}
          <div className="space-y-2 bg-muted/50 rounded-lg p-4 border border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Quick Navigation:</p>
            <div className="flex flex-col gap-2">
              {roles?.includes('admin') && (
                <Button
                  onClick={() => router.push('/dashboard/admin')}
                  className="w-full justify-between"
                >
                  Admin Console <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {roles?.includes('analyst') && (
                <Button
                  onClick={() => router.push('/dashboard/analyst')}
                  className="w-full justify-between"
                >
                  Analysis Workspace <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {roles?.includes('reviewer') && (
                <Button
                  onClick={() => router.push('/dashboard/reviewer')}
                  className="w-full justify-between"
                >
                  Compliance Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {roles?.includes('user') && (
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full justify-between"
                >
                  Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push('/support')}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </div>
    );
  }

  // Error: No valid role
  if (error === 'no-role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-yellow-900/20 border border-yellow-700/30">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              No Valid Role Found
            </h2>
            <p className="text-sm text-muted-foreground">
              Your account doesn't have an assigned role. Please contact your administrator.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push('/support')}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </div>
    );
  }

  // Successful redirect in progress
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
      <div className="text-center space-y-6 max-w-md mx-auto animate-fade-in">
        <LoadingSpinner />

        {/* Role-specific message */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">
            {destinationRole
              ? ROLE_MESSAGES[destinationRole]?.title
              : 'Loading'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {destinationRole
              ? ROLE_MESSAGES[destinationRole]?.subtitle
              : 'Setting up your account...'}
          </p>
        </div>

        {/* Loading progress indicator */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-muted-foreground">
            {Math.floor(elapsedTime / 100)}.{String(elapsedTime % 100).padStart(2, '0')}s
          </span>
          <div className="text-xs text-muted-foreground animate-pulse">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: `blink 1.4s infinite ${i * 0.2}s`,
                  }}
                >
                  .
                </span>
              ))}
          </div>
        </div>

        {/* CSS for blink animation */}
        <style>{`
          @keyframes blink {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
          }
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in-up 0.5s ease-out;
          }
        `}
        </style>
      </div>

      {/* Hidden text for screen readers */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {destinationRole
          ? `${ROLE_MESSAGES[destinationRole]?.title}. ${ROLE_MESSAGES[destinationRole]?.subtitle}`
          : 'Redirecting to dashboard'}
      </div>
    </div>
  );
}
