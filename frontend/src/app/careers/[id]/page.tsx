import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock, Users, DollarSign, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJobById, JOBS, getRelatedJobs, type Job } from '../constants';
import { formatSalaryRange } from '../utils';
import SaveJobButton from '../SaveJobButton';
import ShareJobButton from '../ShareJobButton';

interface JobDetailPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: JobDetailPageProps) {
  const job = getJobById(params.id);

  if (!job) {
    return {
      title: 'Job not found',
    };
  }

  return {
    title: `${job.title} - Careers at EthixAI`,
    description: job.description,
  };
}

export function generateStaticParams() {
  return JOBS.map((job) => ({
    id: job.id,
  }));
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const job = getJobById(params.id);

  if (!job) {
    notFound();
  }

  const relatedJobs = getRelatedJobs(job.department, job.id).slice(0, 3);

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/careers"
          className="inline-flex items-center gap-1 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all positions
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
            <div className="flex-1">
              <Badge className="mb-3 bg-primary text-primary-foreground">{job.department}</Badge>
              <h1 className="text-4xl font-bold mb-2">{job.title}</h1>
              <p className="text-lg text-muted-foreground">{job.description}</p>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{job.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium">{job.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Salary</p>
                <p className="font-medium">{formatSalaryRange(job.salaryMin, job.salaryMax)}</p>
              </div>
            </div>
            {job.manager && (
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Manager</p>
                  <p className="font-medium">{job.manager}</p>
                </div>
              </div>
            )}
          </div>

          {/* Apply Button */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/careers/${job.id}/apply`} className="inline-block">
              <Button size="lg" className="gap-2">
                <Briefcase className="h-5 w-5" />
                Apply Now
              </Button>
            </Link>
            <SaveJobButton jobId={job.id} jobTitle={job.title} size="lg" />
            <ShareJobButton jobId={job.id} jobTitle={job.title} size="lg" />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Responsibilities */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Responsibilities</h2>
              <ul className="space-y-3">
                {job.responsibilities.map((resp, i) => (
                  <li key={i} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Requirements */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Required Qualifications</h2>
              <ul className="space-y-3">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Nice to Have */}
            {job.niceToHave.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Nice to Have</h2>
                <ul className="space-y-3">
                  {job.niceToHave.map((nice, i) => (
                    <li key={i} className="flex gap-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{nice}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Interview Process */}
            <section>
              <h2 className="text-2xl font-bold mb-4">Interview Process</h2>
              <div className="space-y-3">
                {job.interviewProcess.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="pt-1">
                      <p className="font-medium">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Total interview duration: ~4-5 hours spread over 2-3 weeks
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Info */}
            {job.team && (
              <Card>
                <CardHeader>
                  <CardTitle>The Team</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{job.team}</p>
                  {job.manager && (
                    <div className="mt-3 p-3 bg-secondary rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">Hiring Manager</p>
                      <p className="font-semibold">{job.manager}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Benefits */}
            {job.benefits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Benefits</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Apply CTA */}
            <div className="space-y-2">
              <Link href={`/careers/${job.id}/apply`} className="block">
                <Button className="w-full" size="lg">
                  Apply Now
                </Button>
              </Link>
              <SaveJobButton
                jobId={job.id}
                jobTitle={job.title}
                variant="outline"
                showLabel
              />
              <ShareJobButton
                jobId={job.id}
                jobTitle={job.title}
                variant="outline"
              />
            </div>
          </div>
        </div>

        {/* Related Jobs */}
        {relatedJobs.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Similar Positions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedJobs.map((relatedJob: Job) => (
                <Card
                  key={relatedJob.id}
                  className="hover:shadow-lg transition-shadow flex flex-col"
                >
                  <CardHeader>
                    <Badge variant="outline" className="w-fit mb-2">
                      {relatedJob.department}
                    </Badge>
                    <CardTitle className="text-lg">{relatedJob.title}</CardTitle>
                    <CardDescription>{relatedJob.shortDescription}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end">
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {relatedJob.location}
                        </p>
                        <p className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          {formatSalaryRange(relatedJob.salaryMin, relatedJob.salaryMax)}
                        </p>
                      </div>
                      <Link href={`/careers/${relatedJob.id}`} className="inline-block">
                        <Button variant="outline" size="sm" className="w-full">
                          View Position
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
