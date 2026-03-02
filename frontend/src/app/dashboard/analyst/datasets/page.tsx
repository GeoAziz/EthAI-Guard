'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';
import UploadDatasetModal from '@/components/datasets/UploadDatasetModal';
import { Upload, Plus, Sheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Dataset = {
  datasetId: string;
  name: string;
  latest_version?: string;
  uploadedBy?: string;
  size_bytes?: number;
  sensitivity?: string;
};

export default function AnalystDatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUploadFor, setShowUploadFor] = useState<string | null>(null);

  async function loadDatasets() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/v1/datasets');
      // backend may return { datasets: [...] } or { data: { datasets: [...] } }
      const ds = res?.data?.datasets || res?.data || [];
      setDatasets(Array.isArray(ds) ? ds : []);
    } catch (e: any) {
      console.error('Failed to load datasets', e);
      setError(e?.response?.data?.error || 'Failed to load datasets');
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDatasets(); }, []);

  return (
    <RoleProtected required={['analyst']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Datasets" subtitle="Upload, version, and manage datasets" />

        <div className="mt-6 rounded-lg border bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-lg">Available datasets</h4>
            <Button onClick={() => setShowCreate(true)}>Create dataset</Button>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-center py-6 text-gray-500">Loading datasets…</div>
            ) : error ? (
              <div className="text-center py-6 text-red-600">{error}</div>
            ) : datasets.length === 0 ? (
              <div className="p-8 text-center">
                <Sheet className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No datasets yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Create a dataset and upload data to start running analyses with custom data.</p>
                <Button onClick={() => setShowCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create dataset
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                    <tr>
                      <th className="py-3 px-3 font-medium">Name</th>
                      <th className="py-3 px-3 font-medium hidden sm:table-cell">Version</th>
                      <th className="py-3 px-3 font-medium hidden md:table-cell">Uploaded By</th>
                      <th className="py-3 px-3 font-medium hidden lg:table-cell">Size</th>
                      <th className="py-3 px-3 font-medium">Sensitivity</th>
                      <th className="text-right py-3 px-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds) => (
                      <DatasetRow key={ds.datasetId} dataset={ds} onUpload={() => setShowUploadFor(ds.datasetId)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {showCreate && (
          <CreateDatasetModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); loadDatasets(); }} />
        )}

        {showUploadFor && (
          <UploadDatasetModal datasetId={showUploadFor} onClose={() => setShowUploadFor(null)} onIngested={() => { setShowUploadFor(null); loadDatasets(); }} />
        )}
      </div>
    </RoleProtected>
  );
}

function DatasetRow({ dataset, onUpload }: { dataset: Dataset; onUpload: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const handleDownload = () => {
    toast?.({ title: 'Download started', description: `Downloading ${dataset.name}…` });
    setShowMenu(false);
  };

  const handleViewReports = () => {
    window.location.href = `/dashboard/analyst/reports?dataset=${dataset.datasetId}`;
    setShowMenu(false);
  };

  return (
    <tr className="border-b group hover:bg-muted/50 transition-colors duration-200">
      <td className="py-3 px-3 font-medium truncate">{dataset.name}</td>
      <td className="py-3 px-3 hidden sm:table-cell text-muted-foreground">{dataset.latest_version || '—'}</td>
      <td className="py-3 px-3 hidden md:table-cell text-muted-foreground">{dataset.uploadedBy || '—'}</td>
      <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground text-xs">
        {typeof dataset.size_bytes === 'number' ? `${(dataset.size_bytes / 1024).toFixed(1)} KB` : '—'}
      </td>
      <td className="py-3 px-3 text-xs">{dataset.sensitivity || 'unknown'}</td>
      <td className="py-3 px-3 text-right relative">
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-muted rounded relative z-10"
          onClick={() => setShowMenu(!showMenu)}
          title="More actions"
        >
          ⋮
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border rounded-md shadow-md z-20 min-w-[150px]">
            <button
              onClick={onUpload}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload version
            </button>
            <button
              onClick={handleViewReports}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
            >
              View reports
            </button>
            <button
              onClick={handleDownload}
              className="w-full text-left px-4 py-2 hover:bg-muted text-sm border-t"
            >
              Download
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
