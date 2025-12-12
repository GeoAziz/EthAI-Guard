'use client';
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full">
        <Breadcrumbs />
        <PageHeader title="Organization Admin" subtitle="Overview & quick actions" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">128</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Total active users this month</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Pending Access Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">3</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Requests waiting for review</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base">Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">1.2k</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Analyses run this month</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <ChartPlaceholder title="Analysis Volume (line)" height={200} />
          <ChartPlaceholder title="Role Distribution (pie)" height={200} />
        </div>
      </div>
    </RoleProtected>
  );
}
