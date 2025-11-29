"use client";
import React from "react";
import RoleProtected from "@/components/auth/RoleProtected";
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <RoleProtected required={["admin"]}>
      <div className="p-6">
        <Breadcrumbs />
        <PageHeader title="Organization Admin" subtitle="Overview & quick actions" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">128</div>
              <div className="text-sm text-muted-foreground">Total active users this month</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Access Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">3</div>
              <div className="text-sm text-muted-foreground">Requests waiting for review</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.2k</div>
              <div className="text-sm text-muted-foreground">Analyses run this month</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartPlaceholder title="Analysis Volume (line)" height={200} />
          <ChartPlaceholder title="Role Distribution (pie)" height={200} />
        </div>
      </div>
    </RoleProtected>
  );
}
