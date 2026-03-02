'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Code, Database, Shield, Zap } from 'lucide-react';
import { API_ENDPOINTS, API_CATEGORIES, API_BASE_URL, API_ERRORS } from '@/lib/api-reference-data';
import { EndpointCard } from '@/components/api-reference/EndpointCard';
import { AuthenticationGuide } from '@/components/api-reference/AuthenticationGuide';
import { RateLimitsGuide } from '@/components/api-reference/RateLimitsGuide';
import { ErrorReference } from '@/components/api-reference/ErrorReference';
import { ApiNavigation } from '@/components/api-reference/ApiNavigation';
import { CodeBlock } from '@/components/api-reference/CodeBlock';

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="h-5 w-5" />,
  Code: <Code className="h-5 w-5" />,
  Shield: <Shield className="h-5 w-5" />,
  Database: <Database className="h-5 w-5" />,
};

export default function ApiReferencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Filter endpoints based on search and category
  const filteredEndpoints = useMemo(() => {
    return API_ENDPOINTS.filter((endpoint) => {
      const matchesSearch =
        endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = activeCategory ? endpoint.category === activeCategory : true;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  // Group endpoints by category for navigation
  const navigationSections = useMemo(() => {
    const sections = [
      { id: 'overview', title: 'Overview', href: '#overview' },
      { id: 'authentication', title: 'Authentication', href: '#authentication' },
      { id: 'endpoints', title: 'API Endpoints', href: '#endpoints' },
      { id: 'errors', title: 'Error Handling', href: '#errors' },
      { id: 'rate-limits', title: 'Rate Limits', href: '#rate-limits' },
    ];
    return sections;
  }, []);

  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-4 text-foreground">Navigation</h3>
              <ApiNavigation sections={navigationSections} />
            </div>
            <div className="pt-6 border-t border-muted-foreground/20">
              <p className="text-xs font-semibold text-muted-foreground mb-3">API Base URL</p>
              <code className="text-xs bg-muted px-2 py-1 rounded text-foreground break-all">
                {API_BASE_URL}
              </code>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3 space-y-12">
          {/* Header */}
          <section id="overview">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">API Reference</h1>
              <p className="text-lg text-muted-foreground">
                Complete reference for integrating EthixAI's fairness analysis and explainability APIs
                into your applications.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{API_ENDPOINTS.length}</div>
                  <p className="text-xs text-muted-foreground">API Endpoints</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{API_CATEGORIES.length}</div>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">v1</div>
                  <p className="text-xs text-muted-foreground">Current Version</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">JWT</div>
                  <p className="text-xs text-muted-foreground">Auth Type</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication">
            <AuthenticationGuide />
          </section>

          {/* API Endpoints Section */}
          <section id="endpoints" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">API Endpoints</h2>
              <p className="text-muted-foreground mb-6">
                Explore all available endpoints. Click on any endpoint to view detailed documentation.
              </p>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search endpoints by name, path, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Tabs */}
              <Tabs value={activeCategory || 'all'} onValueChange={(val) => setActiveCategory(val === 'all' ? null : val)}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {API_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id}>
                      {cat.id === 'analysis' && <Zap className="h-4 w-4" />}
                      {cat.id === 'explainability' && <Code className="h-4 w-4" />}
                      {cat.id === 'compliance' && <Shield className="h-4 w-4" />}
                      {cat.id === 'data-management' && <Database className="h-4 w-4" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={activeCategory || 'all'} className="space-y-4 mt-6">
                  {filteredEndpoints.length > 0 ? (
                    <div className="space-y-4">
                      {filteredEndpoints.map((endpoint) => (
                        <EndpointCard key={endpoint.id} endpoint={endpoint} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-lg">
                      <p className="text-muted-foreground">No endpoints found matching your search.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Error Handling */}
          <section id="errors">
            <ErrorReference errors={API_ERRORS} />
          </section>

          {/* Rate Limits */}
          <section id="rate-limits">
            <RateLimitsGuide />
          </section>

          {/* Best Practices */}
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Retry Logic</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Implement exponential backoff for transient failures (5xx errors):
                  </p>
                  <CodeBlock
                    code={`wait = base * (2 ^ attempt) + random(0, jitter)
// Example: 1s, 2s, 4s, 8s...`}
                    language="bash"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeout Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Connection timeout: 5 seconds</li>
                    <li>• Read timeout: 30 seconds (for large dataset analysis)</li>
                    <li>• Total request timeout: 60 seconds</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Request Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Always validate response HTTP status codes</li>
                    <li>• Check for error objects in JSON responses</li>
                    <li>• Monitor X-RateLimit-* headers for quota management</li>
                    <li>• Implement graceful degradation for non-critical failures</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Support */}
          <section className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-4">
              For detailed documentation, code samples, and support:
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://docs.ethixai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Documentation
              </a>
              <a
                href="https://github.com/ethixai/sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                GitHub SDK
              </a>
              <a
                href="mailto:support@ethixai.com"
                className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                Email Support
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
