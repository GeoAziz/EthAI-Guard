import React from 'react';

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">Admin Console</h2>
        <p className="text-sm text-muted-foreground">Administrative tools and user management.</p>
      </header>
      <div>{children}</div>
    </div>
  );
}

export default AdminDashboardShell;
