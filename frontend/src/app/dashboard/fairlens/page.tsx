'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Share2, RefreshCw, BarChart3 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const FairnessCharts = dynamic(
  () => import('@/components/dashboard/fairness-charts').then((m) => m.FairnessCharts),
  {
    ssr: false,
    loading: () => <div className="h-72 w-full animate-pulse rounded bg-muted" />,
  },
);

export default function FairlensPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedAttribute, setSelectedAttribute] = useState('gender');

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    setLoading(true);
    try {
      // Fetch latest analysis or use demo data
      const res = await api.get('/api/analyses/latest');
      setAnalysis(res.data);
    } catch (error: any) {
      console.error('Failed to fetch analysis:', error);
      // Use demo data if API fails
      setAnalysis({
        summary: {
          overallFairnessScore: 0.83,
          riskLevel: 'medium',
          biasMetrics: {
            demographicParity: { gender: 0.08, race: 0.12 },
            equalOpportunity: { gender: 0.05, race: 0.09 },
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        {/* Cards Skeleton */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
          <Card className="flex flex-col items-center justify-center p-8">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 mt-4" />
          </Card>
          <Card className="md:col-span-2 p-6">
            <Skeleton className="h-72 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  const fairnessScore = analysis?.summary?.overallFairnessScore || 0.83;
  const riskLevel = analysis?.summary?.riskLevel || 'medium';
  const scorePercentage = Math.round(fairnessScore * 100);

  const getRiskLabel = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'Low Risk';
      case 'medium': return 'Medium Risk';
      case 'high': return 'High Risk';
      default: return level;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">FairLens Analysis</h2>
          <p className="text-muted-foreground mt-1">
            Bias and fairness metrics for your model based on protected attributes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchLatestAnalysis} className="flex-1 sm:flex-none">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button className="flex-1 sm:flex-none">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
        {/* Score Card */}
        <Card className="md:col-span-1 flex flex-col items-center justify-center text-center">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Overall Fairness Score
            </CardTitle>
            <CardDescription>Composite score from 0 to 100</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-2">
            {/* Responsive Donut Chart */}
            <div
              className="relative w-28 h-28 sm:w-32 sm:h-32"
              role="img"
              aria-label={`Fairness score: ${scorePercentage} out of 100`}
            >
              <svg
                className="h-full w-full -rotate-90"
                viewBox="0 0 36 36"
                aria-hidden="true"
              >
                {/* Background circle */}
                <circle
                  className="stroke-muted"
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  strokeWidth="3"
                />
                {/* Progress circle */}
                <circle
                  className="stroke-primary transition-all duration-500 ease-out"
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${scorePercentage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold font-code">
                  {scorePercentage}
                </span>
              </div>
              {/* Screen reader text */}
              <span className="sr-only">
                Fairness score is {scorePercentage} percent, which indicates {getRiskLabel(riskLevel)}
              </span>
            </div>
            <Badge
              variant="default"
              aria-label={`Risk level: ${getRiskLabel(riskLevel)}`}
              className={`mt-4 capitalize ${
                fairnessScore >= 0.9
                  ? 'bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/30 hover:bg-green-600/30'
                  : fairnessScore >= 0.7
                    ? 'bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30'
                    : 'bg-red-600/20 text-red-600 dark:text-red-400 border-red-600/30 hover:bg-red-600/30'
              }`}
            >
              {getRiskLabel(riskLevel)}
            </Badge>
          </CardContent>
        </Card>

        {/* Chart Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fairness Metrics Comparison</CardTitle>
            <CardDescription>Comparing metrics across different protected groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4">
              <span className="text-sm font-medium whitespace-nowrap">Protected Attribute:</span>
              <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                  <SelectItem value="age_group">Age Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-h-[250px] sm:min-h-[288px]">
              <FairnessCharts summary={analysis?.summary} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
