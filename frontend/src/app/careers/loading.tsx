import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function CareersLoading() {
  return (
    <div className="container px-4 py-8 md:py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-12">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        {/* Filters Skeleton (Sidebar) */}
        <div className="grid gap-8 md:grid-cols-4">
          <aside className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-2">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Jobs Grid Skeleton */}
          <div className="md:col-span-3">
            <Skeleton className="h-6 w-32 mb-6" />
            <div className="grid gap-6 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-20 mb-2" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
