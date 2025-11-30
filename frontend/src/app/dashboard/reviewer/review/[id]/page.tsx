'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function ReviewerReviewPage({ params }: { params: { id: string } }) {
  return (
    <RoleProtected required={['reviewer','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title={`Review Report ${params.id}`} subtitle="Inspect findings, add notes, and approve or reject." />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <h3 className="font-medium">Summary</h3>
          <p className="text-sm text-muted-foreground mt-2">Placeholder summary of the report under review. Use the buttons to record your decision.</p>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded">Approve</button>
            <button className="px-4 py-2 bg-red-600 text-white rounded">Reject</button>
            <button className="px-4 py-2 border rounded">Request changes</button>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
