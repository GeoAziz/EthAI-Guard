"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function ReviewerThresholdsPage() {
  return (
    <RoleProtected required={["reviewer","admin"]}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Thresholds (read-only)" subtitle="Configured fairness and alert thresholds" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Metric</th><th className="py-2">Threshold</th><th className="py-2">Applies to</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2">Disparate impact ratio</td><td className="py-2">0.8</td><td className="py-2">gender, race</td></tr>
              <tr className="border-b"><td className="py-2">False positive gap</td><td className="py-2">0.05</td><td className="py-2">age_group</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
