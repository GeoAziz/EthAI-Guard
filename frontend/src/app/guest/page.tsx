"use client";
import React from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import PageHeader from '@/components/layout/page-header';

export default function GuestLandingPage() {
  return (
    <RoleProtected required={['guest', 'user', 'reviewer', 'analyst', 'admin']}>
      <div className="p-8 max-w-5xl mx-auto">
        <PageHeader title="EthixAI — Responsible AI" subtitle="Explainability & fairness tooling for regulated teams" />

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-xl font-semibold mb-2">Get started</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign up for an account to run analyses, view reports, and request reviewer or analyst access.</p>
            <div className="flex gap-3">
              <a href="/register" className="px-4 py-2 bg-slate-900 text-white rounded">Create account</a>
              <a href="/login" className="px-4 py-2 border rounded">Sign in</a>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-xl font-semibold mb-2">Public documentation</h2>
            <p className="text-sm text-muted-foreground mb-4">Explore docs, quick-start guides, and fairness metrics to learn how EthixAI helps your workflows.</p>
            <a href="/docs" className="text-sm text-primary underline">View docs</a>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-medium">Feature: Explainability</h3>
            <p className="text-sm text-muted-foreground">Model-level explanations and counterfactuals.</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-medium">Feature: Fairness</h3>
            <p className="text-sm text-muted-foreground">Monitors and thresholds for protected groups.</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-medium">Feature: Audit</h3>
            <p className="text-sm text-muted-foreground">Traceability and audit logs for compliance.</p>
          </div>
        </section>
      </div>
    </RoleProtected>
  );
}
