"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function UserReportsPage() {
  return (
    <RoleProtected required={["user","admin"]}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="My reports" subtitle="Saved explainability and fairness reports" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <h4 className="font-medium mb-3">Saved reports</h4>
          <table className="w-full text-left text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="py-2">Report</th>
                <th className="py-2">Model</th>
                <th className="py-2">Date</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Loan scoring explainability</td>
                <td className="py-2">loan-v3</td>
                <td className="py-2">2025-11-20</td>
                <td className="py-2">Ready</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Churn counterfactuals</td>
                <td className="py-2">churn-v2</td>
                <td className="py-2">2025-11-10</td>
                <td className="py-2">Ready</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
