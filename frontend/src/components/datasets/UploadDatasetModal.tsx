'use client';
import React, { useState } from 'react';
import api from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

type Props = {
  datasetId: string;
  onIngested: (preview: { header: string[]; rows: string[][] }) => void;
  onClose: () => void;
};

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export default function UploadDatasetModal({ datasetId, onIngested, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<number | null>(null);
  const [rowsCount, setRowsCount] = useState<number | null>(null);
  const [retentionDays, setRetentionDays] = useState<number | '0' | 7 | 30 | 90 | 365 | 0>(0);

  function readFileAsBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        const b64 = s.split(',')[1] || '';
        resolve(b64);
      };
      r.onerror = reject;
      r.readAsDataURL(f);
    });
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {return setError('Please select a file');}
    setError(null);
    if (file.size > DEFAULT_MAX_BYTES) {return setError('File exceeds max size (5MB)');}
    setUploading(true);
    try {
      setStatus('Requesting presign...');
      await api.post(`/v1/datasets/${datasetId}/presign`);

      setStatus('Reading file...');
      const b64 = await readFileAsBase64(file);

      setStatus('Ingesting...');
      const body: any = { filename: file.name, content_base64: b64 };
      if (retentionDays && retentionDays !== 0) {body.retention_days = retentionDays;}
      const resp = await api.post(`/v1/datasets/${datasetId}/ingest`, body);
      const header = resp.data.header || [];
      const rows = resp.data.rows_preview || [];
      setColumns(Array.isArray(header) ? header.length : null);
      setRowsCount(Array.isArray(rows) ? rows.length : null);
      setStatus('Ingest completed');
      onIngested({ header, rows });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'ingest_failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog defaultOpen onOpenChange={(o) => { if (!o) {onClose();} }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload dataset file</DialogTitle>
          <DialogDescription>Upload a CSV file to ingest into the dataset.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpload} className="space-y-3">
          <div>
            <label className="block text-sm">File (CSV)</label>
            <input data-autofocus data-testid="file-input" type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
            <div className="text-xs text-muted-foreground mt-1">Max size: 5MB</div>
          </div>

          <div>
            <label htmlFor="upload-retention" className="block text-sm">Retention</label>
            <select id="upload-retention" value={String(retentionDays)} onChange={e => setRetentionDays(Number(e.target.value) as any)} className="border rounded px-2 py-1">
              <option value="0">Keep forever</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">365 days</option>
            </select>
            <div className="text-xs text-muted-foreground mt-1">Select how long to retain versions for this upload.</div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {status && <div className="text-sm text-muted-foreground">{status}</div>}
          {columns !== null && rowsCount !== null && (
            <div className="text-sm text-muted-foreground">Preview: {columns} columns × {rowsCount} rows</div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => onClose()} className="px-3 py-1 border rounded">Cancel</button>
            <button type="submit" disabled={uploading} className="px-3 py-1 bg-primary text-white rounded">{uploading ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>

        <DialogClose />
      </DialogContent>
    </Dialog>
  );
}
