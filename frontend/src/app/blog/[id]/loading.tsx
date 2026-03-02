/**
 * Loading skeleton for individual blog post
 */
export default function BlogPostLoading() {
  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-32 bg-secondary rounded-lg mb-8" />

        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-6 w-24 bg-secondary rounded-lg mb-4" />
          <div className="h-10 bg-secondary rounded-lg mb-4 w-3/4" />
          <div className="space-y-2 mb-6">
            <div className="h-5 bg-secondary rounded-lg" />
            <div className="h-5 bg-secondary rounded-lg w-5/6" />
            <div className="h-5 bg-secondary rounded-lg w-4/6" />
          </div>
          <div className="flex gap-6 pb-6 border-b">
            <div className="h-4 w-32 bg-secondary rounded-lg" />
            <div className="h-4 w-32 bg-secondary rounded-lg" />
            <div className="h-4 w-32 bg-secondary rounded-lg" />
          </div>
        </div>

        {/* Social share skeleton */}
        <div className="my-6 flex gap-2">
          <div className="h-10 w-10 bg-secondary rounded-lg" />
          <div className="h-10 w-10 bg-secondary rounded-lg" />
          <div className="h-10 w-10 bg-secondary rounded-lg" />
        </div>

        {/* Content skeleton */}
        <div className="mb-12 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 bg-secondary rounded-lg w-3/4" />
              <div className="h-4 bg-secondary rounded-lg" />
              <div className="h-4 bg-secondary rounded-lg w-5/6" />
            </div>
          ))}
        </div>

        {/* Related posts skeleton */}
        <div className="my-12">
          <div className="h-6 bg-secondary rounded-lg w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg bg-secondary">
                <div className="h-5 w-20 bg-muted rounded-md mb-4" />
                <div className="h-5 bg-muted rounded-lg mb-3" />
                <div className="h-4 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
