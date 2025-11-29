"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AdminFairnessPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Fairness thresholds" subtitle="Editable thresholds for monitored metrics" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <table className="w-full text-sm table-auto">
            <thead className="text-xs text-muted-foreground border-b">
              <tr><th className="py-2">Metric</th><th className="py-2">Threshold</th><th className="py-2">Applies to</th><th className="py-2">Action</th></tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Disparate impact ratio</td>
                <td className="py-2"><input className="border rounded px-2 py-1" defaultValue={0.8} /></td>
                <td className="py-2">gender, race</td>
                <td className="py-2"><button className="px-3 py-1 bg-primary text-white rounded">Save</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </RoleProtected>
  );
}
