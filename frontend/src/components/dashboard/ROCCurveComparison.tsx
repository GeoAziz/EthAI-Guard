'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ROCPoint {
  fpr: number;
  tpr: number;
}

interface ROCModel {
  name: string;
  points: ROCPoint[];
  auc: number;
}

interface ROCCurveComparisonProps {
  models: ROCModel[];
  title?: string;
}

export function ROCCurveComparison({ models, title = 'ROC Curve Comparison' }: ROCCurveComparisonProps) {
  if (!models || models.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No ROC curve data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Combine all points for chart
  const allPoints = Array.from({ length: 101 }, (_, i) => ({
    fpr: i / 100,
  }));

  models.forEach((model, idx) => {
    model.points.forEach(point => {
      const existing = allPoints.find(p => Math.abs(p.fpr - point.fpr) < 0.01);
      if (existing) {
        existing[`model_${idx}`] = point.tpr;
      }
    });
  });

  // Add diagonal (random classifier)
  allPoints.forEach(p => {
    p.diagonal = p.fpr;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Receiver Operating Characteristic curves for model comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={allPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fpr" label={{ value: 'False Positive Rate', position: 'insideBottomRight', offset: -5 }} />
              <YAxis label={{ value: 'True Positive Rate', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `${(value * 100).toFixed(2)}%`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="diagonal"
                stroke="#999"
                name="Random Classifier"
                strokeDasharray="5 5"
                dot={false}
              />
              {models.map((model, idx) => (
                <Line
                  key={`model_${idx}`}
                  type="monotone"
                  dataKey={`model_${idx}`}
                  stroke={colors[idx % colors.length]}
                  name={`${model.name} (AUC: ${model.auc.toFixed(3)})`}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map((model, idx) => (
              <div key={model.name} className="p-3 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx % colors.length] }}></div>
                  <span className="font-semibold">{model.name}</span>
                </div>
                <div className="text-sm">
                  <p className="text-gray-600">AUC Score: <span className="font-bold text-gray-900">{model.auc.toFixed(4)}</span></p>
                  <p className="text-gray-600 text-xs mt-1">Higher is better</p>
                </div>
              </div>
            ))}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The diagonal line represents a random classifier (AUC = 0.5). Models above this line perform better than random.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
