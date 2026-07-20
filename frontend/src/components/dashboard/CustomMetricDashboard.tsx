'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Settings } from 'lucide-react';

interface Metric {
  id: string;
  name: string;
  type: 'gauge' | 'number' | 'chart' | 'table';
  value?: number;
  unit?: string;
  min?: number;
  max?: number;
  threshold?: number;
  color?: string;
}

interface CustomMetricDashboardProps {
  metrics: Metric[];
  onAddMetric?: (metric: Metric) => void;
  onRemoveMetric?: (metricId: string) => void;
  onUpdateMetric?: (metric: Metric) => void;
  editable?: boolean;
}

function GaugeMetric({ metric }: { metric: Metric }) {
  const percentage = metric.value ? (metric.value / (metric.max || 100)) * 100 : 0;
  const isWarning = metric.threshold && metric.value ? metric.value < metric.threshold : false;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Background circle */}
          <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={isWarning ? '#ef4444' : metric.color || '#3b82f6'}
            strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 314.159} 314.159`}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{percentage.toFixed(0)}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-center">{metric.name}</p>
      {metric.threshold && (
        <p className="text-xs text-gray-500 mt-1">
          Threshold: {metric.threshold} {metric.unit}
        </p>
      )}
    </div>
  );
}

function NumberMetric({ metric }: { metric: Metric }) {
  return (
    <div className="p-4 text-center">
      <p className="text-gray-600 text-sm mb-2">{metric.name}</p>
      <p className="text-4xl font-bold" style={{ color: metric.color || '#3b82f6' }}>
        {metric.value?.toFixed(2)}
        <span className="text-lg ml-1">{metric.unit}</span>
      </p>
    </div>
  );
}

export function CustomMetricDashboard({
  metrics,
  onAddMetric,
  onRemoveMetric,
  onUpdateMetric,
  editable = false,
}: CustomMetricDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Custom Metrics Dashboard</CardTitle>
            <CardDescription>Personalized fairness and performance metrics</CardDescription>
          </div>
          {editable && (
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Metric
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3">Add New Metric</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Metric name" className="border px-3 py-2 rounded text-sm" />
              <select className="border px-3 py-2 rounded text-sm">
                <option>gauge</option>
                <option>number</option>
                <option>chart</option>
                <option>table</option>
              </select>
              <input type="number" placeholder="Value" className="border px-3 py-2 rounded text-sm" />
              <input placeholder="Unit" className="border px-3 py-2 rounded text-sm" />
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm">Add</Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {metrics.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No metrics configured yet</p>
            {editable && <p className="text-sm">Add your first metric to get started</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(metric => (
              <div key={metric.id} className="border rounded-lg p-4 relative group">
                {metric.type === 'gauge' && <GaugeMetric metric={metric} />}
                {metric.type === 'number' && <NumberMetric metric={metric} />}
                {metric.type === 'chart' && (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">{metric.name}</p>
                    <p className="text-xs text-gray-400 mt-2">Chart view</p>
                  </div>
                )}
                {metric.type === 'table' && (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">{metric.name}</p>
                    <p className="text-xs text-gray-400 mt-2">Table view</p>
                  </div>
                )}

                {editable && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="p-1 bg-gray-200 hover:bg-gray-300 rounded">
                      <Settings className="w-3 h-3" />
                    </button>
                    <button
                      className="p-1 bg-red-200 hover:bg-red-300 rounded"
                      onClick={() => onRemoveMetric?.(metric.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
