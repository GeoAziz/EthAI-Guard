'use client';

import React from 'react';

type Props = {
  data?: number[];
  width?: number;
  height?: number;
};

// Lightweight SVG sparkline to avoid heavy chart libs. Dynamically imported with ssr:false.
export default function DynamicChart({ data = [], width = 600, height = 160 }: Props) {
  if (!data || data.length === 0) {
    // simple placeholder bar
    return (
      <div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">No chart data</div>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
        <polyline fill="none" stroke="#10b981" strokeWidth={2} points={pts} />
      </svg>
    </div>
  );
}
