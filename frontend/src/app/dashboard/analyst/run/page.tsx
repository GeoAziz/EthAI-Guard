"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AnalystRunPage() {
  return (
    <RoleProtected required={["analyst","admin"]}>
      <div className="p-8 max-w-3xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Run analysis" subtitle="Configure and start an explainability or fairness run" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm">Model</label>
            <select className="border rounded px-2 py-1">
              <option>loan-v3</option>
              <option>churn-v2</option>
            </select>

            <label className="text-sm">Dataset</label>
            <select className="border rounded px-2 py-1">
              <option>customer-churn</option>
              <option>lending-aml</option>
            </select>

            <label className="text-sm">Analysis type</label>
            <select className="border rounded px-2 py-1">
              <option>Explainability (SHAP)</option>
              <option>Fairness snapshot</option>
            </select>

            <div className="flex gap-2 mt-4">
              <button className="px-4 py-2 bg-primary text-white rounded">Start run</button>
              <button className="px-4 py-2 border rounded">Save draft</button>
            </div>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
