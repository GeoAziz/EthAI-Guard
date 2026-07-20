'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Trophy, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComparisonData {
  model1: any;
  model2: any;
  comparison: any;
}

export default function ModelComparisonPage() {
  const [model1, setModel1] = useState('');
  const [model2, setModel2] = useState('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [ranking, setRanking] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const res = await api.get('/v1/models/ranking?limit=10');
      setRanking(res.data.ranking);
    } catch (error) {
      console.error('Failed to fetch ranking');
    }
  };

  const handleCompare = async () => {
    if (!model1 || !model2) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both models',
      });
      return;
    }

    try {
      setLoading(true);
      const res = await api.get('/v1/models/compare', {
        params: { model1, model2 },
      });
      setComparison(res.data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to compare models',
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData = comparison
    ? [
        {
          metric: 'Fairness Score',
          model1: comparison.model1.fairnessScore,
          model2: comparison.model2.fairnessScore,
        },
        {
          metric: 'Accuracy',
          model1: comparison.model1.performanceMetrics.accuracy,
          model2: comparison.model2.performanceMetrics.accuracy,
        },
        {
          metric: 'Precision',
          model1: comparison.model1.performanceMetrics.precision,
          model2: comparison.model2.performanceMetrics.precision,
        },
        {
          metric: 'Recall',
          model1: comparison.model1.performanceMetrics.recall,
          model2: comparison.model2.performanceMetrics.recall,
        },
      ]
    : [];

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Model Comparison</h1>
        <p className="text-gray-600 mt-1">Compare fairness and performance between models</p>
      </div>

      {/* Ranking Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Top Models by Fairness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ranking.slice(0, 5).map((model: any, idx) => (
              <div
                key={model.modelId}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setModel1(model.modelId)}
              >
                <div>
                  <p className="font-semibold">#{idx + 1}</p>
                </div>
                <div className="flex-1 ml-4">
                  <p className="font-semibold">{model.modelId}</p>
                  <p className="text-sm text-gray-600">Fairness: {(model.fairnessScore * 100).toFixed(1)}%</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{(model.fairnessScore * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Form */}
      <Card>
        <CardHeader>
          <CardTitle>Select Models to Compare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Model 1</label>
              <input
                type="text"
                value={model1}
                onChange={(e) => setModel1(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter model ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Model 2</label>
              <input
                type="text"
                value={model2}
                onChange={(e) => setModel2(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter model ID"
              />
            </div>
          </div>
          <Button onClick={handleCompare} disabled={loading} className="w-full">
            {loading ? 'Comparing...' : 'Compare Models'}
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Recommendation */}
          <Card className={comparison.comparison.recommendation.winner === 'model1' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold mb-2">
                {comparison.comparison.recommendation.reason}
              </p>
              {comparison.comparison.recommendation.considerations.length > 0 && (
                <ul className="text-sm text-gray-700 space-y-1">
                  {comparison.comparison.recommendation.considerations.map((note: string, idx: number) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="model1" fill="#3b82f6" name={comparison.model1.modelId} />
                  <Bar dataKey="model2" fill="#10b981" name={comparison.model2.modelId} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{comparison.model1.modelId}</CardTitle>
                <CardDescription>v{comparison.model1.version}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Fairness Score</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(comparison.model1.fairnessScore * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Accuracy</p>
                    <p className="font-semibold">{(comparison.model1.performanceMetrics.accuracy * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Precision</p>
                    <p className="font-semibold">{(comparison.model1.performanceMetrics.precision * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Recall</p>
                    <p className="font-semibold">{(comparison.model1.performanceMetrics.recall * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">F1 Score</p>
                    <p className="font-semibold">{(comparison.model1.performanceMetrics.f1Score * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{comparison.model2.modelId}</CardTitle>
                <CardDescription>v{comparison.model2.version}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Fairness Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {(comparison.model2.fairnessScore * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Accuracy</p>
                    <p className="font-semibold">{(comparison.model2.performanceMetrics.accuracy * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Precision</p>
                    <p className="font-semibold">{(comparison.model2.performanceMetrics.precision * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Recall</p>
                    <p className="font-semibold">{(comparison.model2.performanceMetrics.recall * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">F1 Score</p>
                    <p className="font-semibold">{(comparison.model2.performanceMetrics.f1Score * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
