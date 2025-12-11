'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import rbac from '@/lib/rbac';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/layout/user-nav';
import { Home, Play, FileText, Database, Layers, Users, Settings, ShieldCheck, CreditCard, Archive, FileSearch } from 'lucide-react';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const { roles, user } = useAuth();
  const pathname = usePathname();

  React.useEffect(() => {
    try { console.debug('[AppShellLayout] roles changed:', roles, 'user:', !!user); } catch (e) {}
  }, [roles, user]);

  // Compute primary role using RBAC priority (fixes relying on array order)
  const primaryRole = rbac.pickPrimaryRole(roles) ?? 'guest';
  
  React.useEffect(() => {
    console.log('[AppShellLayout] LAYOUT STATE:', { roles, user: user?.email, primaryRole });
  }, [primaryRole, roles, user]);

  const isActive = (path: string) => pathname?.startsWith(path) ?? false;
  
  // Check if we're in a dashboard route (which has its own layout)
  const isDashboardRoute = pathname?.startsWith('/dashboard');

  // For dashboard routes, let the dashboard/layout.tsx handle the sidebar.
  // Just render children directly without the (auth) sidebar/header wrapper.
  if (isDashboardRoute) {
    return children;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-slate-50">
        <header className="flex items-center justify-between border-b px-6 py-3 bg-white">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-lg font-semibold">EthixAI</Link>
            <div className="text-sm text-slate-500">{primaryRole.toUpperCase()}</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-slate-600">{user?.email ?? '—'}</div>
            <UserNav />
          </div>
        </header>

        <div className="flex">
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <SidebarHeader className="p-4">
              <div className="text-sm font-medium">Navigation</div>
            </SidebarHeader>

            <SidebarContent>
              <SidebarMenu>
                {primaryRole === 'analyst' && (
                  <>
                    {/*
                      Analyst role: show only items relevant to analyst workflows.
                      Datasets, Models and Explainability were removed from the
                      analyst sidebar to simplify the workspace — these tools
                      remain accessible via the Analyst dashboard pages and CTAs.
                    */}
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst')} icon={<Home />} asChild>
                      <Link href="/dashboard/analyst">Analyst Dashboard</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst/run')} icon={<Play />} asChild>
                      <Link href="/dashboard/analyst/run">Run Analysis</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst/reports')} icon={<FileText />} asChild>
                      <Link href="/dashboard/analyst/reports">Reports</Link>
                    </SidebarMenuButton>
                  </>
                )}

                {primaryRole === 'admin' && (
                  <>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/datasets')} icon={<Database />} asChild>
                      <Link href="/dashboard/admin/datasets">Datasets</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/models')} icon={<Layers />} asChild>
                      <Link href="/dashboard/admin/models">Models</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/audit')} icon={<Archive />} asChild>
                      <Link href="/dashboard/admin/audit">Audit Logs</Link>
                    </SidebarMenuButton>
                  </>
                )}

                {primaryRole === 'reviewer' && (
                  <>
                    <SidebarMenuButton isActive={isActive('/dashboard/reviewer')} icon={<Home />} asChild>
                      <Link href="/dashboard/reviewer">Reviewer Dashboard</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/compliance')} icon={<FileText />} asChild>
                      <Link href="/dashboard/compliance">Compliance Reports</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/reviewer/review')} icon={<FileSearch />} asChild>
                      <Link href="/dashboard/reviewer/review">Review Queue</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/reviewer/fairness')} icon={<ShieldCheck />} asChild>
                      <Link href="/dashboard/reviewer/fairness">Fairness Thresholds</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/reviewer/audit')} icon={<Archive />} asChild>
                      <Link href="/dashboard/reviewer/audit">Audit Logs</Link>
                    </SidebarMenuButton>
                  </>
                )}

                {(primaryRole === 'user' || primaryRole === 'guest') && (
                  <>
                    <SidebarMenuButton isActive={isActive('/dashboard')} icon={<Home />} asChild>
                      <Link href="/dashboard">Dashboard</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/user/run')} icon={<Play />} asChild>
                      <Link href="/dashboard/user/run">Run Analysis</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/user/reports')} icon={<FileText />} asChild>
                      <Link href="/dashboard/user/reports">Reports</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/user/profile')} icon={<Users />} asChild>
                      <Link href="/dashboard/user/profile">Profile</Link>
                    </SidebarMenuButton>
                  </>
                )}
              </SidebarMenu>
            </SidebarContent>

            <SidebarSeparator />
            <SidebarFooter className="p-3">
              <div className="text-xs text-muted-foreground">Role: {primaryRole}</div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 p-6">
            <Breadcrumbs />
            {/* PageHeader will be used by pages where appropriate; show a lightweight default here */}
            <PageHeader title="Workspace" subtitle="Overview" />
            {children}
          </main>
        </div>

        <footer className="border-t py-4 px-6 text-sm text-slate-500">© {new Date().getFullYear()} EthixAI</footer>
      </div>
    </SidebarProvider>
  );
}
