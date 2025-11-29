"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function ReviewerDashboard() {
  return (
    <RoleProtected required={["reviewer"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Reviewer workspace" subtitle="Approval queues, audits, and compliance checks" />

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Pending reviews</h3>
            <p className="text-sm text-muted-foreground">Items awaiting reviewer action.</p>
            <div className="mt-4">
              <ul className="list-disc pl-5 text-sm">
                <li>Model retrain request — Customer churn model</li>
                <li>Explainability report — Loan scoring v3</li>
                <li>Fairness audit — Credit risk demo</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-lg font-medium">Audit summary</h3>
            <p className="text-sm text-muted-foreground">Recent compliance checks and findings.</p>
            <div className="mt-4"><ChartPlaceholder title="Audit summary" /></div>
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium mb-3">Recent approvals</h4>
            <table className="w-full text-left text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Item</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Requested by</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Loan scoring v3 explainability</td>
                  <td className="py-2">Explainability</td>
                  <td className="py-2">alice@example.com</td>
                  <td className="py-2">2025-11-24</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2">Churn retrain proposal</td>
                  <td className="py-2">Retrain</td>
                  <td className="py-2">bob@example.com</td>
                  <td className="py-2">2025-11-22</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
