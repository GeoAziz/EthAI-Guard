'use client';
import React, { useEffect, useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';
import UploadDatasetModal from '@/components/datasets/UploadDatasetModal';
import { LoadingState, EmptyState } from '@/components/ui/loading-state';
import { useAsync } from '@/hooks/use-async';

async function fetchDatasets() {
  const res = await api.get('/v1/datasets');
  return res?.data?.datasets || res?.data?.items || [];
}

export default function DatasetsPage() {
  const { data: datasets, loading, error, refetch: loadDatasets } = useAsync(fetchDatasets, []);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  function formatBytes(b: number | undefined) {
    if (!b && b !== 0) {return '-';}
    const kb = b / 1024;
    if (kb < 1024) {return `${kb.toFixed(1)} KB`;}
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  return (
    <RoleProtected required={['analyst', 'admin']}>
      <div className="p-8 max-w-5xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Datasets" subtitle="Upload, version, and manage datasets" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium">Available datasets</h4>
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)} className="px-3 py-1 border rounded">Create dataset</button>
            </div>
          </div>

          <LoadingState loading={loading} error={error} onRetry={loadDatasets} loadingText="Loading datasets...">
            {!datasets || datasets.length === 0 ? (
              <EmptyState message="No datasets yet" />
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-left text-sm table-auto">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th scope="col" className="py-2">Dataset Name</th>
                      <th scope="col" className="py-2">Version</th>
                      <th scope="col" className="py-2">Uploaded By</th>
                      <th scope="col" className="py-2">Size</th>
                      <th scope="col" className="py-2">Sensitivity</th>
                      <th scope="col" className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((d: any) => (
                      <tr key={d.datasetId || d.id} className="border-b">
                        <td className="py-2">{d.name}</td>
                        <td className="py-2">{d.latestVersion || d.version || '-'}</td>
                        <td className="py-2">{d.uploadedBy || d.owner || '-'}</td>
                        <td className="py-2">{formatBytes(d.size_bytes)}</td>
                        <td className="py-2">{d.sensitivity || d.sensitivity_level || '-'}</td>
                        <td className="py-2">
                          <button className="mr-2 text-sm text-primary" onClick={() => { setUploadTarget(d.datasetId || d.id); setShowUpload(true); }}>Upload file</button>
                          <a href={`/dashboard/admin/datasets/${d.datasetId || d.id}`} className="text-sm text-primary">View</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </LoadingState>
        </div>

        {showCreate && (
          <CreateDatasetModal onClose={() => setShowCreate(false)} onCreated={(id) => { setShowCreate(false); loadDatasets(); }} />
        )}

        {showUpload && uploadTarget && (
          <UploadDatasetModal datasetId={uploadTarget} onClose={() => { setShowUpload(false); setUploadTarget(null); loadDatasets(); }} onIngested={() => { setShowUpload(false); setUploadTarget(null); loadDatasets(); }} />
        )}
      </div>
    </RoleProtected>
  );
}
