import React from 'react';

export default function RiskBadge({ risk }: { risk?: string }) {
  const level = (String(risk || 'unknown')).toLowerCase();
  const mapping: Record<string, { label: string; classes: string }> = {
    low: { label: 'Low', classes: 'bg-green-100 text-green-800' },
    medium: { label: 'Medium', classes: 'bg-amber-100 text-amber-800' },
    high: { label: 'High', classes: 'bg-red-100 text-red-800' },
    unknown: { label: 'Unknown', classes: 'bg-gray-100 text-gray-800' },
  };
  const info = mapping[level] ?? mapping.unknown;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.classes}`}>
      {info.label}
    </span>
  );
}
