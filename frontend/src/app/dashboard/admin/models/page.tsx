"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function AdminModelsPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Models registry" subtitle="Manage model versions and promotions" />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Recent model activity</h4>
            <div className="mt-4"><ChartPlaceholder title="Model activity" height={200} /></div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Models</h4>
            <table className="w-full text-sm mt-3">
              <thead className="text-xs text-muted-foreground border-b">
                <tr><th className="py-2">Model</th><th className="py-2">Latest</th><th className="py-2">Status</th><th className="py-2">Actions</th></tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="py-2">loan-v3</td><td className="py-2">v3.2</td><td className="py-2">Production</td><td className="py-2">Promote | Retrain</td></tr>
                <tr className="border-b"><td className="py-2">churn-v2</td><td className="py-2">v2.5</td><td className="py-2">Staging</td><td className="py-2">Promote | Retrain</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
