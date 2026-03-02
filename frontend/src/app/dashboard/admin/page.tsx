'use client';
import React, { useState, useEffect } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KPISkeletonGrid } from '@/components/ui/kpi-skeleton';

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading metrics
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Organization Admin" subtitle="Overview & quick actions" />

        {isLoading ? (
          <KPISkeletonGrid count={3} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl sm:text-4xl font-bold">128</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-2">Total active users this month</div>
                </CardContent>
              </Card>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
              <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Pending Access Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl sm:text-4xl font-bold text-amber-600">3</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-2">Requests waiting for review</div>
                </CardContent>
              </Card>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
              <Card className="hover:shadow-lg hover:scale-105 transition-all duration-300 ease-out">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base font-semibold">Monthly Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl sm:text-4xl font-bold">1.2k</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-2">Analyses run this month</div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ChartPlaceholder title="Analysis Volume (line)" height={200} />
          <ChartPlaceholder title="Role Distribution (pie)" height={200} />
        </div>
      </div>
    </RoleProtected>
  );
}
