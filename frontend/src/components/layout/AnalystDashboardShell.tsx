import React from 'react';

export function AnalystDashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">Analysis Workspace</h2>
        <p className="text-sm text-muted-foreground">Tools and visualizations for analysts.</p>
      </header>
      <div>{children}</div>
    </div>
  );
}

export default AnalystDashboardShell;
