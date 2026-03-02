'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function ReviewerDashboard() {
  return (
    <RoleProtected required={['reviewer']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Reviewer workspace" subtitle="Approval queues, audits, and compliance checks" />

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Pending reviews</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">Items awaiting reviewer action.</p>
            <div>
              <ul className="list-disc pl-5 text-xs sm:text-sm space-y-2">
                <li>Model retrain request — Customer churn model</li>
                <li>Explainability report — Loan scoring v3</li>
                <li>Fairness audit — Credit risk demo</li>
              </ul>
            </div>
          </div>

          <div className="animate-in fade-in slide-in-from-right-2 duration-500 rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
            <h3 className="text-base sm:text-lg font-semibold mb-2">Audit summary</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">Recent compliance checks and findings.</p>
            <ChartPlaceholder title="Audit summary" height={160} />
          </div>
        </section>

        <section className="mt-8">
          <div className="rounded-lg border bg-white p-4 sm:p-6 overflow-hidden">
            <h4 className="font-semibold mb-4 text-sm sm:text-base">Recent approvals</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm table-auto">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="py-3 px-3">Item</th>
                    <th className="py-3 px-3 hidden sm:table-cell">Type</th>
                    <th className="py-3 px-3 hidden md:table-cell">Requested by</th>
                    <th className="py-3 px-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3 truncate">Loan scoring v3 explainability</td>
                    <td className="py-3 px-3 hidden sm:table-cell">Explainability</td>
                    <td className="py-3 px-3 hidden md:table-cell">alice@example.com</td>
                    <td className="py-3 px-3">2025-11-24</td>
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3 truncate">Churn retrain proposal</td>
                    <td className="py-3 px-3 hidden sm:table-cell">Retrain</td>
                    <td className="py-3 px-3 hidden md:table-cell">bob@example.com</td>
                    <td className="py-3 px-3">2025-11-22</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
