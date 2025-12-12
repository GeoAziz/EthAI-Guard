'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';
import UploadDatasetModal from '@/components/datasets/UploadDatasetModal';

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

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium mb-0">Available datasets</h4>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)} className="px-3 py-1 border rounded">Create dataset</button>
            </div>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="text-center py-6 text-gray-500">Loading datasets…</div>
            ) : error ? (
              <div className="text-center py-6 text-red-600">{error}</div>
            ) : datasets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No datasets yet</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="py-2">Name</th>
                      <th className="py-2">Version</th>
                      <th className="py-2">Uploaded By</th>
                      <th className="py-2">Size</th>
                      <th className="py-2">Sensitivity</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds) => (
                      <tr className="border-b" key={ds.datasetId}>
                        <td className="py-2">{ds.name}</td>
                        <td className="py-2">{ds.latest_version || '-'}</td>
                        <td className="py-2">{ds.uploadedBy || '-'}</td>
                        <td className="py-2">{typeof ds.size_bytes === 'number' ? `${(ds.size_bytes / 1024).toFixed(1)} KB` : '-'}</td>
                        <td className="py-2">{ds.sensitivity || 'unknown'}</td>
                        <td className="py-2">
                          <button onClick={() => setShowUploadFor(ds.datasetId)} className="mr-3 text-sm text-primary">Upload</button>
                          <a href={`/dashboard/analyst/reports?dataset=${ds.datasetId}`} className="text-sm text-muted-foreground">View reports</a>
                        </td>
                      </tr>
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
