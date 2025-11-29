"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';

export default function UserDashboardPage() {
  return (
    <RoleProtected required="user">
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">User Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your personal dashboard and recent activity. Visible to authenticated users with the <strong>user</strong> role.</p>
        <div className="mt-6">
          <ul className="list-disc pl-5 text-sm">
            <li><a className="text-primary underline" href="/dashboard">General dashboard</a></li>
            <li><a className="text-primary underline" href="/models">Models</a></li>
          </ul>
        </div>
      </div>
    </RoleProtected>
  );
}
