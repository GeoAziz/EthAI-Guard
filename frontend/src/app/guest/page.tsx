'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, BarChart, FileJson, ShieldCheck, Eye, Lock, Zap, Users, FileText, Download } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Logo } from '@/components/logo';
import { MobileHeader } from '@/components/layout/mobile-header';

const guestMenuItems = [
  { label: 'Docs', href: '/docs' },
  { label: 'Features', href: '#features' },
  { label: 'Playground', href: '#demo' },
];

const comparisonFeatures = [
  { feature: 'View sample reports', guest: true, user: true, analyst: true },
  { feature: 'Upload datasets', guest: false, user: true, analyst: true },
  { feature: 'Run analyses', guest: false, user: true, analyst: true },
  { feature: 'Download reports', guest: false, user: 'Limited (3/mo)', analyst: true },
  { feature: 'Team collaboration', guest: false, user: false, analyst: true },
  { feature: 'Audit logs & compliance', guest: false, user: false, analyst: true },
  { feature: 'Model management', guest: false, user: false, analyst: true },
  { feature: 'Custom thresholds', guest: false, user: false, analyst: true },
];

const trustBadges = [
  { label: 'ECOA Compliant', icon: '⚖️' },
  { label: 'GDPR Ready', icon: '🛡️' },
  { label: 'FCRA Aligned', icon: '📋' },
  { label: 'SOC 2 Type II', icon: '✓' },
];

const supportItems = [
  {
    icon: <Eye className="w-5 h-5 text-primary" />,
    title: 'See Results Live',
    description: 'Interactive preview shows real fairness metrics and SHAP explanations without sign-up.',
  },
  {
    icon: <Zap className="w-5 h-5 text-primary" />,
    title: 'No Risk Assessment',
    description: 'Explore all features risk-free. No credit card required. Cancel anytime.',
  },
  {
    icon: <Lock className="w-5 h-5 text-primary" />,
    title: 'Enterprise Security',
    description: 'Bank-grade encryption, SOC 2 Type II certified, compliance audits included.',
  },
];

