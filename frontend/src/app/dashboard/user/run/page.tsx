'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function UserRunPage() {
  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-3xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Run analysis" subtitle="Configure and run an analysis" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <label className="text-sm">Model</label>
          <select className="border rounded px-2 py-1 mt-2 w-full">
            <option>loan-v3</option>
            <option>churn-v2</option>
          </select>

          <label className="text-sm mt-3">Dataset</label>
          <select className="border rounded px-2 py-1 mt-2 w-full">
            <option>customer-churn</option>
            <option>lending-aml</option>
          </select>

          <div className="flex gap-2 mt-4">
            <button className="px-4 py-2 bg-primary text-white rounded">Run</button>
            <button className="px-4 py-2 border rounded">Save</button>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
