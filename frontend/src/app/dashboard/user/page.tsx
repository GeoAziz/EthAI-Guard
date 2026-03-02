'use client';
import React from 'react';
import Link from 'next/link';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function UserDashboardPage() {
  return (
    <RoleProtected required={['user']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-4xl mx-auto">
        <Breadcrumbs />
        <PageHeader
          title="Your Dashboard"
          subtitle="Personal workspace for running analyses and reviewing reports"
        />

        {/* Quick Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Link href="/dashboard/user/run" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Start Analysis</span>
            </Button>
          </Link>
          <Link href="/dashboard/user/reports" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">View My Reports</Button>
          </Link>
          <Link href="/dashboard/user/profile" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">Profile Settings</Button>
          </Link>
        </div>

        {/* Overview Cards */}
        <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Getting Started</h3>
            <p className="text-base sm:text-lg font-semibold mt-2">Upload & Analyze</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              Create a new analysis to test bias detection and fairness metrics on your datasets.
            </p>
            <Link href="/dashboard/user/run">
              <Button variant="ghost" size="sm" className="mt-4 group transition-all duration-200">
                Learn more
                <span className="ml-1 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Button>
            </Link>
          </div>

          <div className="animate-in fade-in slide-in-from-right-2 duration-500 rounded-lg border bg-white p-4 sm:p-6 hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</h3>
            <p className="text-base sm:text-lg font-semibold mt-2">No analyses yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              Your analysis history will appear here once you run your first analysis.
            </p>
            <Link href="/dashboard/user/run">
              <Button variant="ghost" size="sm" className="mt-4 group transition-all duration-200">
                Run Analysis
                <span className="ml-1 group-hover:translate-x-1 transition-transform duration-200">→</span>
              </Button>
            </Link>
          </div>
        </section>

        {/* Resources */}
        <section className="mt-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Resources</h2>
          <div className="rounded-lg border bg-white p-4 sm:p-6">
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/docs" className="text-primary hover:underline">📖 Documentation</a>
                <p className="text-xs text-muted-foreground mt-1">Learn how to use EthixAI</p>
              </li>
              <li>
                <a href="/docs/quick-start" className="text-primary hover:underline">⚡ Quick Start Guide</a>
                <p className="text-xs text-muted-foreground mt-1">Get up and running in 5 minutes</p>
              </li>
              <li>
                <a href="/docs/fairness-metrics" className="text-primary hover:underline">🎯 Fairness Metrics</a>
                <p className="text-xs text-muted-foreground mt-1">Understand bias measurement</p>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
