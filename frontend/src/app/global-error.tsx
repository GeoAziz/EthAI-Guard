'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Global Error Boundary (500)
 * Catches errors in the root layout
 * Provides emergency recovery and support options
 *
 * NOTE: This must be wrapped by a Server Component handler in _error page
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [mounted, setMounted] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(isDevelopment);
  const [errorId] = React.useState(() =>
    Math.random().toString(36).substring(2, 11).toUpperCase(),
  );
  const [systemStatus, setSystemStatus] = React.useState<{
    api: boolean;
    database: boolean;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = React.useState(false);

  useEffect(() => {
    setMounted(true);

    // Log critical error
    console.error('Critical error in global boundary:', error);
    if (isDevelopment) {
      console.error('Stack:', error?.stack);
    }
  }, [error]);

  const checkSystemStatus = async () => {
    setCheckingStatus(true);
    try {
      const [apiResponse, dbResponse] = await Promise.allSettled([
        fetch('/api/health').then(r => r.ok),
        fetch('/api/health/db').then(r => r.ok),
      ]);

      setSystemStatus({
        api: apiResponse.status === 'fulfilled' && apiResponse.value,
        database: dbResponse.status === 'fulfilled' && dbResponse.value,
      });
    } catch (err) {
      console.error('Failed to check system status:', err);
      setSystemStatus({ api: false, database: false });
    } finally {
      setCheckingStatus(false);
    }
  };

  if (!mounted) {
    return (
      <html>
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950 to-red-900 p-4">
            <div className="text-center text-white">
              <p>Loading...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const errorMessage = error?.message || 'Critical system error';
  const isRecoverable = errorMessage.toLowerCase().includes('network') === false;

  return (
    <html>
      <body className="bg-gradient-to-br from-background to-background/95">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 animate-fade-in">
            {/* Critical Error Icon */}
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-900/30 border-2 border-red-700/50 animate-pulse">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            {/* Status Badge */}
            <div className="text-center">
              <div className="inline-block px-4 py-2 rounded-full bg-red-900/30 border border-red-700/50">
                <span className="text-sm font-mono font-bold text-red-300">
                  CRITICAL ERROR
                </span>
              </div>
            </div>

            {/* Error Title */}
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-red-300">
                System Error
              </h1>
              <p className="text-base text-muted-foreground">
                We encountered a critical error and need to restart.
              </p>
            </div>

            {/* Error ID and Timestamp */}
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/30 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Error ID</p>
                <p className="font-mono text-sm text-red-300 font-semibold break-all">
                  {errorId}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time</p>
                <p className="text-sm text-foreground">
                  {new Date().toLocaleString()}
                </p>
              </div>
            </div>

            {/* System Status Check */}
            {!systemStatus && (
              <Button
                onClick={checkSystemStatus}
                disabled={checkingStatus}
                className="w-full"
                variant="outline"
                size="sm"
              >
                {checkingStatus ? 'Checking...' : 'Check System Status'}
              </Button>
            )}

            {systemStatus && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <p className="text-xs font-semibold text-foreground">System Status</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Service</span>
                    <span
                      className={
                        systemStatus.api
                          ? 'text-green-400 font-semibold'
                          : 'text-red-400 font-semibold'
                      }
                    >
                      {systemStatus.api ? '✓ Online' : '✗ Offline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Database</span>
                    <span
                      className={
                        systemStatus.database
                          ? 'text-green-400 font-semibold'
                          : 'text-red-400 font-semibold'
                      }
                    >
                      {systemStatus.database ? '✓ Online' : '✗ Offline'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Recovery Action */}
            <Button
              onClick={() => {
                // Reload page completely
                window.location.href = '/';
              }}
              className="w-full justify-between gap-2 bg-red-600 hover:bg-red-700"
              size="lg"
            >
              <RefreshCw className="w-4 h-4" />
              Restart Application
            </Button>

            {/* Fallback Recovery */}
            {isRecoverable && (
              <Button
                onClick={() => reset()}
                className="w-full"
                variant="outline"
                size="sm"
              >
                Try to Recover
              </Button>
            )}

            {/* Development Details */}
            {isDevelopment && (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full text-left text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-between"
                  aria-expanded={showDetails}
                >
                  <span>Error Details</span>
                  <span className="text-xs">{showDetails ? '−' : '+'}</span>
                </button>

                {showDetails && (
                  <div className="mt-2 text-xs font-mono text-red-300 bg-black/30 p-3 rounded max-h-64 overflow-auto whitespace-pre-wrap break-words animate-fade-in">
                    Error Message:
                    {'\n'}
                    {error?.message}
                    {error?.stack && (
                      <>
                        {'\n\nStack Trace:\n'}
                        {error.stack}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Emergency Support */}
            <div className="text-center border-t pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                If this problem persists, please contact our support team with Error ID: <span className="font-mono">{errorId}</span>
              </p>
              <a
                href="https://support.ethixai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                Contact Support
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
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.5;
                }
              }
              .animate-fade-in {
                animation: fade-in-up 0.5s ease-out;
              }
              .animate-pulse {
                animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
            Critical system error occurred. Error ID: {errorId}. Please restart the application. For assistance, contact support.
          </div>
        </div>
      </body>
    </html>
  );
}
