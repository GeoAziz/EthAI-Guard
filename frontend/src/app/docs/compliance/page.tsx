import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compliance - EthixAI Documentation',
  description: 'Generate audit-ready reports for ECOA, GDPR, FCRA, and SR 11-7 compliance.',
};

export default function CompliancePage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Compliance</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Generate audit-ready reports that demonstrate compliance with major AI and fairness regulations.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Supported Regulations</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">ECOA</CardTitle>
                  <Badge>US</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Equal Credit Opportunity Act - Prohibits discrimination in lending based on protected attributes.
                </p>
                <p className="text-xs font-semibold mb-1">EthixAI Coverage:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Disparate impact analysis (80% rule)</li>
                  <li>• Protected attribute monitoring</li>
                  <li>• Adverse action explanations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">GDPR</CardTitle>
                  <Badge>EU</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  General Data Protection Regulation - Right to explanation for automated decisions.
                </p>
                <p className="text-xs font-semibold mb-1">EthixAI Coverage:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• SHAP explanations for decisions</li>
                  <li>• Data processing transparency</li>
                  <li>• Automated decision logging</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">FCRA</CardTitle>
                  <Badge>US</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Fair Credit Reporting Act - Consumer rights for credit decisions and adverse actions.
                </p>
                <p className="text-xs font-semibold mb-1">EthixAI Coverage:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Adverse action reason codes</li>
                  <li>• Top contributing factors</li>
                  <li>• Decision audit trails</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">SR 11-7</CardTitle>
                  <Badge>Banking</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Federal Reserve guidance on model risk management for financial institutions.
                </p>
                <p className="text-xs font-semibold mb-1">EthixAI Coverage:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Model validation documentation</li>
                  <li>• Ongoing monitoring metrics</li>
                  <li>• Risk assessment reports</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Compliance Reports</h2>
          <p className="text-muted-foreground mb-4">
            EthixAI automatically generates comprehensive compliance reports for each analysis.
          </p>
          
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Report Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">1</Badge>
                  <div>
                    <p className="font-semibold mb-1">Executive Summary</p>
                    <p className="text-sm text-muted-foreground">
                      High-level overview of fairness findings and compliance status
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">2</Badge>
                  <div>
                    <p className="font-semibold mb-1">Fairness Metrics Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      Detailed breakdown of demographic parity, equal opportunity, and disparate impact
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">3</Badge>
                  <div>
                    <p className="font-semibold mb-1">Explainability Analysis</p>
                    <p className="text-sm text-muted-foreground">
                      SHAP summary plots and feature importance rankings
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">4</Badge>
                  <div>
                    <p className="font-semibold mb-1">Regulatory Mapping</p>
                    <p className="text-sm text-muted-foreground">
                      Which metrics satisfy which regulatory requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Badge className="mt-1">5</Badge>
                  <div>
                    <p className="font-semibold mb-1">Recommendations</p>
                    <p className="text-sm text-muted-foreground">
                      Actionable steps to improve fairness and compliance
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                  <p className="font-semibold mb-1">PDF</p>
                  <p className="text-xs text-muted-foreground">Audit-ready</p>
                </div>
                <div className="text-center p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                  <p className="font-semibold mb-1">JSON</p>
                  <p className="text-xs text-muted-foreground">API integration</p>
                </div>
                <div className="text-center p-3 border rounded-lg hover:border-primary/50 cursor-pointer transition-colors">
                  <p className="font-semibold mb-1">Excel</p>
                  <p className="text-xs text-muted-foreground">Data analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Adverse Action Notices</h2>
          <p className="text-muted-foreground mb-4">
            Generate legally compliant adverse action notices with specific reasons for denials.
          </p>
          
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Example Adverse Action Notice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-background p-4 rounded-lg text-sm space-y-3">
                <p className="font-semibold">Primary Reasons for Denial:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Credit score below minimum threshold (680 vs 700 required)</li>
                  <li>Insufficient income relative to requested amount</li>
                  <li>Limited credit history (less than 2 years)</li>
                </ol>
                <p className="text-xs text-muted-foreground pt-2">
                  Generated automatically from SHAP feature importance
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Continuous Monitoring</h2>
          <p className="text-muted-foreground mb-4">
            Track fairness metrics over time to ensure ongoing compliance.
          </p>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Alert Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatic notifications when metrics exceed acceptable ranges
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Visualize fairness metric changes over weeks and months
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Complete audit trail of analyses and report generations
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <p className="font-semibold">Run analyses regularly</p>
                    <p className="text-muted-foreground">Monthly or quarterly reviews catch drift early</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <p className="font-semibold">Document remediation steps</p>
                    <p className="text-muted-foreground">Show regulators your response to identified issues</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <p className="font-semibold">Retain historical reports</p>
                    <p className="text-muted-foreground">Build an audit trail demonstrating due diligence</p>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <div>
                    <p className="font-semibold">Involve legal counsel</p>
                    <p className="text-muted-foreground">Ensure reports meet your jurisdiction requirements</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
