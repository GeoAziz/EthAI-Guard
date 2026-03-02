'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock, DollarSign, Heart, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { JOBS, type Job } from '../constants';
import { formatSalaryRange } from '../utils';
import SaveJobButton from '../SaveJobButton';

export default function SavedJobsPage() {
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      setSavedJobIds(saved);

      // Get the full job objects
      const jobs = JOBS.filter((job: Job) => saved.includes(job.id));
      setSavedJobs(jobs);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="container px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">Loading saved jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href="/careers" className="inline-flex items-center gap-1 text-primary hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to job listings
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            Saved Jobs
          </h1>
          <p className="text-lg text-muted-foreground">
            {savedJobs.length === 0
              ? "You haven't saved any jobs yet."
              : `You have ${savedJobs.length} saved job${savedJobs.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {savedJobs.length > 0 ? (
          <div className="space-y-4">
            {savedJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          {job.department}
                        </Badge>
                        {job.featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                      </div>
                      <Link href={`/careers/${job.id}`} className="group">
                        <CardTitle className="text-xl mb-1 group-hover:text-primary transition-colors">
                          {job.title}
                        </CardTitle>
                      </Link>
                      <CardDescription className="mb-3">{job.shortDescription}</CardDescription>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.type}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalaryRange(job.salaryMin, job.salaryMax)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Link href={`/careers/${job.id}`}>
                        <Button variant="outline">View Details</Button>
                      </Link>
                      <Link href={`/careers/${job.id}/apply`}>
                        <Button>Apply</Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No saved jobs yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse our open positions and save the ones you're interested in!
              </p>
              <Link href="/careers">
                <Button variant="outline">
                  Explore Positions
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
