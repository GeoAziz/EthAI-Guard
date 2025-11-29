"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import ChartPlaceholder from '@/components/ui/chart-placeholder';

export default function FairnessPage() {
  return (
    <RoleProtected required={["analyst", "admin"]}>
      <div className="p-8 max-w-6xl mx-auto">
        <Breadcrumbs />
        <PageHeader title="Fairness Dashboard" subtitle="Group metrics and heatmaps for protected attributes" />

        <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Overall fairness score</h4>
            <div className="text-3xl font-bold mt-2">82</div>
            <p className="text-sm text-muted-foreground">Aggregated across active models.</p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Monitored attributes</h4>
            <ul className="mt-2 text-sm list-disc pl-5 text-muted-foreground">
              <li>gender</li>
              <li>race</li>
              <li>age_group</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h4 className="font-medium">Current alerts</h4>
            <p className="text-sm text-muted-foreground mt-2">1 attribute exceeded threshold: gender (disparate impact)</p>
          </div>
        </section>

        <section className="mt-6">
          <div className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Fairness heatmap</h4>
              <div>
                <label className="text-sm text-muted-foreground mr-2">Attribute</label>
                <select className="border rounded px-2 py-1 text-sm">
                  <option>gender</option>
                  <option>race</option>
                  <option>age_group</option>
                </select>
              </div>
            </div>
            <div className="mt-4"><ChartPlaceholder title="Fairness heatmap" height={240} /></div>
            <div className="mt-4">
              <table className="w-full text-sm table-auto">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="py-2">Group</th><th className="py-2">Metric</th><th className="py-2">Value</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="py-2">Male</td><td className="py-2">False positive rate</td><td className="py-2">0.07</td></tr>
                  <tr className="border-b"><td className="py-2">Female</td><td className="py-2">False positive rate</td><td className="py-2">0.12</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
