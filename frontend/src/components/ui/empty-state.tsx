'use client';

import React from 'react';
import { AlertCircle, FileText, Inbox, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  variant?: 'default' | 'no-results' | 'error';
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  variant = 'default',
}: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (variant) {
      case 'no-results':
        return <Search className="w-12 h-12 text-muted-foreground/60" />;
      case 'error':
        return <AlertCircle className="w-12 h-12 text-destructive/60" />;
      default:
        return <Inbox className="w-12 h-12 text-muted-foreground/60" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:py-16 sm:px-6 lg:py-20 lg:px-8">
      <div className="text-center">
        {icon || getDefaultIcon()}
        <h3 className="mt-4 text-lg sm:text-xl font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-sm">{description}</p>
        )}
        {(actionLabel || actionHref) && (
          <div className="mt-6">
            {actionHref ? (
              <a href={actionHref}>
                <Button className="w-fit">{actionLabel || 'Get Started'}</Button>
              </a>
            ) : (
              <Button onClick={actionOnClick} className="w-fit">
                {actionLabel || 'Try Again'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
