import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, CheckCircle, FileCode, Shield, Zap, Terminal, Database, Code, GitBranch } from "lucide-react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - EthixAI',
  description: 'Complete guide to building fair and explainable AI systems with EthixAI. API reference, tutorials, and best practices.',
};

const docSections = [
  {
    title: "Quick Start",
    description: "Get up and running with EthixAI in minutes",
    icon: Zap,
    href: "/docs/quick-start",
    color: "text-yellow-500",
  },
  {
    title: "Installation",
    description: "Install EthixAI locally or deploy with Docker",
    icon: Terminal,
    href: "/docs/installation",
    color: "text-green-500",
  },
  {
    title: "Authentication",
    description: "Secure your API requests with Firebase Auth",
    icon: Shield,
    href: "/docs/authentication",
    color: "text-blue-500",
  },
  {
    title: "Data Format",
    description: "Learn about required CSV structure and fields",
    icon: Database,
    href: "/docs/data-format",
    color: "text-purple-500",
  },
  {
    title: "Fairness Metrics",
    description: "Understand bias detection with key metrics",
    icon: CheckCircle,
    href: "/docs/fairness-metrics",
    color: "text-primary",
  },
  {
    title: "Explainability",
    description: "SHAP-based explanations for model transparency",
    icon: FileCode,
    href: "/docs/explainability",
    color: "text-orange-500",
  },
  {
    title: "Compliance",
    description: "Meet regulatory requirements (ECOA, GDPR, FCRA)",
    icon: Shield,
    href: "/docs/compliance",
    color: "text-red-500",
  },
  {
    title: "Contributing",
    description: "Contribute to the open-source project",
    icon: GitBranch,
    href: "/docs/contributing",
    color: "text-pink-500",
  },
];

export default function DocsPage() {
  return (
    <div className="not-prose space-y-12">
      {/* Hero */}
      <div className="bg-gradient-to-b from-card/30 to-background border rounded-lg p-8 md:p-12 text-center">
        <Badge variant="outline" className="mb-4">v1.0.0</Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Welcome to EthixAI Documentation
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Complete guide to building fair, transparent, and compliant AI systems for financial institutions.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/docs/quick-start">
              Quick Start Guide <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/api-reference">
              <Code className="mr-2 h-4 w-4" />
              API Reference
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <section>
        <h2 className="text-3xl font-bold mb-4">Overview</h2>
        <p className="text-lg text-muted-foreground mb-6">
          EthixAI is an open-source ethics and explainability engine designed specifically for financial institutions. 
          It helps you build and deploy AI models that are fair, transparent, and compliant with regulations like ECOA, GDPR, and FCRA.
        </p>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <CheckCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Fairness Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Detect bias with demographic parity, equal opportunity, and disparate impact metrics.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <FileCode className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Explainability</h3>
              <p className="text-sm text-muted-foreground">
                SHAP-based explanations for complete transparency into model decisions.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">Compliance</h3>
              <p className="text-sm text-muted-foreground">
                Automated compliance checks for ECOA, GDPR, and FCRA regulations.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Key Features
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Real-time bias detection in under 2 seconds</li>
              <li>✓ Production-ready with Docker and microservices architecture</li>
              <li>✓ 100% open source with MIT license</li>
              <li>✓ Built specifically for financial decision-making</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Documentation Sections */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Documentation Sections</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {docSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link key={section.href} href={section.href}>
                <Card className="h-full hover:shadow-lg hover:border-primary/50 transition-all group">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 p-3 rounded-lg bg-card border`}>
                        <Icon className={`h-6 w-6 ${section.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {section.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-3xl font-bold mb-6">Additional Resources</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <Code className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">API Reference</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Complete API documentation with code examples
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/api-reference">View API Docs</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <GitBranch className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">GitHub Repository</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Explore source code and contribute
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="https://github.com">View on GitHub</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <CheckCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold mb-2">System Status</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Check uptime and service status
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/status">View Status</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Get Started CTA */}
      <Card className="bg-gradient-to-br from-primary to-purple-600 text-white border-0">
        <CardContent className="pt-8 pb-8 text-center">
          <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
          <p className="mb-6 text-white/90">
            Start building fair and transparent AI systems today.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/docs/quick-start">
                Quick Start <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Link href="/dashboard">
                Try Demo
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
