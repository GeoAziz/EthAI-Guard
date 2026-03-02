'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, MapPin, Clock, Users, Heart, Zap, GraduationCap, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { filterJobs } from './constants';
import { formatSalaryRange } from './utils';
import JobFilters from './JobFilters';
import ApplicationForm from './ApplicationForm';
import { GeneralApplicationModal } from './GeneralApplicationModal';

// First, let's keep the openings as is for now - we'll use JOBS for the new filtered view
// But we need to export metadata at the top level

export default function CareersPage() {
  // Filter state
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);

  // Modal state
  const [applicationFormOpen, setApplicationFormOpen] = useState(false);
  const [generalApplicationOpen, setGeneralApplicationOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('');

  // Get filtered jobs
  const filteredJobs = filterJobs(selectedDepartment, selectedLocation, selectedType);

  const benefits = [
    {
      icon: DollarSign,
      title: 'Competitive Compensation',
      description: 'Industry-leading salaries with equity options',
    },
    {
      icon: Heart,
      title: 'Health & Wellness',
      description: 'Comprehensive health, dental, and vision coverage',
    },
    {
      icon: Clock,
      title: 'Flexible Work',
      description: 'Remote-first culture with flexible hours',
    },
    {
      icon: GraduationCap,
      title: 'Learning & Development',
      description: '$5,000 annual learning budget',
    },
    {
      icon: Users,
      title: 'Team Events',
      description: 'Regular team offsites and social events',
    },
    {
      icon: Zap,
      title: 'Impact',
      description: 'Work on technology that makes AI fairer for everyone',
    },
  ];

  const handleApplyNow = (jobId: string, jobTitle: string) => {
    setSelectedJobId(jobId);
    setSelectedJobTitle(jobTitle);
    setApplicationFormOpen(true);
  };

  const handleClearFilters = () => {
    setSelectedDepartment(undefined);
    setSelectedLocation(undefined);
    setSelectedType(undefined);
  };

  const maxResults = filteredJobs.length;

  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Join Our Mission</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Help us build the future of fair and transparent AI for financial services.
            We're looking for passionate individuals who want to make a real impact.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/careers/saved">
                View Saved Jobs
              </Link>
            </Button>
          </div>
        </div>

        {/* Why EthixAI */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Why EthixAI?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <benefit.icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Open Positions with Filters */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Open Positions</h2>

          <div className="grid gap-8 md:grid-cols-4">
            {/* Filters Sidebar */}
            <aside>
              <JobFilters
                department={selectedDepartment}
                location={selectedLocation}
                type={selectedType}
                onDepartmentChange={setSelectedDepartment}
                onLocationChange={setSelectedLocation}
                onTypeChange={setSelectedType}
                results={maxResults}
                onClearFilters={handleClearFilters}
              />
            </aside>

            {/* Jobs Grid */}
            <div className="md:col-span-3">
              <div className="mb-4 text-sm text-muted-foreground">
                {maxResults} position{maxResults !== 1 ? 's' : ''} found
              </div>

              {filteredJobs.length > 0 ? (
                <div className="space-y-4">
                  {filteredJobs.map((job) => (
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
                            <Button onClick={() => handleApplyNow(job.id, job.title)}>
                              Apply
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="pt-12 pb-12 text-center">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No positions found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your filters or check back soon for new opportunities.
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Culture */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">Our Culture</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                At EthixAI, we believe in building an inclusive, collaborative environment where everyone can do their best work.
                We value curiosity, empathy, and a commitment to making AI systems fairer for everyone. Our team is distributed
                across the globe, united by a shared mission to eliminate bias in AI-driven financial decisions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Remote-First</Badge>
                <Badge variant="outline">Diverse Team</Badge>
                <Badge variant="outline">Impact-Driven</Badge>
                <Badge variant="outline">Innovation</Badge>
                <Badge variant="outline">Collaboration</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Opening */}
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Don't See a Perfect Fit?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We're always interested in meeting talented people who share our mission.
              Send us your resume and tell us why you'd like to join EthixAI.
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setGeneralApplicationOpen(true)}
            >
              Send General Application
            </Button>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about working at EthixAI? Reach out to{' '}
            <a href="mailto:careers@ethixai.com" className="text-primary hover:underline font-semibold">
              careers@ethixai.com
            </a>
          </p>
        </div>

        {/* Application Modals */}
        {applicationFormOpen && selectedJobId && (
          <ApplicationForm
            jobId={selectedJobId}
            jobTitle={selectedJobTitle}
            onClose={() => setApplicationFormOpen(false)}
          />
        )}

        {generalApplicationOpen && (
          <GeneralApplicationModal
            isOpen={generalApplicationOpen}
            onClose={() => setGeneralApplicationOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
