'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, Clock, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getJobById } from '../../constants';
import { formatSalaryRange } from '../../utils';
import ApplicationForm from '../../ApplicationForm';

interface ApplyPageProps {
  params: {
    id: string;
  };
}

export default function ApplyPage({ params }: ApplyPageProps) {
  const job = getJobById(params.id);
  const [showForm, setShowForm] = useState(true);

  if (!job) {
    notFound();
  }

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
        <Link
          href={`/careers/${job.id}`}
          className="inline-flex items-center gap-1 text-primary hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to job description
        </Link>

        {/* Job Summary */}
        <Card className="mb-8 bg-secondary/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div className="flex-1">
                <Badge className="mb-2 bg-primary text-primary-foreground">{job.department}</Badge>
                <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span>{job.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>{formatSalaryRange(job.salaryMin, job.salaryMax)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Apply for this position
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showForm ? (
              <ApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                onSuccess={() => {
                  setShowForm(false);
                }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Application Submitted!</h3>
                <p className="text-muted-foreground mb-4">
                  Thank you for your application. We'll review it and get back to you soon.
                </p>
                <Link href="/careers" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ArrowLeft className="h-4 w-4" />
                  Back to job listings
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Application Tips */}
        <div className="mt-8 p-6 bg-secondary/30 rounded-lg border border-secondary">
          <h3 className="font-semibold mb-3">Application Tips</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Make sure your resume is up-to-date and in PDF format</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Use your cover letter to highlight relevant experience</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Double-check all contact information before submitting</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary font-bold">•</span>
              <span>We typically respond to applications within 2-3 weeks</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
