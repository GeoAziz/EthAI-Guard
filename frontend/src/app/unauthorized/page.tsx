'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Home, LogOut, ArrowRight, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnnounce } from '@/contexts/AnnounceContext';

/**
 * Unauthorized (403) Error Page
 * Displays when user is authenticated but lacks permission to access a resource
 *
 * Scenarios:
 * - User tries to access admin page without admin role
 * - User tries to access reviewer reports without reviewer role
 * - Resource exists but user has no access permission
 */

type ErrorContext = 'role-required' | 'resource-forbidden' | 'permission-denied' | 'unknown';

interface ErrorDetails {
  context: ErrorContext;
  title: string;
  description: string;
  requiredRole?: string;
  adminMessage?: string;
  suggestion?: string;
}

const ERROR_MESSAGES: Record<ErrorContext, ErrorDetails> = {
  'role-required': {
    context: 'role-required',
    title: 'Admin Access Required',
    description: 'This page is restricted to administrators only.',
    requiredRole: 'Admin',
    suggestion: 'Contact your administrator to request admin access.',
    adminMessage: 'Only administrators can access this resource.',
  },
  'resource-forbidden': {
    context: 'resource-forbidden',
    title: 'Access Forbidden',
    description: 'You do not have permission to access this resource.',
    suggestion: 'This resource may have been deleted or restricted.',
    adminMessage: 'This resource is not available to your account.',
  },
  'permission-denied': {
    context: 'permission-denied',
    title: 'Permission Denied',
    description: 'Your current role does not grant you access to this resource.',
    suggestion: 'You may request a role upgrade to gain access.',
    adminMessage: 'Your account permissions are insufficient for this resource.',
  },
  'unknown': {
    context: 'unknown',
    title: 'Access Denied',
    description: 'You do not have permission to view this page.',
    suggestion: 'If you believe this is an error, contact your administrator.',
    adminMessage: 'Access has been blocked for security reasons.',
  },
};

export default function UnauthorizedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, roles, loading } = useAuth();
  const { toast } = useToast();
  const announce = useAnnounce();

  // State management
  const [errorContext, setErrorContext] = React.useState<ErrorContext>('unknown');
  const [attemptedResource, setAttemptedResource] = React.useState<string | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);

  // Parse URL parameters to determine error context
  useEffect(() => {
    const context = searchParams.get('context') as ErrorContext | null;
    const resource = searchParams.get('resource');

    if (context && Object.keys(ERROR_MESSAGES).includes(context)) {
      setErrorContext(context);
    }

    if (resource) {
      setAttemptedResource(decodeURIComponent(resource));
    }

    // Announce to screen readers
    const errorMsg = ERROR_MESSAGES[context || 'unknown'];
    announce(`${errorMsg.title}. ${errorMsg.description}`);
  }, [searchParams, announce]);

  // Log unauthorized attempt for analytics
  useEffect(() => {
    if (user) {
      // Could be sent to analytics service
      // analytics.track('unauthorized_access_attempt', {
      //   userId: user.uid,
      //   context: errorContext,
      //   resource: attemptedResource,
      //   roles: roles,
      //   timestamp: new Date().toISOString(),
      // });
    }
  }, [user, errorContext, attemptedResource, roles]);

  const errorDetails = ERROR_MESSAGES[errorContext];
  const isAuthenticated = !loading && user;
  const hasAnyRole = isAuthenticated && roles && roles.length > 0;

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="animate-pulse">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          </div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-900/20 border border-red-700/30">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Error Code */}
        <div className="text-center space-y-1">
          <div className="inline-block px-3 py-1 rounded-full bg-red-900/20 border border-red-700/30">
            <span className="text-xs font-mono font-semibold text-red-400">
              Error 403
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            {errorDetails.title}
          </h1>
          <p className="text-base text-muted-foreground">
            {errorDetails.description}
          </p>
        </div>

        {/* Attempted Resource (if available) */}
        {attemptedResource && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground font-mono break-all">
              <span className="font-semibold">Resource:</span> {attemptedResource}
            </p>
          </div>
        )}

        {/* Additional Context */}
        <div className="p-4 rounded-lg bg-amber-900/10 border border-amber-700/20 space-y-2">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {errorDetails.suggestion || 'Access to this resource has been restricted.'}
              </p>
            </div>
          </div>
        </div>

        {/* Current User Info (if authenticated) */}
        {isAuthenticated && (
          <div className="p-3 rounded-lg bg-blue-900/10 border border-blue-700/20">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Signed in as:</span> {user?.email}
            </p>
            {hasAnyRole && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold">Roles:</span> {roles.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          {isAuthenticated ? (
            <>
              {/* Go to Dashboard */}
              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full justify-between gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Request Access */}
              {hasAnyRole && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/request-access')}
                  className="w-full justify-between gap-2"
                >
                  Request Role Upgrade
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}

              {/* Home Button */}
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full justify-between gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>

              {/* Support */}
              <Button
                variant="ghost"
                onClick={() => router.push('/support')}
                className="w-full justify-between gap-2 text-primary hover:text-primary"
              >
                <HelpCircle className="w-4 h-4" />
                Contact Support
              </Button>
            </>
          ) : (
            <>
              {/* Sign In (for guests) */}
              <Button
                onClick={() => router.push('/login')}
                className="w-full justify-between gap-2"
              >
                Sign In
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Home (for guests) */}
              <Button
                variant="outline"
                onClick={() => router.push('/')}
                className="w-full justify-between gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </>
          )}
        </div>

        {/* Details Toggle (optional) */}
        {!showDetails && (
          <button
            onClick={() => {
              setShowDetails(true);
              announce('Showing additional details about access requirements.');
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 text-center border-t"
            aria-label="Show additional details about access requirements"
          >
            Show more details
          </button>
        )}

        {/* Detailed Explanation */}
        {showDetails && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 animate-fade-in">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Why am I seeing this?
              </h3>
              <p className="text-sm text-muted-foreground">
                {errorDetails.adminMessage || errorDetails.description}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                What can I do?
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Check if you're signed in with the correct account</li>
                {errorContext === 'role-required' && (
                  <li>Request admin access through your administrator</li>
                )}
                {errorContext === 'permission-denied' && (
                  <li>Request a role upgrade to gain access</li>
                )}
                <li>Contact support for assistance</li>
              </ul>
            </div>
          </div>
        )}

        {/* CSS for animations */}
        <style>{`
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
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        Error 403: {errorDetails.title}. {errorDetails.description}
      </div>
    </div>
  );
}
