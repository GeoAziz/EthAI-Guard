"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function ExplainabilityPage() {
  return (
    <RoleProtected required={["analyst", "admin"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Explainability Viewer" subtitle="SHAP summaries, feature importance, and local explanations" />

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Global feature importance</h3>
            <p className="text-sm text-muted-foreground">SHAP summary for selected model and dataset.</p>
            <div className="mt-4"><ChartPlaceholder title="SHAP summary (bar)" height={220} /></div>
          </div>

          <aside className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Local explanation</h4>
            <p className="text-sm text-muted-foreground">Selected instance contributions (static example).</p>
            <table className="w-full text-sm mt-3">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="py-2">Feature</th><th className="py-2">Contribution</th></tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="py-2">age</td><td className="py-2">-0.12</td></tr>
                <tr className="border-b"><td className="py-2">income</td><td className="py-2">+0.34</td></tr>
                <tr className="border-b"><td className="py-2">loan_amount</td><td className="py-2">-0.05</td></tr>
              </tbody>
            </table>
          </aside>
        </section>
      </div>
    </RoleProtected>
  );
}
