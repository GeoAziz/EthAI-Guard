'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function AnalystDashboard() {
  return (
    <RoleProtected required={['analyst']}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Analyst workspace" subtitle="Datasets, model evaluations, and explainability tools" />

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Recent analyses</h3>
            <p className="text-sm text-muted-foreground">Summary of latest explainability runs.</p>
            <div className="mt-4"><ChartPlaceholder title="Recent analyses" /></div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Model performance</h3>
            <p className="text-sm text-muted-foreground">Quick glance at model metrics across datasets.</p>
            <div className="mt-4"><ChartPlaceholder title="Model performance" /></div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Alerts</h3>
            <p className="text-sm text-muted-foreground">Model fairness or drift alerts.</p>
            <div className="mt-4"><ChartPlaceholder title="Alerts" /></div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium mb-3">Datasets</h4>
            <table className="w-full text-left text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Rows</th>
                  <th className="py-2">Last updated</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Customer-churn-sample</td>
                  <td className="py-2">12,432</td>
                  <td className="py-2">2025-11-01</td>
                  <td className="py-2">Ready</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Lending-aml-seed</td>
                  <td className="py-2">4,220</td>
                  <td className="py-2">2025-10-23</td>
                  <td className="py-2">Processing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
