import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function JobNotFound() {
  return (
    <div className="container px-4 py-12 md:py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center text-center pt-12 pb-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Position Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The job position you're looking for doesn't exist or has been removed. Please check the position ID or browse our open positions.
            </p>
            <div className="space-y-2 w-full">
              <Link href="/careers" className="block">
                <Button className="w-full" size="lg">
                  View All Positions
                </Button>
              </Link>
              <Link href="/careers" className="block">
                <Button variant="outline" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Careers
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
