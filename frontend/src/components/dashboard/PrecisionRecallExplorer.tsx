'use client';

import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DataPoint {
  threshold: number;
  precision: number;
  recall: number;
  f1Score: number;
  modelName?: string;
}

interface PrecisionRecallExplorerProps {
  data: DataPoint[];
  title?: string;
}

export function PrecisionRecallExplorer({ data, title = 'Precision-Recall Explorer' }: PrecisionRecallExplorerProps) {
  const [selectedThreshold, setSelectedThreshold] = useState(0.5);

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No precision-recall data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const selectedPoint = data.find(d => Math.abs(d.threshold - selectedThreshold) < 0.01) || data[0];
  const maxF1 = Math.max(...data.map(d => d.f1Score));
  const optimalThreshold = data.find(d => d.f1Score === maxF1)?.threshold || 0.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Trade-off between precision and recall at different decision thresholds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-semibold mb-2 block">Threshold: {selectedThreshold.toFixed(2)}</label>
          <Slider
            value={[selectedThreshold * 100]}
            onValueChange={(v) => setSelectedThreshold(v[0] / 100)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          {optimalThreshold !== selectedThreshold && (
            <p className="text-xs text-gray-500 mt-2">Optimal F1 threshold: {optimalThreshold.toFixed(2)}</p>
          )}
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="recall" label={{ value: 'Recall', position: 'insideBottomRight', offset: -5 }} />
            <YAxis label={{ value: 'Precision', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value) => `${(value * 100).toFixed(1)}%`}
              labelFormatter={(value) => `Threshold: ${value.toFixed(2)}`}
            />
            <Legend />
            <Scatter name="Threshold Points" data={data} fill="#3b82f6" />
            {selectedPoint && (
              <Scatter
                name="Selected"
                data={[selectedPoint]}
                fill="#ef4444"
                shape="diamond"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 border rounded-lg bg-blue-50">
            <p className="text-sm text-gray-600">Precision</p>
            <p className="text-xl font-bold text-blue-600">{(selectedPoint.precision * 100).toFixed(1)}%</p>
          </div>
          <div className="p-3 border rounded-lg bg-green-50">
            <p className="text-sm text-gray-600">Recall</p>
            <p className="text-xl font-bold text-green-600">{(selectedPoint.recall * 100).toFixed(1)}%</p>
          </div>
          <div className="p-3 border rounded-lg bg-purple-50">
            <p className="text-sm text-gray-600">F1 Score</p>
            <p className="text-xl font-bold text-purple-600">{(selectedPoint.f1Score * 100).toFixed(1)}%</p>
          </div>
          <div className="p-3 border rounded-lg bg-orange-50">
            <p className="text-sm text-gray-600">Optimal Threshold</p>
            <p className="text-xl font-bold text-orange-600">{optimalThreshold.toFixed(2)}</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Higher precision = fewer false positives. Higher recall = fewer false negatives. F1 balances both.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