export default function GuestLandingPage() {
  const [activeMetric, setActiveMetric] = useState<'parity' | 'opportunity' | 'impact'>('parity');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <MobileHeader logo={<Logo />} menuItems={guestMenuItems} ctaLabel="Sign Up" ctaHref="/register" />
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 md:py-24 lg:py-32 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20"
          >
            <div className="blur-[80px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 dark:to-purple-900 will-change-filter" style={{ contentVisibility: 'auto' }} />
            <div className="blur-[80px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:from-indigo-600 dark:to-purple-800 will-change-filter" style={{ contentVisibility: 'auto' }} />
          </div>
          <div className="container relative z-10 text-center px-4">
            <Link href="/blog" className="inline-flex items-center rounded-full border px-3 md:px-4 py-1 md:py-1.5 mb-4 md:mb-6 text-xs md:text-sm font-medium bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <span className="mr-1 md:mr-2">👀</span>
              <span>Explore fairness in action (no login required)</span>
              <ArrowRight className="ml-1 md:ml-2 h-3 w-3" />
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 md:mb-6 animate-fade-in-up px-4">
              See Fairness in Action
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-purple-600 dark:from-primary dark:to-purple-800 bg-clip-text text-transparent">
                No Sign-Up Required
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 px-4">
              Experience EthixAI's bias detection and explainability tools. Play with real fairness metrics, explore SHAP analysis, and discover how your models perform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-8 md:mb-12 px-4">
              <Button size="lg" asChild className="text-base md:text-lg px-6 md:px-8 bg-primary hover:bg-primary/90">
                <Link href="/register">
                  Start Your Analysis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base md:text-lg px-6 md:px-8">
                <Link href="#demo">
                  <Eye className="mr-2 h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  Explore Demo
                </Link>
              </Button>
            </div>

            {/* Trust Row */}
            <div className="mt-8 md:mt-16 flex flex-wrap justify-center gap-4 md:gap-6 px-4">
              {trustBadges.map((badge, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="text-lg">{badge.icon}</span>
                  <span className="text-muted-foreground font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Support Items */}
        <section className="py-12 md:py-20 bg-card/20">
          <div className="container px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {supportItems.map((item, idx) => (
                <Card key={idx} className="bg-card shadow-md hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="mb-2">{item.icon}</div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section id="demo" className="py-12 md:py-20">
          <div className="container px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Try It Out: Fairness Analysis Playground</h2>
              <p className="max-w-2xl mx-auto mt-3 md:mt-4 text-sm md:text-base text-muted-foreground px-4">
                Interact with real fairness metrics on sample loan dataset. No data submission required.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
              {/* Controls */}
              <div>
                <Card className="bg-card shadow-lg">
                  <CardHeader>
                    <CardTitle>Select Metric</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {[
                        { id: 'parity', label: 'Demographic Parity', desc: 'Equal selection rates across groups' },
                        { id: 'opportunity', label: 'Equal Opportunity', desc: 'Equal true positive rates' },
                        { id: 'impact', label: 'Disparate Impact', desc: '4/5 rule threshold check' },
                      ].map((metric) => (
                        <button
                          key={metric.id}
                          onClick={() => setActiveMetric(metric.id as typeof activeMetric)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            activeMetric === metric.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="font-semibold text-sm md:text-base">{metric.label}</div>
                          <div className="text-xs md:text-sm text-muted-foreground mt-1">{metric.desc}</div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-lg mt-4">
                  <CardHeader>
                    <CardTitle className="text-base">Sample Dataset: Loan Approvals</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>📊 <strong>5,000 records</strong> • Loan applications</p>
                    <p>👥 <strong>Demographics:</strong> Age, Gender, Race</p>
                    <p>💰 <strong>Features:</strong> Income, Credit Score, Debt Ratio</p>
                    <p>✅ <strong>Target:</strong> Approval / Denial</p>
                  </CardContent>
                </Card>
              </div>

              {/* Results Display */}
              <div>
                <Card className="bg-gradient-to-br from-card to-card/80 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Live Fairness Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall Score */}
                    <div className="bg-card/50 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Fairness Score</span>
                        <span className="text-3xl font-bold text-green-500">83%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full" style={{ width: '83%' }} />
                      </div>
                    </div>

                    {/* Metric Results */}
                    <div className="space-y-3">
                      {activeMetric === 'parity' && (
                        <div className="space-y-3">
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Female Selection Rate</span>
                              <span className="font-mono text-sm font-bold text-green-600">68%</span>
                            </div>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Male Selection Rate</span>
                              <span className="font-mono text-sm font-bold text-green-600">71%</span>
                            </div>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-yellow-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Difference</span>
                              <span className="font-mono text-sm font-bold text-yellow-600">3% ⚠️</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">✓ Within acceptable threshold (&lt;10%)</p>
                          </div>
                        </div>
                      )}

                      {activeMetric === 'opportunity' && (
                        <div className="space-y-3">
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Female TPR (Positives)</span>
                              <span className="font-mono text-sm font-bold text-green-600">81%</span>
                            </div>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Male TPR (Positives)</span>
                              <span className="font-mono text-sm font-bold text-green-600">84%</span>
                            </div>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-green-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Difference</span>
                              <span className="font-mono text-sm font-bold text-green-600">3% ✓</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">✓ Strong equality of opportunity</p>
                          </div>
                        </div>
                      )}

                      {activeMetric === 'impact' && (
                        <div className="space-y-3">
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-yellow-500">
                            <div className="flex justify-between items-center">
                              <span className="text-xs md:text-sm font-medium">Disparate Impact Ratio</span>
                              <span className="font-mono text-sm font-bold text-yellow-600">0.82</span>
                            </div>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">
                              <strong>Rule:</strong> Ratio ≥ 0.80 is acceptable
                            </p>
                          </div>
                          <div className="bg-card/50 rounded-lg p-3 border-l-4 border-yellow-500">
                            <p className="text-xs font-semibold text-yellow-600">⚠ Marginal Pass</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Review hiring/approval patterns to ensure no adverse impact
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/50 pt-4 mt-4">
                      <Button asChild className="w-full" size="sm">
                        <Link href="/register">
                          Create Free Account to Upload Your Data <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Specs Section */}
        <section id="features" className="py-12 md:py-20 bg-card/20">
          <div className="container px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Powerful Features Built for Finance</h2>
              <p className="max-w-2xl mx-auto mt-3 md:mt-4 text-sm md:text-base text-muted-foreground">
                Enterprise tools for bias detection, explainability, and compliance reporting.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <BarChart className="w-6 h-6 text-primary" />,
                  title: 'Fairness Analysis',
                  description: 'Detect bias with Demographic Parity, Equal Opportunity, and Disparate Impact metrics.',
                  items: ['Real-time scoring', 'Historical tracking', 'Threshold alerts'],
                },
                {
                  icon: <FileJson className="w-6 h-6 text-primary" />,
                  title: 'Explainability',
                  description: 'Understand every model decision with SHAP analysis and feature importance.',
                  items: ['Force plots', 'Dependence plots', 'Feature interactions'],
                },
                {
                  icon: <ShieldCheck className="w-6 h-6 text-primary" />,
                  title: 'Compliance',
                  description: 'Regulatory-ready reporting for ECOA, GDPR, and FCRA compliance.',
                  items: ['Audit trails', 'Report generation', 'Violation detection'],
                },
              ].map((feature, idx) => (
                <Card key={idx} className="bg-card shadow-md hover:shadow-lg transition-all">
                  <CardHeader>
                    <div className="mb-2">{feature.icon}</div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs md:text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-12 md:py-20">
          <div className="container px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Choose Your Plan</h2>
              <p className="max-w-2xl mx-auto mt-3 md:mt-4 text-sm md:text-base text-muted-foreground">
                Start free, upgrade when you're ready. All plans include premium support.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg">
                <thead>
                  <tr className="border-b border-border bg-card/50">
                    <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-semibold">Feature</th>
                    <th className="px-4 md:px-6 py-3 text-center text-xs md:text-sm font-semibold">Guest</th>
                    <th className="px-4 md:px-6 py-3 text-center text-xs md:text-sm font-semibold">User (Free)</th>
                    <th className="px-4 md:px-6 py-3 text-center text-xs md:text-sm font-semibold">Analyst (Pro)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-card/30 transition-colors">
                      <td className="px-4 md:px-6 py-4 text-xs md:text-sm font-medium">{row.feature}</td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        {row.guest ? (
                          <CheckCircle className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        {row.user === true ? (
                          <CheckCircle className="w-5 h-5 text-primary mx-auto" />
                        ) : row.user === false ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-xs md:text-sm">{row.user}</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        {row.analyst === true ? (
                          <CheckCircle className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 md:mt-12 flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Button asChild size="lg" className="text-base md:text-lg px-6 md:px-8">
                <Link href="/register">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8">
                <Link href="/docs">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CTA Footer */}
        <section className="py-12 md:py-20 border-t bg-gradient-to-b from-card/30 to-background">
          <div className="container px-4 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-6">Ready to Audit Your AI?</h2>
            <p className="max-w-2xl mx-auto text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
              Join financial institutions ensuring fair, transparent, and compliant AI decisions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Button asChild size="lg" className="text-base md:text-lg px-6 md:px-8 bg-primary hover:bg-primary/90">
                <Link href="/register">
                  Start Free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
