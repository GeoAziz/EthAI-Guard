'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function ReviewerThresholdsPage() {
  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Thresholds (read-only)" subtitle="Configured fairness and alert thresholds" />

        <div className="mt-6 rounded-lg border bg-white p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-3 font-medium">Metric</th>
                  <th className="py-3 px-3 font-medium">Threshold</th>
                  <th className="py-3 px-3 font-medium">Applies to</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-3">Disparate impact ratio</td>
                  <td className="py-3 px-3">0.8</td>
                  <td className="py-3 px-3">gender, race</td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-3">False positive gap</td>
                  <td className="py-3 px-3">0.05</td>
                  <td className="py-3 px-3">age_group</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
