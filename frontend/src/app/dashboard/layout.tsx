'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  BarChart2,
  FileUp,
  LayoutGrid,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Puzzle,
  Home,
  Users,
  FileSearch,
  CreditCard,
  Database,
  Layers,
  Archive,
  Play,
  FileText,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/contexts/AuthContext';
import rbac from '@/lib/rbac';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, loading, roles } = useAuth();
  const router = useRouter();
  const primaryRole = rbac.pickPrimaryRole(roles) ?? 'guest';

  useEffect(() => {
    // Redirect unauthenticated users to login
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const isActive = (path: string) => pathname?.startsWith(path) ?? false;

  // Default menu for all users
  const baseMenuItems = [
    { href: '/dashboard', label: 'Upload Dataset', icon: FileUp },
    { href: '/dashboard/fairlens', label: 'FairLens', icon: BarChart2 },
    { href: '/dashboard/explainboard', label: 'ExplainBoard', icon: Puzzle },
    { href: '/dashboard/compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  // Admin-specific menu items
  const adminMenuItems = [
    { href: '/dashboard/admin', label: 'Admin Dashboard', icon: Home },
    { href: '/dashboard/admin/users', label: 'User Management', icon: Users },
    { href: '/dashboard/admin/access-requests', label: 'Access Requests', icon: FileSearch },
    { href: '/dashboard/admin/settings', label: 'Org Settings', icon: Settings },
    { href: '/dashboard/admin/fairness', label: 'Fairness Thresholds', icon: ShieldCheck },
    { href: '/dashboard/admin/billing', label: 'Billing', icon: CreditCard },
    { href: '/dashboard/admin/datasets', label: 'Datasets', icon: Database },
    { href: '/dashboard/admin/models', label: 'Models', icon: Layers },
    { href: '/dashboard/admin/audit', label: 'Audit Logs', icon: Archive },
  ];

  // Analyst-specific menu items
        // Analyst-specific menu items (trimmed for analyst UX)
        // Keep analyst navigation focused on analyst workflows. Datasets, Models
        // and Explainability are intentionally not exposed here to reduce
        // cognitive load; they remain reachable via the Analyst dashboard UI.
        const analystMenuItems = [
          { href: '/dashboard/analyst', label: 'Analyst Dashboard', icon: Home },
          { href: '/dashboard/analyst/run', label: 'Run Analysis', icon: Play },
          { href: '/dashboard/analyst/reports', label: 'Reports', icon: FileText },
        ];

  // Reviewer-specific menu items
  const reviewerMenuItems = [
    { href: '/dashboard/reviewer', label: 'Reviewer Dashboard', icon: Home },
    { href: '/dashboard/compliance', label: 'Compliance Reports', icon: FileText },
    { href: '/dashboard/reviewer/review', label: 'Review Queue', icon: FileSearch },
    { href: '/dashboard/reviewer/fairness', label: 'Fairness Thresholds', icon: ShieldCheck },
    { href: '/dashboard/reviewer/audit', label: 'Audit Logs', icon: Archive },
  ];

  // Select menu based on role
  let menuItems = baseMenuItems;
  if (primaryRole === 'admin') {
    menuItems = adminMenuItems;
  } else if (primaryRole === 'analyst') {
    menuItems = analystMenuItems;
  } else if (primaryRole === 'reviewer') {
    menuItems = reviewerMenuItems;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link href="/dashboard" className="block">
            <Logo />
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    icon={<item.icon />}
                    tooltip={item.label}
                  >
                    {item.label}
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <Separator className="my-2" />
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard/settings">
                <SidebarMenuButton icon={<Settings />} tooltip="Settings" isActive={pathname === '/dashboard/settings'}>
                  Settings
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton icon={<LifeBuoy />} tooltip="Support">
                Support
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {menuItems.find(item => isActive(item.href))?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {/* Optionally show a spinner while checking auth */}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading…</div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
