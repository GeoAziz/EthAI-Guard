'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface TrendDataPoint {
  date: string | Date;
  fairnessScore: number;
  statisticalParity?: number;
  equalOpportunity?: number;
  disparateImpact?: number;
}

interface FairnessTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  threshold?: number;
  showMetrics?: string[];
}

export function FairnessTrendChart({
  data,
  title = 'Fairness Trend',
  threshold = 0.7,
  showMetrics = ['fairnessScore'],
}: FairnessTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No trend data available</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    date: d.date instanceof Date ? d.date.toLocaleDateString() : d.date,
  }));

  // Calculate trend direction
  const firstScore = chartData[0]?.fairnessScore || 0;
  const lastScore = chartData[chartData.length - 1]?.fairnessScore || 0;
  const isTrendingUp = lastScore >= firstScore;
  const trendPercent = ((lastScore - firstScore) / firstScore) * 100;

  const colors: Record<string, string> = {
    fairnessScore: '#3b82f6',
    statisticalParity: '#10b981',
    equalOpportunity: '#f59e0b',
    disparateImpact: '#ef4444',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Fairness metrics over time</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isTrendingUp ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span className={isTrendingUp ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trendPercent).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
            <Legend />
            {showMetrics.includes('fairnessScore') && (
              <Line
                type="monotone"
                dataKey="fairnessScore"
                stroke={colors.fairnessScore}
                name="Overall Fairness"
                dot={{ r: 4 }}
              />
            )}
            {showMetrics.includes('statisticalParity') && (
              <Line
                type="monotone"
                dataKey="statisticalParity"
                stroke={colors.statisticalParity}
                name="Statistical Parity"
                dot={{ r: 3 }}
              />
            )}
            {showMetrics.includes('equalOpportunity') && (
              <Line
                type="monotone"
                dataKey="equalOpportunity"
                stroke={colors.equalOpportunity}
                name="Equal Opportunity"
                dot={{ r: 3 }}
              />
            )}
            {showMetrics.includes('disparateImpact') && (
              <Line
                type="monotone"
                dataKey="disparateImpact"
                stroke={colors.disparateImpact}
                name="Disparate Impact"
                dot={{ r: 3 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {lastScore < threshold && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Current fairness score ({(lastScore * 100).toFixed(1)}%) is below threshold ({(threshold * 100).toFixed(1)}%)
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
