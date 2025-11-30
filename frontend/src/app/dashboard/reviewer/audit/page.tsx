'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function ReviewerAuditPage() {
  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Audit Log Viewer" subtitle="Read-only audit logs for reviewers" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Timestamp</th><th className="py-2">Actor</th><th className="py-2">Event</th><th className="py-2">Details</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2">2025-11-25 10:12</td><td className="py-2">system</td><td className="py-2">Model deployed</td><td className="py-2">loan-v3 promoted</td></tr>
              <tr className="border-b"><td className="py-2">2025-11-24 09:01</td><td className="py-2">alice@example.com</td><td className="py-2">Report requested</td><td className="py-2">explainability for loan-v3</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
