"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function DatasetsPage() {
  return (
    <RoleProtected required={["analyst", "admin"]}>
      <div className="p-8 max-w-5xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Datasets" subtitle="Upload, version, and manage datasets" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <h4 className="font-medium mb-3">Available datasets</h4>
          <table className="w-full text-left text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Rows</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Last updated</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Customer-churn-sample</td>
                <td className="py-2">12,432</td>
                <td className="py-2">data-team</td>
                <td className="py-2">2025-11-01</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Lending-aml-seed</td>
                <td className="py-2">4,220</td>
                <td className="py-2">aml-team</td>
                <td className="py-2">2025-10-23</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
