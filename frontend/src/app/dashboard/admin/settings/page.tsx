"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AdminSettingsPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Organization settings" subtitle="Manage organization-wide defaults and integrations" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <label className="text-sm">Default analysis timeout (minutes)</label>
          <input className="border rounded px-2 py-1 mt-2" defaultValue={60} />
          <p className="text-sm text-muted-foreground mt-3">Integration keys and data retention policies can be managed here (static placeholder).</p>
        </div>
      </div>
    </RoleProtected>
  );
}
