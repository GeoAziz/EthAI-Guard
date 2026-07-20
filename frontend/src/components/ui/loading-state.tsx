import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: React.ReactNode;
  className?: string;
  loadingText?: string;
}

export function LoadingState({
  loading = false,
  error = null,
  onRetry,
  children,
  className,
  loadingText = 'Loading...',
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground sr-only">{loadingText}</span>
        <span className="ml-2 text-sm text-muted-foreground" aria-hidden="true">{loadingText}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('text-center py-8', className)} role="alert">
        <p className="text-sm text-destructive">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface EmptyStateProps {
  message?: string;
  className?: string;
}

export function EmptyState({
  message = 'No data available',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
      {message}
    </div>
  );
}
