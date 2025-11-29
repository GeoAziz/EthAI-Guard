"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname() || '/';
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 0) return null;

  const crumbs = parts.map((p, i) => {
    const href = '/' + parts.slice(0, i + 1).join('/');
    const label = p.replace(/[-_]/g, ' ');
    return { href, label };
  });

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
      {crumbs.map((c, idx) => (
        <span key={c.href} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2" />
          {idx === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">{c.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
