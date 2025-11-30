'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { docsNav } from './docs-sidebar';

export function DocsPagination() {
  const pathname = usePathname();
  const currentIndex = docsNav.findIndex(item => item.href === pathname);

  const prevPage = currentIndex > 0 ? docsNav[currentIndex - 1] : null;
  const nextPage = currentIndex < docsNav.length - 1 ? docsNav[currentIndex + 1] : null;

  if (!prevPage && !nextPage) {return null;}

  return (
    <div className="flex items-center justify-between pt-8 mt-8 border-t">
      <div className="flex-1">
        {prevPage && (
          <Button variant="outline" asChild className="group">
            <Link href={prevPage.href} className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <div className="text-left">
                <div className="text-xs text-muted-foreground">Previous</div>
                <div className="font-medium">{prevPage.label}</div>
              </div>
            </Link>
          </Button>
        )}
      </div>
      <div className="flex-1 flex justify-end">
        {nextPage && (
          <Button variant="outline" asChild className="group">
            <Link href={nextPage.href} className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Next</div>
                <div className="font-medium">{nextPage.label}</div>
              </div>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
