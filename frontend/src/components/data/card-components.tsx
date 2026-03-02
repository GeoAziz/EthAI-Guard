'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelCardProps {
  id: string;
  name: string;
  version?: string;
  description?: string;
  lastUsed?: Date;
  metrics?: Record<string, string | number>;
  selected?: boolean;
  onClick?: () => void;
  estimatedRuntime?: string;
}

export function ModelCard({
  id,
  name,
  version,
  description,
  lastUsed,
  metrics,
  selected = false,
  onClick,
  estimatedRuntime,
}: ModelCardProps) {
  const lastUsedText = lastUsed
    ? new Date(lastUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selected && 'ring-2 ring-primary border-primary',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{name}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            )}
          </div>
          {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {version && <Badge variant="secondary" className="text-xs">{version}</Badge>}
          {estimatedRuntime && (
            <Badge variant="outline" className="text-xs">
              ~{estimatedRuntime}
            </Badge>
          )}
          {lastUsedText && (
            <span className="text-xs text-muted-foreground">Used {lastUsedText}</span>
          )}
        </div>

        {metrics && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key}>
                <div className="text-xs text-muted-foreground capitalize">{key}</div>
                <div className="text-sm font-semibold">{value}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DatasetCardProps {
  id: string;
  name: string;
  rowCount?: number;
  columnCount?: number;
  size?: string;
  uploadDate?: Date;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
  previewUrl?: string;
}

export function DatasetCard({
  id,
  name,
  rowCount,
  columnCount,
  size,
  uploadDate,
  description,
  selected = false,
  onClick,
  previewUrl,
}: DatasetCardProps) {
  const uploadedText = uploadDate
    ? new Date(uploadDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: uploadDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      })
    : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selected && 'ring-2 ring-primary border-primary',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{name}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {description}
              </CardDescription>
            )}
          </div>
          {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {rowCount !== undefined && (
            <div>
              <div className="text-muted-foreground">Rows</div>
              <div className="font-semibold">{rowCount.toLocaleString()}</div>
            </div>
          )}
          {columnCount !== undefined && (
            <div>
              <div className="text-muted-foreground">Columns</div>
              <div className="font-semibold">{columnCount}</div>
            </div>
          )}
          {size && (
            <div>
              <div className="text-muted-foreground">Size</div>
              <div className="font-semibold">{size}</div>
            </div>
          )}
          {uploadedText && (
            <div>
              <div className="text-muted-foreground">Uploaded</div>
              <div className="font-semibold text-xs">{uploadedText}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SelectableCardProps {
  title: string;
  description?: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}

export function SelectableCard({
  title,
  description,
  selected = false,
  onClick,
  icon,
  badge,
  children,
  className,
}: SelectableCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selected && 'ring-2 ring-primary border-primary',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          {selected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}
