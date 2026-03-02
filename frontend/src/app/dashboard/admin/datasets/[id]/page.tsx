'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import api from '@/lib/api';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { Button } from '@/components/ui/button';

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [dataset, setDataset] = useState<any>(null);
  const [versions, setVersions] = useState<Array<any>>([]);
  const [preview, setPreview] = useState<{ header: string[]; rows: string[][] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => { if (id) {load();} }, [id]);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get(`/v1/datasets/${id}`);
      setDataset(d.data.dataset || null);
      const v = await api.get(`/v1/datasets/${id}/versions`);
      setVersions(v.data.versions || []);
    } catch (e) {
      console.error('failed to load dataset', e);
    } finally { setLoading(false); }
  }

  async function handlePreview(versionId: string) {
    try {
      const meta = await api.get(`/v1/datasets/${id}/versions/${versionId}`);
      setPreview({ header: meta.data.version.header || [], rows: meta.data.version.rows_preview || [] });
    } catch (e) { console.error(e); }
  }

  async function handleDownload(versionId: string, filename?: string) {
    try {
      const resp = await api.get(`/v1/datasets/${id}/versions/${versionId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'dataset.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error('download failed', e); }
  }

  async function handleDeleteVersion(versionId: string) {
    setConfirmMessage('Delete this version?');
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/v1/datasets/${id}/versions/${versionId}`);
        await load();
      } catch (e) { console.error('delete failed', e); }
    });
    setConfirmOpen(true);
  }

  async function handleDeleteDataset() {
    setConfirmMessage('Delete dataset and all versions?');
    setConfirmAction(() => async () => {
      try {
        await api.delete(`/v1/datasets/${id}`);
        router.push('/dashboard/admin/datasets');
      } catch (e) { console.error('delete dataset failed', e); }
    });
    setConfirmOpen(true);
  }

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={dataset ? `Dataset: ${dataset.name}` : 'Dataset'} subtitle="Versions and metadata" />

        <div className="mt-6 rounded-lg border bg-card p-4 sm:p-6">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && dataset && (
            <div>
              <div className="mb-4">
                <strong>Name:</strong> {dataset.name} — <small className="text-muted">Uploaded: {new Date(dataset.uploadDate).toLocaleString()}</small>
              </div>

              <div>
                <h5 className="font-medium">Versions</h5>
                {versions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No versions</div>
                ) : (
                  <div className="mt-2">
                    <table className="min-w-full text-sm table-auto border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th scope="col" className="p-2 text-left text-xs sm:text-sm">Filename</th>
                          <th scope="col" className="p-2 text-left text-xs sm:text-sm">Rows</th>
                          <th scope="col" className="p-2 text-left text-xs sm:text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versions.map(v => (
                          <tr key={v.versionId} className="border-t hover:bg-muted/50">
                            <td className="p-2 text-xs sm:text-sm">{v.filename}</td>
                            <td className="p-2 text-xs sm:text-sm">{v.rows}</td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handlePreview(v.versionId)}
                                  className="h-7 text-xs"
                                  aria-label={`Preview ${v.filename}`}
                                >
                                  Preview
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDownload(v.versionId, v.filename)}
                                  className="h-7 text-xs"
                                  aria-label={`Download ${v.filename}`}
                                >
                                  Download
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteVersion(v.versionId)}
                                  className="h-7 text-xs text-destructive hover:text-destructive"
                                  aria-label={`Delete ${v.filename}`}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {preview && (
                <div className="mt-4">
                  <h5 className="font-medium">Preview</h5>
                  <div className="overflow-auto mt-2">
                    <table className="min-w-full text-sm table-auto border">
                      <thead className="bg-muted/50">
                        <tr>{preview.header.map(h => <th scope="col" key={h} className="p-2 text-left">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((r, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <button className="text-sm text-red-600" onClick={handleDeleteDataset}>Delete dataset</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal open={confirmOpen} message={confirmMessage} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} onConfirm={async () => { setConfirmOpen(false); if (confirmAction) { await confirmAction(); setConfirmAction(null); } }} />
    </RoleProtected>
  );
}
