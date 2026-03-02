'use client';
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SelectableCard, ModelCard, DatasetCard } from '@/components/data/card-components';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { SearchIcon, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Step = 'model' | 'dataset' | 'config' | 'review';

const MODELS = [
  {
    id: 'loan-v3',
    name: 'Loan Risk Model',
    version: 'v3.1',
    description: 'Predicts loan approval risk with fairness constraints',
    lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    metrics: { 'Accuracy': '94.2%', 'Fairness': '92%' },
    estimatedRuntime: '3 min',
  },
  {
    id: 'churn-v2',
    name: 'Customer Churn Model',
    version: 'v2.3',
    description: 'Predicts customer churn probability',
    metrics: { 'Accuracy': '87.5%', 'Fairness': '88%' },
    estimatedRuntime: '2 min',
  },
];

const DATASETS = [
  {
    id: 'customer-churn',
    name: 'Customer Churn Dataset',
    rowCount: 15000,
    columnCount: 24,
    size: '8.5 MB',
    uploadDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    description: 'Historical customer data with churn outcomes',
  },
  {
    id: 'lending-aml',
    name: 'Lending AML Dataset',
    rowCount: 50000,
    columnCount: 32,
    size: '42 MB',
    uploadDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    description: 'Anti-money laundering transactions for lending',
  },
];

const RUN_TYPES = [
  {
    id: 'baseline',
    name: 'Baseline Analysis',
    description: 'Full comprehensive bias and fairness analysis',
    icon: '📊',
  },
  {
    id: 'drift',
    name: 'Drift Detection',
    description: 'Detect data drift and model degradation',
    icon: '📈',
  },
  {
    id: 'quick',
    name: 'Quick Check',
    description: 'Fast fairness check (summary only)',
    icon: '⚡',
  },
];

interface FormState {
  modelId: string;
  datasetId: string;
  runType: string;
  selectedFairnessMetrics: string[];
  autoOpenReport: boolean;
}

export default function UserRunPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('model');
  const [loading, setLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [datasetSearch, setDatasetSearch] = useState('');
  const [form, setForm] = useState<FormState>({
    modelId: '',
    datasetId: '',
    runType: 'baseline',
    selectedFairnessMetrics: ['demographic-parity', 'equal-odds'],
    autoOpenReport: true,
  });

  const filteredModels = MODELS.filter((m) =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.description.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const filteredDatasets = DATASETS.filter((d) =>
    d.name.toLowerCase().includes(datasetSearch.toLowerCase()) ||
    d.description.toLowerCase().includes(datasetSearch.toLowerCase())
  );

  const selectedModel = MODELS.find((m) => m.id === form.modelId);
  const selectedDataset = DATASETS.find((d) => d.id === form.datasetId);
  const selectedRunType = RUN_TYPES.find((r) => r.id === form.runType);

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post('/v1/analysis', {
        modelId: form.modelId,
        datasetId: form.datasetId,
        runType: form.runType,
        fairnessMetrics: form.selectedFairnessMetrics,
      });

      const runId = res?.data?.id || res?.data?.runId;
      toast?.({ title: 'Analysis started', description: 'Your analysis is now running' });

      if (form.autoOpenReport && runId) {
        setTimeout(() => {
          window.location.href = `/dashboard/user/runs`;
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.href = `/dashboard/user/runs`;
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start analysis:', err);
      toast?.({ title: 'Failed to start analysis', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [form, toast]);

  const canContinue = {
    model: !!form.modelId,
    dataset: !!form.datasetId,
    config: !!form.runType,
    review: !!(form.modelId && form.datasetId && form.runType),
  };

  const stepConfig = {
    model: { label: 'Model', num: 1 },
    dataset: { label: 'Dataset', num: 2 },
    config: { label: 'Configuration', num: 3 },
    review: { label: 'Review', num: 4 },
  };

  return (
    <RoleProtected required={['user', 'admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader 
          title="Run Analysis" 
          subtitle="Configure and start a new bias detection analysis"
          hideActions={true}
        />

        {/* Progress Indicator */}
        <div className="mt-8 mb-8">
          <div className="flex items-center justify-between">
            {(['model', 'dataset', 'config', 'review'] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center">
                <button
                  onClick={() => idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step) && setStep(s)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    s === step
                      ? 'bg-primary text-primary-foreground'
                      : idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-muted text-muted-foreground'
                  } ${
                    idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step)
                      ? 'cursor-pointer hover:shadow-md'
                      : ''
                  }`}
                  disabled={idx >= (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step)}
                >
                  {idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step) ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </button>
                <div
                  className={`hidden sm:block ml-3 ${
                    s === step
                      ? 'text-foreground font-semibold'
                      : idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step)
                      ? 'text-green-700'
                      : 'text-muted-foreground'
                  }`}
                >
                  {stepConfig[s].label}
                </div>
                {idx < 3 && (
                  <ChevronRight
                    className={`hidden sm:block ml-4 mr-4 w-5 h-5 ${
                      idx < (['model', 'dataset', 'config', 'review'] as Step[]).indexOf(step)
                        ? 'text-green-700'
                        : 'text-muted-foreground'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-8">
          {/* Step 1: Model Selection */}
          {step === 'model' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Select a Model</h2>
                <p className="text-muted-foreground text-sm">
                  Choose the model you want to analyze for bias and fairness
                </p>
              </div>

              <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search models..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    {...model}
                    selected={form.modelId === model.id}
                    onClick={() => setForm((f) => ({ ...f, modelId: model.id }))}
                  />
                ))}
              </div>

              {filteredModels.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No models found matching your search
                </div>
              )}
            </div>
          )}

          {/* Step 2: Dataset Selection */}
          {step === 'dataset' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Select a Dataset</h2>
                <p className="text-muted-foreground text-sm">
                  Choose the dataset to analyze with {selectedModel?.name}
                </p>
              </div>

              <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search datasets..."
                  value={datasetSearch}
                  onChange={(e) => setDatasetSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDatasets.map((dataset) => (
                  <DatasetCard
                    key={dataset.id}
                    {...dataset}
                    selected={form.datasetId === dataset.id}
                    onClick={() => setForm((f) => ({ ...f, datasetId: dataset.id }))}
                  />
                ))}
              </div>

              {filteredDatasets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No datasets found matching your search
                </div>
              )}

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <strong>Don't see your dataset?</strong> You can{' '}
                      <Link href="/dashboard/user/datasets/upload" className="underline font-semibold">
                        upload a new dataset
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Run Configuration */}
          {step === 'config' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Configure Analysis</h2>
                <p className="text-muted-foreground text-sm">
                  Choose the type of analysis to run
                </p>
              </div>

              <div className="space-y-3">
                {RUN_TYPES.map((runType) => (
                  <SelectableCard
                    key={runType.id}
                    title={runType.name}
                    description={runType.description}
                    icon={<span className="text-2xl">{runType.icon}</span>}
                    selected={form.runType === runType.id}
                    onClick={() => setForm((f) => ({ ...f, runType: runType.id }))}
                  />
                ))}
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-base">Fairness Metrics</CardTitle>
                  <CardDescription>
                    Select which fairness metrics to include in the analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { id: 'demographic-parity', name: 'Demographic Parity' },
                    { id: 'equal-odds', name: 'Equal Odds' },
                    { id: 'equalized-odds', name: 'Equalized Odds' },
                    { id: 'predictive-parity', name: 'Predictive Parity' },
                  ].map((metric) => (
                    <label key={metric.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.selectedFairnessMetrics.includes(metric.id)}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            selectedFairnessMetrics: e.target.checked
                              ? [...f.selectedFairnessMetrics, metric.id]
                              : f.selectedFairnessMetrics.filter((m) => m !== metric.id),
                          }));
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{metric.name}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <label className="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={form.autoOpenReport}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, autoOpenReport: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-sm font-semibold">Auto-open report</div>
                  <div className="text-xs text-muted-foreground">
                    Automatically navigate to the report when analysis completes
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Review & Confirm</h2>
                <p className="text-muted-foreground text-sm">
                  Please review your analysis configuration before starting
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Summary Cards */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Selected Model</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-semibold">{selectedModel?.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Version</div>
                      <div className="font-semibold">{selectedModel?.version}</div>
                    </div>
                    {selectedModel?.metrics && (
                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Metrics</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(selectedModel.metrics).map(([key, value]) => (
                            <div key={key}>
                              <div className="text-muted-foreground">{key}</div>
                              <div className="font-semibold">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Selected Dataset</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Name</div>
                      <div className="font-semibold">{selectedDataset?.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Size</div>
                      <div className="font-semibold">{selectedDataset?.size}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Rows</div>
                      <div className="font-semibold">{selectedDataset?.rowCount?.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Columns</div>
                      <div className="font-semibold">{selectedDataset?.columnCount}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Analysis Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Run Type</div>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        {selectedRunType?.name}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Fairness Metrics</div>
                      <div className="flex flex-wrap gap-2">
                        {form.selectedFairnessMetrics.map((metric) => (
                          <Badge key={metric} variant="outline">
                            {metric.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Estimated runtime: </span>
                        <span className="font-semibold">{selectedModel?.estimatedRuntime || '~3 min'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              const steps: Step[] = ['model', 'dataset', 'config', 'review'];
              const currentIdx = steps.indexOf(step);
              if (currentIdx > 0) {
                setStep(steps[currentIdx - 1]);
              }
            }}
            disabled={step === 'model'}
          >
            ← Back
          </Button>

          {step !== 'review' ? (
            <Button
              onClick={() => {
                const steps: Step[] = ['model', 'dataset', 'config', 'review'];
                const currentIdx = steps.indexOf(step);
                if (currentIdx < steps.length - 1) {
                  setStep(steps[currentIdx + 1]);
                }
              }}
              disabled={!canContinue[step]}
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Starting…' : '✓ Start Analysis'}
            </Button>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
