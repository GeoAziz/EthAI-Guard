import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function JobDetailLoading() {
  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Skeleton */}
        <Skeleton className="h-4 w-32 mb-6" />

        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-24 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-full max-w-2xl mb-4" />

          {/* Meta Info Grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>

          <Skeleton className="h-12 w-40" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Sections */}
            {[...Array(3)].map((_, sectionIdx) => (
              <section key={sectionIdx}>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <Skeleton className="h-5 flex-1" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            ))}
            <Skeleton className="h-12 w-full" />
          </div>
        </div>

        {/* Related Jobs Section */}
        <div className="mt-16">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-full max-w-xs" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
