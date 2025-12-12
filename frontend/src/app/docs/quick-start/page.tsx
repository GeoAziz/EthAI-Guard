import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quick Start - EthixAI Documentation',
  description: 'Get up and running with EthixAI in minutes. Step-by-step guide to analyze your first dataset.',
};

export default function QuickStartPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Get up and running with EthixAI in minutes. Follow these steps to analyze your first dataset.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Step 1: Create an Account</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Sign up for a free account to access the EthixAI dashboard.
              </p>
              <Button asChild>
                <Link href="/register">Create Account</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Step 2: Upload Your Dataset</h2>
          <p className="text-muted-foreground mb-4">
            Navigate to the dashboard and upload a CSV file containing your data. Try our demo dataset to explore features:
          </p>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Demo Loan Dataset</p>
                  <p className="text-sm text-muted-foreground">50 loan applications with demographics</p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Load Demo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Step 3: Run Analysis</h2>
          <p className="text-muted-foreground mb-4">
            Click "Run Fairness Analysis" to start the bias detection and explainability analysis. Results appear in seconds.
          </p>
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <pre className="text-sm">
                Analysis complete in 1.8s

                ✓ Fairness metrics calculated
                ✓ SHAP explanations generated
                ✓ Compliance report ready
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Step 4: Review Results</h2>
          <p className="text-muted-foreground mb-4">
            Explore fairness metrics, SHAP explanations, and compliance reports in the interactive dashboard.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">FairLens</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View demographic parity, equal opportunity, and disparate impact metrics.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ExplainBoard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Explore SHAP summary plots and feature importance rankings.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Generate audit-ready reports for ECOA, GDPR, and FCRA.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Next Steps</h2>
          <div className="space-y-3">
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <Link href="/docs/data-format" className="flex items-center justify-between group">
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">Learn about data requirements</p>
                    <p className="text-sm text-muted-foreground">Understand CSV structure and field specifications</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <Link href="/docs/fairness-metrics" className="flex items-center justify-between group">
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">Deep dive into fairness metrics</p>
                    <p className="text-sm text-muted-foreground">Mathematical definitions and thresholds</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>
              </CardContent>
            </Card>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <Link href="/api-reference" className="flex items-center justify-between group">
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">Explore the API</p>
                    <p className="text-sm text-muted-foreground">Integrate EthixAI into your applications</p>
                  </div>
                  <span className="text-primary">→</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
