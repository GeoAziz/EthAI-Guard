'use client';
import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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

  const primaryRole = roles?.includes('admin')
    ? 'admin'
    : roles?.includes('reviewer')
      ? 'reviewer'
      : roles?.includes('analyst')
        ? 'analyst'
        : roles?.includes('user')
          ? 'user'
          : 'guest';

  const isActive = (path: string) => pathname?.startsWith(path) ?? false;

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
                {primaryRole === 'admin' && (
                  <>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin')} icon={<Home />} asChild>
                      <Link href="/dashboard/admin">Admin Dashboard</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/users')} icon={<Users />} asChild>
                      <Link href="/dashboard/admin/users">User Management</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/access-requests')} icon={<FileSearch />} asChild>
                      <Link href="/dashboard/admin/access-requests">Access Requests</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/settings')} icon={<Settings />} asChild>
                      <Link href="/dashboard/admin/settings">Org Settings</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/fairness')} icon={<ShieldCheck />} asChild>
                      <Link href="/dashboard/admin/fairness">Fairness Thresholds</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/admin/billing')} icon={<CreditCard />} asChild>
                      <Link href="/dashboard/admin/billing">Billing</Link>
                    </SidebarMenuButton>
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

                {primaryRole === 'analyst' && (
                  <>
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst')} icon={<Home />} asChild>
                      <Link href="/dashboard/analyst">Analyst Dashboard</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst/run')} icon={<Play />} asChild>
                      <Link href="/dashboard/analyst/run">Run Analysis</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/datasets')} icon={<Database />} asChild>
                      <Link href="/datasets">Datasets</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/models')} icon={<Layers />} asChild>
                      <Link href="/models">Models</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/explainability')} icon={<FileText />} asChild>
                      <Link href="/explainability">Explainability</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/fairness')} icon={<ShieldCheck />} asChild>
                      <Link href="/fairness">Fairness</Link>
                    </SidebarMenuButton>
                    <SidebarMenuButton isActive={isActive('/dashboard/analyst/reports')} icon={<FileText />} asChild>
                      <Link href="/dashboard/analyst/reports">Reports</Link>
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
