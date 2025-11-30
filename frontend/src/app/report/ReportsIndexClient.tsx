'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportActions from '@/components/report/ReportActions';

export default function ReportsIndexClient() {
  const [reports, setReports] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let res = null;
        try {
          res = await api.get('/reports');
        } catch (e) {
          res = await api.get('/report');
        }
        const items = res?.data?.items ?? res?.data ?? [];
        setReports(Array.isArray(items) ? items : []);
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || 'failed_to_load_reports');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      <p className="text-sm text-muted-foreground mb-6">List of generated analysis reports.</p>

      {loading && <div>Loading…</div>}
      {error && (
        <Card>
          <CardContent>
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {reports && reports.length === 0 && (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">No reports found.</p>
            </CardContent>
          </Card>
        )}

        {reports && reports.map((r: any) => (
          <Card key={r.id || r._id}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="truncate">{r.title || `Report ${r.id || r._id}`}</CardTitle>
                <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">{r.summary?.riskLevel || r.riskLevel || r.risk || 'Unknown'}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Owner: {r.owner || r.user || r.createdBy || 'unknown'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={`/report/${r.id || r._id}`}>
                  <button className="btn">View report</button>
                </Link>
                <ReportActions reportId={String(r.id || r._id)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
