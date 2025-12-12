import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportActions from '@/components/report/ReportActions';
import RiskBadge from '@/components/report/RiskBadge';
import { headers } from 'next/headers';

// Server component: fetch authenticated reports server-side and revalidate
export default async function ReportsIndexPage() {
  let cookie = '';
  try {
    const hdrs = await headers();
    cookie = hdrs.get('cookie') || '';
  } catch (e) {
    // headers() isn't available outside of a Next request scope (eg. tests)
    cookie = '';
  }
  const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const url = `${backend.replace(/\/$/, '')}/reports`;
  let items: any[] = [];
  try {
    const res = await fetch(url, { headers: { cookie }, next: { revalidate: Number(process.env.REPORTS_REVALIDATE_SECONDS || 30) } });
    const json = await res.json().catch(() => null);
    items = json?.reports ?? json?.items ?? [];
  } catch (e) {
    items = [];
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Reports</h1>
      <p className="text-sm text-muted-foreground mb-6">List of generated analysis reports.</p>

      <div className="space-y-4">
        {items.length === 0 && (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">No reports found.</p>
            </CardContent>
          </Card>
        )}

        {items.map((r: any) => (
          <Card key={r.id || r._id}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="truncate">{r.title || `Report ${r.id || r._id}`}</CardTitle>
                <div className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</div>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <RiskBadge risk={r.summary?.riskLevel || r.riskLevel || r.risk || 'unknown'} />
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

export { RiskBadge };
