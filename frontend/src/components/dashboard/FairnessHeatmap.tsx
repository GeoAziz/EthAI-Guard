'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface HeatmapData {
  protectedAttribute: string;
  outcome: string;
  fairnessScore: number;
  disparity: number;
}

interface FairnessHeatmapProps {
  data: HeatmapData[];
  title?: string;
  threshold?: number;
}

export function FairnessHeatmap({ data, title = 'Fairness Heatmap', threshold = 0.7 }: FairnessHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No fairness data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const attributes = Array.from(new Set(data.map(d => d.protectedAttribute)));
  const outcomes = Array.from(new Set(data.map(d => d.outcome)));

  const getColor = (score: number): string => {
    if (score >= threshold) return 'bg-green-200 text-green-900';
    if (score >= threshold - 0.2) return 'bg-yellow-200 text-yellow-900';
    return 'bg-red-200 text-red-900';
  };

  const getCellData = (attr: string, outcome: string): HeatmapData | undefined => {
    return data.find(d => d.protectedAttribute === attr && d.outcome === outcome);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Fairness scores across protected attributes and outcomes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left bg-gray-100">Attribute</th>
                {outcomes.map(outcome => (
                  <th key={outcome} className="border p-2 text-center bg-gray-100">
                    {outcome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attributes.map(attr => (
                <tr key={attr}>
                  <td className="border p-2 font-semibold">{attr}</td>
                  {outcomes.map(outcome => {
                    const cell = getCellData(attr, outcome);
                    return (
                      <td
                        key={`${attr}-${outcome}`}
                        className={`border p-2 text-center font-bold ${cell ? getColor(cell.fairnessScore) : 'bg-gray-50'}`}
                      >
                        {cell ? `${(cell.fairnessScore * 100).toFixed(0)}%` : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-200"></div>
            <span>Compliant (≥{(threshold * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-200"></div>
            <span>At Risk ({((threshold - 0.2) * 100).toFixed(0)}-{(threshold * 100).toFixed(0)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200"></div>
            <span>Non-Compliant (&lt;{((threshold - 0.2) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
