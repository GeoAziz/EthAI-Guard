'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface Alert {
  _id: string;
  model_id: string;
  type: string;
  severity: 'critical' | 'warning' | 'stable';
  metric_name: string;
  metric_value: number;
  threshold: number;
  window_start: string;
  window_end: string;
  occurrence_count: number;
  created_at: string;
  resolved: boolean;
}

interface DriftSnapshot {
  model_id: string;
  window_end: string;
  overall_status: 'critical' | 'warning' | 'stable';
  critical_count: number;
  warning_count: number;
  feature_drifts: Record<string, any>;
  score_drift: any;
}

export default function DriftMonitorPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [snapshots, setSnapshots] = useState<DriftSnapshot[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('default_model');

  useEffect(() => {
    fetchDriftData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDriftData, 30000);
    return () => clearInterval(interval);
  }, [selectedModel]);

  const fetchDriftData = async () => {
    try {
      const [alertsRes, snapshotsRes, statusRes] = await Promise.all([
        fetch(`/api/v1/drift/alerts/${selectedModel}?resolved=false&limit=20`),
        fetch(`/api/v1/drift/snapshots/${selectedModel}?limit=50`),
        fetch(`/api/v1/drift/status/${selectedModel}`)
      ]);

      const alertsData = await alertsRes.json();
      const snapshotsData = await snapshotsRes.json();
      const statusData = await statusRes.json();

      setAlerts(alertsData.alerts || []);
      setSnapshots(snapshotsData.snapshots || []);
      setStatus(statusData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch drift data:', error);
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await fetch(`/api/v1/drift/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution_note: 'Resolved from dashboard' })
      });
      fetchDriftData();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const triggerRetrain = async () => {
    try {
      await fetch(`/api/v1/models/${selectedModel}/trigger-retrain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Critical drift detected',
          requested_by: 'dashboard_user'
        })
      });
      alert('Retraining request submitted');
    } catch (error) {
      console.error('Failed to trigger retrain:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Drift Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time model behavior tracking</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDriftData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {status?.needs_retraining && (
            <Button onClick={triggerRetrain} variant="destructive">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trigger Retrain
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getSeverityIcon(status?.current_status || 'stable')}
              <span className="text-2xl font-bold capitalize">
                {status?.current_status || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {status?.critical_alerts || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Warning Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {status?.warning_alerts || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Baseline Age</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.baseline_age_days || 0} days
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
          <CardDescription>Unresolved drift alerts requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert._id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(alert.severity)}
                        <span className="font-semibold capitalize">
                          {alert.type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline">{alert.severity}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>Metric:</strong> {alert.metric_name}
                        </p>
                        <p>
                          <strong>Value:</strong> {alert.metric_value.toFixed(4)} (threshold: {alert.threshold.toFixed(4)})
                        </p>
                        <p>
                          <strong>Occurrences:</strong> {alert.occurrence_count} time(s)
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => resolveAlert(alert._id)}
                      size="sm"
                      variant="outline"
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Drift Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Drift Analysis</CardTitle>
          <CardDescription>Population Stability Index (PSI) by feature</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length > 0 && snapshots[0].feature_drifts ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Feature</th>
                    <th className="text-right p-2">PSI</th>
                    <th className="text-center p-2">Severity</th>
                    <th className="text-right p-2">Mean Baseline</th>
                    <th className="text-right p-2">Mean Current</th>
                    <th className="text-right p-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(snapshots[0].feature_drifts).map(([feature, drift]: [string, any]) => {
                    const change = drift.mean_current - drift.mean_baseline;
                    const changePercent = ((change / drift.mean_baseline) * 100).toFixed(1);
                    
                    return (
                      <tr key={feature} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{feature}</td>
                        <td className="text-right p-2">{drift.psi.toFixed(4)}</td>
                        <td className="text-center p-2">
                          <Badge className={getSeverityColor(drift.psi_severity)}>
                            {drift.psi_severity}
                          </Badge>
                        </td>
                        <td className="text-right p-2">{drift.mean_baseline.toFixed(2)}</td>
                        <td className="text-right p-2">{drift.mean_current.toFixed(2)}</td>
                        <td className="text-right p-2">
                          <span className={change > 0 ? 'text-red-600' : 'text-green-600'}>
                            {change > 0 ? '+' : ''}{changePercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No drift data available</p>
          )}
        </CardContent>
      </Card>

      {/* Score Drift */}
      {snapshots.length > 0 && snapshots[0].score_drift && (
        <Card>
          <CardHeader>
            <CardTitle>Concept Drift (Score Distribution)</CardTitle>
            <CardDescription>KL divergence on risk scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">KL Divergence</p>
                <p className="text-2xl font-bold">{snapshots[0].score_drift.kl.toFixed(4)}</p>
                <Badge className={getSeverityColor(snapshots[0].score_drift.kl_severity)}>
                  {snapshots[0].score_drift.kl_severity}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mean Baseline</p>
                <p className="text-2xl font-bold">{snapshots[0].score_drift.mean_baseline.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Mean Current</p>
                <p className="text-2xl font-bold">{snapshots[0].score_drift.mean_current.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">P95 Current</p>
                <p className="text-2xl font-bold">{snapshots[0].score_drift.p95_current.toFixed(3)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
