"use client";

import React from 'react';

export default function ReportActions({ reportId }: { reportId: string }) {
  async function downloadJSON() {
    try {
      const res = await fetch(`/api/report/${reportId}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download JSON failed', err);
      // best-effort toast
      try { const { toast } = require('@/hooks/use-toast'); toast?.({ title: 'Download failed', variant: 'destructive' }); } catch(e){}
    }
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`/api/report/${reportId}`);
      const json = await res.json();
      const report = json?.report ?? json ?? {};
      const summary = report?.summary ?? report;
      const rows: Array<[string, string]> = [];
      if (summary && typeof summary === 'object') {
        Object.entries(summary).forEach(([k, v]) => rows.push([k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')]));
      } else {
        rows.push(['summary', String(summary ?? '')]);
      }
      const csv = rows.map(r => `${escapeCsv(r[0])},${escapeCsv(r[1])}`).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download CSV failed', err);
      try { const { toast } = require('@/hooks/use-toast'); toast?.({ title: 'CSV export failed', variant: 'destructive' }); } catch(e){}
    }
  }

  function escapeCsv(v: string) {
    if (v == null) return '';
    if (v.includes(',') || v.includes('\n') || v.includes('"')) {
      return '"' + v.replace(/"/g, '""') + '"';
    }
    return v;
  }

  function exportPDF() {
    const url = `/api/report/${reportId}/export`;
    try { window.open(url, '_blank'); } catch (err) { console.error('Export PDF failed', err); }
  }

  return (
    <>
      <button className="btn-outline" onClick={downloadJSON}>Download JSON</button>
      <button className="btn-ghost" onClick={downloadCSV}>Download CSV</button>
      <button className="btn-secondary" onClick={exportPDF}>Export PDF</button>
    </>
  );
}
