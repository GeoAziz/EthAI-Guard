'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, XCircle, Zap, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'completed' | 'running' | 'failed' | 'queued' | 'cancelled' | 'processing';

interface StatusBadgeProps {
  status: Status;
  withIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: any; icon: React.ReactNode; color: string }> = {
  completed: {
    label: 'Completed',
    variant: 'completed',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    color: 'text-green-600',
  },
  running: {
    label: 'Running',
    variant: 'running',
    icon: <Zap className="w-3.5 h-3.5 animate-pulse" />,
    color: 'text-blue-600',
  },
  failed: {
    label: 'Failed',
    variant: 'failed',
    icon: <XCircle className="w-3.5 h-3.5" />,
    color: 'text-red-600',
  },
  queued: {
    label: 'Queued',
    variant: 'pending',
    icon: <Clock className="w-3.5 h-3.5" />,
    color: 'text-gray-600',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'inactive',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    color: 'text-orange-600',
  },
  processing: {
    label: 'Processing',
    variant: 'running',
    icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    color: 'text-blue-600',
  },
};

export function StatusBadge({
  status,
  withIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1.5 flex items-center',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1',
        className,
      )}
    >
      {withIcon && <span className={config.color}>{config.icon}</span>}
      <span>{config.label}</span>
    </Badge>
  );
}

export function getStatusColor(status: Status): string {
  return statusConfig[status].color;
}

export function getStatusLabel(status: Status): string {
  return statusConfig[status].label;
}
