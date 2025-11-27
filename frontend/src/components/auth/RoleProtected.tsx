"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { hasAnyRole, defaultRouteForRoles } from '@/lib/rbac';

export interface RoleProtectedProps {
  required?: string | string[];
  children: React.ReactNode;
}

export function RoleProtected({ required, children }: RoleProtectedProps) {
  const { user, loading, roles, refreshRoles } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // If unauthenticated, redirect to login.
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>;
  }

  if (!user) return null;

  // If no requirement provided, treat as authenticated-only.
  if (!required) return <>{children}</>;

  // Try to refresh roles once if empty (best-effort)
  if ((!roles || roles.length === 0) && refreshRoles) {
    // fire-and-forget
    refreshRoles().catch(() => {});
  }

  if (hasAnyRole(roles, required)) {
    return <>{children}</>;
  }

  const fallback = defaultRouteForRoles(roles);

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold">Not authorized</h2>
      <p className="text-sm text-muted-foreground mt-2">You don’t have permission to view this page.</p>
      <div className="mt-4">
        <button
          className="inline-flex items-center rounded-md bg-primary px-3 py-1 text-white"
          onClick={() => router.push(fallback)}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

export default RoleProtected;
