'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/loading-skeleton';

export function KPISkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-8 sm:h-10 w-20 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded ml-4" />
      </div>
    </div>
  );
}

export function KPISkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
          <KPISkeleton />
        </div>
      ))}
    </div>
  );
}

export default KPISkeleton;
