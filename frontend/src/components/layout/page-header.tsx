'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  /** Show refresh button with optional handler */
  onRefresh?: () => void;
  /** Show "New" button with optional handler and custom label */
  onNew?: () => void;
  newLabel?: string;
  /** Hide all action buttons */
  hideActions?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  children,
  onRefresh,
  onNew,
  newLabel = 'New',
  hideActions = false,
}: PageHeaderProps) {
  const showActions = !hideActions && (onRefresh || onNew || children);

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {showActions && (
          <div className="flex items-center gap-2 flex-wrap">
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="min-h-9"
                aria-label="Refresh data"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Sync</span>
              </Button>
            )}
            {onNew && (
              <Button 
                size="sm" 
                onClick={onNew}
                className="min-h-9"
                aria-label={`Create new ${newLabel.toLowerCase()}`}
              >
                <Plus className="mr-2 h-4 w-4" />
                {newLabel}
              </Button>
            )}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
