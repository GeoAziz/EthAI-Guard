/**
 * Loading skeleton for blog list
 */
export default function BlogLoading() {
  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Hero skeleton */}
        <div className="mb-12 text-center">
          <div className="h-12 bg-secondary rounded-lg mb-4 w-3/4 mx-auto" />
          <div className="h-6 bg-secondary rounded-lg w-2/3 mx-auto" />
        </div>

        {/* Filter skeleton */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 bg-secondary rounded-md" />
          ))}
        </div>

        {/* Featured post skeleton */}
        <div className="mb-12 p-6 border rounded-lg bg-secondary">
          <div className="h-8 bg-muted rounded-lg mb-4 w-1/3" />
          <div className="h-6 bg-muted rounded-lg mb-4" />
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded-lg w-5/6" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-32 bg-muted rounded-lg" />
            <div className="h-4 w-32 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 border rounded-lg bg-secondary">
              <div className="h-5 w-20 bg-muted rounded-md mb-4" />
              <div className="h-6 bg-muted rounded-lg mb-3" />
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded-lg w-5/6" />
              </div>
              <div className="h-4 w-24 bg-muted rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
