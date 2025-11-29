"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AdminReportsPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Admin reports" subtitle="Organization-level reports and exports" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <h4 className="font-medium mb-3">Available exports</h4>
          <ul className="text-sm text-muted-foreground">
            <li>Monthly usage export (CSV)</li>
            <li>Full audit export (JSON)</li>
            <li>Fairness trend snapshot</li>
          </ul>
        </div>
      </div>
    </RoleProtected>
  );
}
