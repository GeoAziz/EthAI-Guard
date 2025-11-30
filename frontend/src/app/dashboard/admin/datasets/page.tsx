'use client';
import React, { useState } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import CreateDatasetModal from '@/components/datasets/CreateDatasetModal';
import UploadDatasetModal from '@/components/datasets/UploadDatasetModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';

export default function AdminDatasetsPage() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ header: string[]; rows: string[][] } | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Array<any>>([]);
  const [datasets, setDatasets] = useState<Array<any>>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // legacy inline upload retained for compatibility but primary flows use modals
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !file) {
      setStatus('Please provide a dataset name and file');
      return;
    }
    setUploading(true);
    setStatus('Creating dataset record...');
    try {
      const create = await api.post('/v1/datasets', { name, type: file.name.split('.').pop() || 'csv' });
      const datasetId = create.data.datasetId || create.data.id;
      setDatasetId(datasetId);

      setStatus('Reading file...');
      const b64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      setStatus('Requesting presign...');
      await api.post(`/v1/datasets/${datasetId}/presign`);
      setStatus('Uploading content...');
      const ingest = await api.post(`/v1/datasets/${datasetId}/ingest`, { filename: file.name, content_base64: b64 });
      setStatus('Ingest completed');
      setPreview({ header: ingest.data.header || [], rows: ingest.data.rows_preview || [] });

      // fetch versions for dataset
      try {
        const vres = await api.get(`/v1/datasets/${datasetId}/versions`);
        setVersions(vres.data.versions || []);
      } catch (e) {
        console.warn('Failed to fetch versions', e);
      }
    } catch (err: any) {
      console.error('Upload error', err);
      setStatus(err?.response?.data?.error || 'upload_failed');
    } finally {
      setUploading(false);
    }
  }

  async function loadDatasets() {
    try {
      const res = await api.get('/v1/datasets');
      setDatasets(res.data.datasets || []);
    } catch (e) {
      console.warn('Failed to load datasets', e);
    }
  }

  React.useEffect(() => { loadDatasets(); }, []);

  return (
    <RoleProtected required={['admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Datasets (Admin)" subtitle="Upload, version, and manage datasets" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <h4 className="font-medium mb-3">Upload dataset (MVP)</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)} className="px-3 py-1 border rounded">Create dataset</button>
              <button onClick={() => setShowUpload(true)} className="px-3 py-1 bg-primary text-white rounded">Upload file</button>
            </div>
            {status && <div className="text-sm text-muted-foreground">{status}</div>}
          </div>

          {preview && (
            <div className="mt-4">
              <h5 className="font-medium">Preview</h5>
              <div className="overflow-auto mt-2">
                <table className="min-w-full text-sm table-auto border">
                  <thead className="bg-gray-50">
                    <tr>{preview.header.map(h => <th key={h} className="p-2 text-left">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((r, i) => (
                      <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {datasetId && (
            <div className="mt-6">
              <h5 className="font-medium">Versions</h5>
              {versions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No versions available</div>
              ) : (
                <div className="mt-2">
                  <table className="min-w-full text-sm table-auto border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left">Filename</th>
                        <th className="p-2 text-left">Rows</th>
                        <th className="p-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v: any) => (
                        <tr key={v.versionId} className="border-t">
                          <td className="p-2">{v.filename}</td>
                          <td className="p-2">{v.rows}</td>
                          <td className="p-2">
                            <button
                              className="mr-2 text-sm text-primary"
                              onClick={async () => {
                                try {
                                  const meta = await api.get(`/v1/datasets/${datasetId}/versions/${v.versionId}`);
                                  setPreview({ header: meta.data.version.header || [], rows: meta.data.version.rows_preview || [] });
                                } catch (e) { console.error(e); }
                              }}
                            >Preview
                            </button>
                            <button
                              className="mr-2 text-sm text-primary"
                              onClick={async () => {
                                try {
                                  const resp = await api.get(`/v1/datasets/${datasetId}/versions/${v.versionId}/download`, { responseType: 'blob' });
                                  const url = window.URL.createObjectURL(new Blob([resp.data]));
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = v.filename || 'dataset.csv';
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  window.URL.revokeObjectURL(url);
                                } catch (e) { console.error('download failed', e); }
                              }}
                            >Download
                            </button>
                            <button
                              className="text-sm text-red-600"
                              onClick={() => {
                                setConfirmMessage('Delete this version?');
                                setConfirmAction(() => async () => {
                                  try {
                                    await api.delete(`/v1/datasets/${datasetId}/versions/${v.versionId}`);
                                    const vres = await api.get(`/v1/datasets/${datasetId}/versions`);
                                    setVersions(vres.data.versions || []);
                                  } catch (e) { console.error('delete failed', e); }
                                });
                                setConfirmOpen(true);
                              }}
                            >Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {showCreate && (
          <div className="mt-4">
            <CreateDatasetModal onClose={() => setShowCreate(false)} onCreated={(id) => { setDatasetId(id); setShowCreate(false); }} />
          </div>
        )}

        {showUpload && datasetId && (
          <div className="mt-4">
            <UploadDatasetModal datasetId={datasetId} onClose={() => setShowUpload(false)} onIngested={(p) => { setPreview(p); setShowUpload(false); }} />
          </div>
        )}

        <ConfirmationModal open={confirmOpen} message={confirmMessage} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} onConfirm={async () => { setConfirmOpen(false); if (confirmAction) { await confirmAction(); setConfirmAction(null); } }} />

        <div className="mt-6">
          <h4 className="font-medium mb-3">Datasets</h4>
          {datasets.length === 0 ? (
            <div className="text-sm text-muted-foreground">No datasets yet</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm table-auto border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Versions</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {datasets.map((ds: any) => (
                    <tr key={ds.datasetId} className="border-t">
                      <td className="p-2">{ds.name}</td>
                      <td className="p-2">{ds.versions}</td>
                      <td className="p-2">
                        <button
                          className="mr-2 text-sm text-primary"
                          onClick={async () => {
                            setSelectedDataset(ds.datasetId);
                            setDatasetId(ds.datasetId);
                            try {
                              const vres = await api.get(`/v1/datasets/${ds.datasetId}/versions`);
                              setVersions(vres.data.versions || []);
                            } catch (e) { console.error(e); }
                          }}
                        >View
                        </button>
                        <button
                          className="text-sm text-red-600"
                          onClick={() => {
                            setConfirmMessage('Delete dataset and all versions?');
                            setConfirmAction(() => async () => {
                              try {
                                await api.delete(`/v1/datasets/${ds.datasetId}`);
                                await loadDatasets();
                                if (selectedDataset === ds.datasetId) {
                                  setSelectedDataset(null);
                                  setVersions([]);
                                  setPreview(null);
                                }
                              } catch (e) { console.error('delete failed', e); }
                            });
                            setConfirmOpen(true);
                          }}
                        >Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
