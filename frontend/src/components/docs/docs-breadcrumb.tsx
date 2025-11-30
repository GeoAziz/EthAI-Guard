'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { docsNav } from './docs-sidebar';

export function DocsBreadcrumb() {
  const pathname = usePathname();
  const currentPage = docsNav.find(item => item.href === pathname);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      <Link href="/docs" className="hover:text-foreground transition-colors">
        Docs
      </Link>
      {currentPage && pathname !== '/docs' && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{currentPage.label}</span>
        </>
      )}
    </div>
  );
}
