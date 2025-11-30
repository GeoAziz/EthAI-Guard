'use client';
import React from 'react';
import PageHeader from '@/components/layout/page-header';

export default function DemoPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title="Try the EthixAI Demo" subtitle="Read-only sandbox: explore reports and example datasets" />

      <section className="mt-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-xl font-semibold mb-2">Demo overview</h2>
          <p className="text-sm text-muted-foreground mb-4">
            This is a read-only sandbox that demonstrates EthixAI reports, fairness metrics, and explainability outputs using sample datasets. No account is required and no privileged actions are available.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-white p-4">
              <h3 className="font-medium">Sample Report</h3>
              <p className="text-sm text-muted-foreground">View a pre-generated sample analysis and interactive explainability charts.</p>
              <a href="/report/demo" className="text-sm text-primary underline">View sample report</a>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <h3 className="font-medium">Sample Dataset</h3>
              <p className="text-sm text-muted-foreground">Download a sample CSV to try locally.</p>
              <a href="/public/sample-datasets/lending-aml-seed.csv" className="text-sm text-primary underline">Download CSV</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Notes</h3>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          <li>This page is intentionally read-only. Any UI that would trigger protected backend endpoints is disabled.</li>
          <li>To perform analyses or manage users you must <a href="/register" className="underline text-primary">create an account</a> and follow the onboarding flow.</li>
        </ul>
      </section>
    </div>
  );
}
