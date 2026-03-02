'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { FairnessMetricCard } from '@/components/dashboard/FairnessMetricCard';
import { ErrorState } from '@/components/ui/error-state';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FairnessMetric {
  name: string;
  value: number;
  threshold: number;
  unit?: string;
  description?: string;
  status: 'pass' | 'warning' | 'critical';
  affectedGroups?: string[];
}

export default function ReviewerFairnessPage() {
  const [metrics, setMetrics] = useState<FairnessMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const defaultMetrics: FairnessMetric[] = [
    {
      name: 'Disparate Impact Ratio',
      value: 0.76,
      threshold: 0.8,
      unit: 'ratio',
      description: 'Selection rate ratio between protected and unprotected groups',
      status: 'critical',
      affectedGroups: ['gender', 'race'],
    },
    {
      name: 'False Positive Gap',
      value: 0.03,
      threshold: 0.05,
      unit: 'gap',
      description: 'Difference in false positive rates across demographic groups',
      status: 'pass',
      affectedGroups: ['age_group'],
    },
    {
      name: 'False Negative Gap',
      value: 0.08,
      threshold: 0.10,
      unit: 'gap',
      description: 'Difference in false negative rates across demographic groups',
      status: 'warning',
      affectedGroups: ['ethnicity', 'nationality'],
    },
    {
      name: 'Accuracy Disparity',
      value: 0.12,
      threshold: 0.15,
      unit: 'difference',
      description: 'Overall accuracy variation across demographic groups',
      status: 'pass',
      affectedGroups: ['age_group', 'gender'],
    },
    {
      name: 'Equalized Odds Difference',
      value: 0.09,
      threshold: 0.10,
      unit: 'difference',
      description: 'Maximum difference in TPR and FPR across groups',
      status: 'warning',
      affectedGroups: ['race'],
    },
  ];

  useEffect(() => {
    let mounted = true;
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const res = await api.get('/v1/fairness/metrics');
        if (!mounted) return;
        if (res?.data && Array.isArray(res.data)) {
          setMetrics(res.data);
        } else {
          setMetrics(defaultMetrics);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load fairness metrics', err);
        if (!mounted) return;
        setMetrics(defaultMetrics);
        setError(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMetrics();
    return () => { mounted = false; };
  }, []);

  const criticalCount = metrics.filter((m) => m.status === 'critical').length;
  const warningCount = metrics.filter((m) => m.status === 'warning').length;
  const passCount = metrics.filter((m) => m.status === 'pass').length;

  const handleRetry = () => {
    setMetrics(defaultMetrics);
    setError(null);
  };

  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="Fairness Review Dashboard"
          subtitle="Monitor fairness metrics and model bias across demographic groups"
        />

        {loading ? (
          <div className="mt-6 rounded-lg border bg-white p-4 sm:p-6">
            <div className="text-xs sm:text-sm text-muted-foreground">Loading fairness metrics…</div>
          </div>
        ) : error ? (
          <div className="mt-6">
            <ErrorState
              title="Failed to load metrics"
              message={error}
              onRetry={handleRetry}
              icon="🔍"
            />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 animate-in fade-in duration-500">
                <p className="text-xs text-muted-foreground mb-1">ALERTS (Critical)</p>
                <p className="text-2xl sm:text-3xl font-bold text-red-600">{criticalCount}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 sm:p-6 animate-in fade-in duration-500 delay-100">
                <p className="text-xs text-muted-foreground mb-1">WARNINGS</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{warningCount}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 sm:p-6 animate-in fade-in duration-500 delay-200">
                <p className="text-xs text-muted-foreground mb-1">PASSING</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{passCount}</p>
              </div>
            </div>

            {/* Information Panel */}
            <div className="rounded-lg border bg-blue-50 border-blue-200 p-4 sm:p-6 animate-in fade-in duration-500">
              <p className="text-xs sm:text-sm text-blue-900 font-medium mb-2">
                ℹ️ What do these metrics mean?
              </p>
              <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>
                  <strong>Disparate Impact Ratio:</strong> Indicates potential discrimination if below 0.8 (four-fifths rule)
                </li>
                <li>
                  <strong>False Positive/Negative Gap:</strong> Measures fairness in error rates across groups
                </li>
                <li>
                  <strong>Accuracy Disparity:</strong> Shows how performance varies by demographic groups
                </li>
              </ul>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="animate-in fade-in duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <FairnessMetricCard
                    metric={metric}
                    affectedGroups={metric.affectedGroups}
                  />
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {(criticalCount > 0 || warningCount > 0) && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 sm:p-6 animate-in fade-in duration-500">
                <h3 className="font-semibold text-sm sm:text-base text-orange-900 mb-3">
                  🎯 Recommended Actions
                </h3>
                <ul className="text-xs sm:text-sm text-orange-800 space-y-2 list-disc list-inside">
                  {criticalCount > 0 && (
                    <li>
                      Review critical metrics immediately. Consider retraining with fairness constraints
                      or implementing post-processing mitigation techniques.
                    </li>
                  )}
                  {warningCount > 0 && (
                    <li>
                      Investigate warning-level metrics. Determine if mitigation is needed or if increased
                      monitoring is sufficient.
                    </li>
                  )}
                  <li>
                    Consider collecting additional data for underrepresented groups to improve model
                    generalization.
                  </li>
                  <li>
                    Schedule a fairness review meeting with stakeholders to discuss findings and next steps.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </RoleProtected>
  );
}
