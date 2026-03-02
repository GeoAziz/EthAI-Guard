import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-md mx-auto text-center">
        <Card>
          <CardContent className="pt-8 pb-8">
            <h1 className="text-5xl font-bold mb-4">404</h1>
            <p className="text-xl font-semibold mb-2">Blog post not found</p>
            <p className="text-muted-foreground mb-6">
              Sorry, we couldn't find the blog post you're looking for. It may have been removed or the URL might be incorrect.
            </p>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Blog
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
