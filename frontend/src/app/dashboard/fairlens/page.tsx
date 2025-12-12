'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FairnessCharts } from '@/components/dashboard/fairness-charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fairnessScore = analysis?.summary?.overallFairnessScore || 0.83;
  const riskLevel = analysis?.summary?.riskLevel || 'medium';
  const scorePercentage = Math.round(fairnessScore * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">FairLens Analysis</h2>
          <p className="text-muted-foreground">
            Bias and fairness metrics for your model based on protected attributes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchLatestAnalysis}>
            <Share2 className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex flex-col items-center justify-center text-center">
          <CardHeader>
            <CardTitle>Overall Fairness Score</CardTitle>
            <CardDescription>Composite score from 0 to 100</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path
                  className="stroke-muted"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                />
                <path
                  className="stroke-primary"
                  strokeDasharray={`${scorePercentage}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold font-code">{scorePercentage}</span>
              </div>
            </div>
            <Badge
              variant="default"
              className={
                fairnessScore >= 0.9
                  ? 'mt-4 bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30'
                  : fairnessScore >= 0.7
                    ? 'mt-4 bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30'
                    : 'mt-4 bg-red-600/20 text-red-400 border-red-600/30 hover:bg-red-600/30'
              }
            >
              {riskLevel}
            </Badge>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fairness Metrics Comparison</CardTitle>
            <CardDescription>Comparing metrics across different protected groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium">Protected Attribute:</span>
              <Select value={selectedAttribute} onValueChange={setSelectedAttribute}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="race">Race</SelectItem>
                  <SelectItem value="age_group">Age Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FairnessCharts summary={analysis?.summary} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
