'use client';

import React from 'react';

export default function ChartPlaceholder({ title = 'Chart', height = 160 }: { title?: string; height?: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">placeholder</div>
      </div>
      <div
        role="img"
        aria-label={`${title} placeholder`}
        className="w-full bg-gradient-to-r from-slate-50 to-slate-100 rounded h-40 flex items-end"
        style={{ height }}
      >
        <div className="w-full p-3 text-xs text-muted-foreground">Static chart placeholder</div>
      </div>
    </div>
  );
}
