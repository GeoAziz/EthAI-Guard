"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AnalystReportsPage() {
  return (
    <RoleProtected required={["analyst","admin"]}>
      <div className="p-8 max-w-5xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Analyst reports" subtitle="Saved explainability & fairness analyses" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Report</th><th className="py-2">Type</th><th className="py-2">Model</th><th className="py-2">Date</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="py-2">Loan scoring explainability</td><td className="py-2">Explainability</td><td className="py-2">loan-v3</td><td className="py-2">2025-11-20</td></tr>
              <tr className="border-b"><td className="py-2">Churn fairness snapshot</td><td className="py-2">Fairness</td><td className="py-2">churn-v2</td><td className="py-2">2025-11-02</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
