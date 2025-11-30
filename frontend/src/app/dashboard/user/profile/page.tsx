'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function UserProfilePage() {
  return (
    <RoleProtected required={['user','admin']}>
      <div className="p-8 max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Profile & settings" subtitle="Manage your account and preferences" />

        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="grid grid-cols-1 gap-3">
            <label className="text-sm">Name</label>
            <input className="border rounded px-2 py-1" defaultValue="Your Name" />

            <label className="text-sm">Email</label>
            <input className="border rounded px-2 py-1" defaultValue="you@example.com" />

            <label className="text-sm">Notification preferences</label>
            <select className="border rounded px-2 py-1">
              <option>All</option>
              <option>Only important</option>
              <option>None</option>
            </select>

            <div className="mt-4">
              <button className="px-4 py-2 bg-primary text-white rounded">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </RoleProtected>
  );
}
