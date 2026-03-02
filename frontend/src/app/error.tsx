'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, HelpCircle } from 'lucide-react';

/**
 * Error Boundary Component (500)
 * Catches errors within a specific route segment
 * Provides error recovery and support options
 */

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(isDevelopment);
  const [errorId] = React.useState(() =>
    Math.random().toString(36).substring(2, 11).toUpperCase(),
  );

  useEffect(() => {
    setMounted(true);

    // Log error for debugging (in dev) and monitoring (in prod)
    if (isDevelopment) {
      console.error('Error caught by boundary:', error);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    } else {
      // In production, send to monitoring service
      // Example: sendErrorToMonitoring({ errorId, message: error.message })
      console.error('An error occurred. Error ID:', errorId);
    }
  }, [error, errorId]);

  if (!mounted) {
    return null;
  }

  const errorMessage = error?.message || 'An unexpected error occurred';
  const isNetworkError =
    errorMessage.toLowerCase().includes('fetch') ||
    errorMessage.toLowerCase().includes('network');
  const isAuthError =
    errorMessage.toLowerCase().includes('unauthorized') ||
    errorMessage.toLowerCase().includes('authentication');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-red-900/20 border border-red-700/30">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-red-900/20 border border-red-700/30">
            <span className="text-xs font-mono font-semibold text-red-400">
              Error 500
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Something Went Wrong
          </h1>
          <p className="text-base text-muted-foreground">
            {isNetworkError
              ? 'Network connection error. Please check your internet connection.'
              : isAuthError
                ? 'Authentication error. Please try signing in again.'
                : 'An unexpected error occurred. Our team has been notified.'}
          </p>
        </div>

        {/* Error ID */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Error ID</p>
          <p className="font-mono text-sm text-foreground font-semibold break-all">
            {errorId}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Share this ID with support to help resolve the issue faster.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => reset()}
            className="w-full justify-between gap-2"
            variant="default"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>

          <Button
            onClick={() => router.push('/')}
            className="w-full justify-between gap-2"
            variant="outline"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>

        {/* Development Details (only show in dev) */}
        {isDevelopment && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full text-left text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-between"
              aria-expanded={showDetails}
              aria-controls="error-details"
            >
              <span>Development Details</span>
              <span className="text-xs">{showDetails ? '−' : '+'}</span>
            </button>

            {showDetails && (
              <div
                id="error-details"
                className="mt-2 text-xs font-mono text-red-300 bg-black/20 p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap break-words animate-fade-in"
              >
                {error?.message}
                {error?.stack && (
                  <>
                    {'\n\n'}
                    {error.stack}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Support Link */}
        <div className="text-center border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Need help?
          </p>
          {isAuthError ? (
            <Button
              variant="ghost"
              onClick={() => router.push('/login')}
              className="w-full justify-between gap-2 text-primary hover:text-primary"
              size="sm"
            >
              Sign In Again
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => router.push('/support')}
              className="w-full justify-between gap-2 text-primary hover:text-primary"
              size="sm"
            >
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </Button>
          )}
        </div>

        {/* Status Page Link */}
        <div className="text-center text-xs">
          <a
            href="https://status.ethixai.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors underline"
          >
            Check service status
          </a>
        </div>

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

      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        Error 500: Something went wrong. {errorMessage} Error ID: {errorId}
      </div>
    </div>
  );
}
