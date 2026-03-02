'use client';
import React from 'react';

interface Metric {
  name: string;
  value: number;
  threshold: number;
  unit?: string;
  description?: string;
  status: 'pass' | 'warning' | 'critical';
}

interface FairnessMetricCardProps {
  metric: Metric;
  affectedGroups?: string[];
}

export function FairnessMetricCard({
  metric,
  affectedGroups = [],
}: FairnessMetricCardProps) {
  const percentage = (metric.value / metric.threshold) * 100;
  const isAlert = metric.status === 'critical';
  const isWarning = metric.status === 'warning';

  // Color mapping
  const borderColor = isAlert
    ? 'border-red-200'
    : isWarning
      ? 'border-yellow-200'
      : 'border-green-200';

  const bgColor = isAlert
    ? 'bg-red-50'
    : isWarning
      ? 'bg-yellow-50'
      : 'bg-green-50';

  const statusColor = isAlert
    ? 'text-red-600'
    : isWarning
      ? 'text-yellow-600'
      : 'text-green-600';

  const barColor = isAlert
    ? 'bg-red-500'
    : isWarning
      ? 'bg-yellow-500'
      : 'bg-green-500';

  const statusLabel = isAlert
    ? 'ALERT'
    : isWarning
      ? 'WARNING'
      : 'PASS';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 sm:p-6`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm sm:text-base mb-1">
            {metric.name}
          </h4>
          {metric.description && (
            <p className="text-xs text-muted-foreground">
              {metric.description}
            </p>
          )}
        </div>
        <span
          className={`inline-block px-2 py-1 rounded text-xs font-bold ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs sm:text-sm mb-1">
          <span className="text-muted-foreground">Value</span>
          <span className="font-medium">
            {metric.value.toFixed(4)} {metric.unit || ''}
          </span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm mb-2">
          <span className="text-muted-foreground">Threshold</span>
          <span className="font-medium">
            {metric.threshold.toFixed(4)} {metric.unit || ''}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${barColor} h-full transition-all duration-300`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {affectedGroups.length > 0 && (
        <div className="text-xs">
          <p className="text-muted-foreground mb-1">Affected groups:</p>
          <div className="flex flex-wrap gap-1">
            {affectedGroups.map((group) => (
              <span
                key={group}
                className="inline-block px-2 py-1 bg-white rounded border text-xs"
              >
                {group}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
