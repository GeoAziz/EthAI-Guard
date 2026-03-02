'use client';
import React, { useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function AnalystRunPage() {
  const [modelId, setModelId] = useState('');
  const [datasetId, setDatasetId] = useState('');
  const [analysisType, setAnalysisType] = useState('explainability');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStartRun = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!modelId.trim()) {
      toast?.({ title: 'Validation Error', description: 'Please enter a model ID', variant: 'destructive' });
      return;
    }
    if (!datasetId.trim()) {
      toast?.({ title: 'Validation Error', description: 'Please enter a dataset ID', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/v1/analysis', {
        modelId: modelId.trim(),
        datasetId: datasetId.trim(),
        analysisType,
      });
      
      const runId = res?.data?.runId || res?.data?.id;
      toast?.({
        title: 'Success',
        description: `Analysis run started (ID: ${runId})`,
        variant: 'default',
      });
      
      // Reset and redirect
      setTimeout(() => {
        window.location.href = '/dashboard/analyst/history';
      }, 1500);
    } catch (err: any) {
      toast?.({
        title: 'Error',
        description: err?.response?.data?.error || 'Failed to start analysis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleProtected required={['analyst','admin']}>
      <div className="p-4 sm:p-8 max-w-3xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Run analysis" subtitle="Configure and start an explainability or fairness run" />

        <form className="mt-6 rounded-lg border bg-white p-6" onSubmit={handleStartRun}>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label htmlFor="model-select" className="block text-sm font-medium mb-2">Model *</label>
              <input 
                id="model-select" 
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="e.g., loan-v3"
                className="w-full border rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div>
              <label htmlFor="dataset-select" className="block text-sm font-medium mb-2">Dataset *</label>
              <input 
                id="dataset-select" 
                type="text"
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                placeholder="e.g., customer-churn"
                className="w-full border rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div>
              <label htmlFor="analysis-type-select" className="block text-sm font-medium mb-2">Analysis Type</label>
              <select 
                id="analysis-type-select" 
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="explainability">Explainability (SHAP)</option>
                <option value="fairness">Fairness snapshot</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Starting…' : 'Start run'}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </RoleProtected>
  );
}
