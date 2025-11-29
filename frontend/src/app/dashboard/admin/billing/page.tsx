"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function AdminBillingPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Billing & usage" subtitle="Summary of costs and analysis usage" />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Monthly spend</h4>
            <div className="mt-4"><ChartPlaceholder title="Monthly spend" height={180} /></div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Top consumers</h4>
            <ul className="mt-3 text-sm text-muted-foreground">
              <li>Team A — 320 analyses</li>
              <li>Team B — 220 analyses</li>
            </ul>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
