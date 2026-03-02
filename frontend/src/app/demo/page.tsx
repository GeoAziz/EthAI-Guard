import type { Metadata } from 'next';
import React from 'react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { FileText, Download, BarChart3, Shield, Zap, Eye } from 'lucide-react';

export const metadata: Metadata = {
  title: 'EthixAI Demo - Try Bias Detection & Explainability',
  description: 'Explore the EthixAI platform with sample reports and datasets. Read-only sandbox to see fairness analysis in action.',
  alternates: {
    canonical: 'https://ethixai.com/demo',
  },
  openGraph: {
    title: 'EthixAI Demo',
    description: 'Try EthixAI with sample datasets and reports',
    type: 'website',
  },
};

export default function DemoPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader title="Try the EthixAI Demo" subtitle="Explore bias detection and fairness analysis with sample datasets - no account needed" />


      {/* Key Metrics */}
      <section className="mt-8 grid md:grid-cols-3 gap-4 mb-12">
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Bias Detection</span>
          </div>
          <p className="text-xs text-muted-foreground">Identify fairness issues across multiple demographic groups</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Interactive Charts</span>
          </div>
          <p className="text-xs text-muted-foreground">Dive deep into metrics with dynamic visualizations</p>
        </div>
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Instant Insights</span>
          </div>
          <p className="text-xs text-muted-foreground">See fairness analysis results in seconds</p>
        </div>
      </section>

      {/* Main Demo Actions */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Get Started with the Demo</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Primary CTA - Sample Report */}
          <div className="rounded-lg border-2 border-primary/30 bg-card p-6 hover:border-primary/60 transition-colors">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">View Sample Report</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Explore a complete fairness analysis report with interactive bias detection charts, demographic breakdowns, and explainability insights.
            </p>
            <p className="text-xs text-muted-foreground mb-4 italic">Read-only: View only, no modifications</p>
            <Button asChild className="w-full">
              <a href="/report/demo">
                <Eye className="mr-2 h-4 w-4" />
                Explore Sample Report
              </a>
            </Button>
          </div>

          {/* Secondary CTA - Download Dataset */}
          <div className="rounded-lg border bg-card p-6 hover:border-primary/40 transition-colors">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/5 mb-4">
              <Download className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Download Sample Dataset</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get our sample lending dataset in CSV format. Use it locally to understand the data structure that powers our analysis.
            </p>
            <p className="text-xs text-muted-foreground mb-4 italic">CSV file ready for local analysis</p>
            <Button variant="outline" asChild className="w-full">
              <a href="/public/sample-datasets/lending-aml-seed.csv" download>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* What You'll See Section */}
      <section className="mt-12 bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-lg p-8 border border-primary/10">
        <div className="flex items-center gap-2 mb-6">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">What You'll See in the Demo</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold mb-2">In the Sample Report:</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li>✓ Fairness metrics across demographic groups</li>
              <li>✓ Bias detection with visual indicators</li>
              <li>✓ Model performance breakdowns</li>
              <li>✓ Interactive explainability charts</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Ready for Production?</h4>
            <p className="text-muted-foreground mb-3">
              To upload your own data, perform custom analyses, and manage team access, create a free account and follow our onboarding.
            </p>
            <Button asChild variant="default" size="sm">
              <a href="/register">
                Create Account & Onboard
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ-style footer note */}
      <section className="mt-8">
        <h3 className="text-lg font-semibold mb-4">About This Demo</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <span className="font-semibold text-foreground">Is this a real analysis?</span> Yes - the sample report uses actual fairness metrics and real ML models to demonstrate what EthixAI can detect.
          </p>
          <p>
            <span className="font-semibold text-foreground">Can I modify the demo data?</span> No, this is a read-only sandbox. To perform your own analyses, <a href="/register" className="text-primary underline">create an account</a>.
          </p>
          <p>
            <span className="font-semibold text-foreground">What's next?</span> After exploring the demo, register to upload datasets, run analyses, invite team members, and manage your fairness audits.
          </p>
        </div>
      </section>
    </div>
  );
}
