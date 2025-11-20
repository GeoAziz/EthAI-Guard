import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contributing - EthixAI Documentation',
  description: 'Learn how to contribute to EthixAI with our code of conduct and development guidelines.',
};

export default function ContributingPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Contributing</h1>
      <p className="text-lg text-muted-foreground mb-8">
        We welcome contributions from the community! Here's how you can help make EthixAI better.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Ways to Contribute</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🐛 Report Bugs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Found a bug? Help us fix it by submitting a detailed issue.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/GeoAziz/EthAI-Guard/issues/new?template=bug_report.md" target="_blank" rel="noopener noreferrer">
                    Report Bug
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">💡 Feature Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Have an idea for a new feature? We'd love to hear it!
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/GeoAziz/EthAI-Guard/issues/new?template=feature_request.md" target="_blank" rel="noopener noreferrer">
                    Request Feature
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">📝 Documentation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Improve or add to our documentation and tutorials.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/docs">View Docs</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">💻 Code Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Submit pull requests for bug fixes or new features.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://github.com/GeoAziz/EthAI-Guard/pulls" target="_blank" rel="noopener noreferrer">
                    View PRs
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Development Setup</h2>
          <p className="text-muted-foreground mb-4">
            Get your local development environment ready.
          </p>
          
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">1. Fork and Clone</CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
{`# Fork the repo on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/EthAI-Guard.git
cd EthAI-Guard
git remote add upstream https://github.com/GeoAziz/EthAI-Guard.git`}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">2. Create a Branch</CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
{`git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix`}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">3. Install Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
{`# Frontend
cd frontend && npm install

# Backend
cd backend && pip install -r requirements.txt

# AI Core
cd ai_core && pip install -r requirements.txt`}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Run Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <Card className="bg-muted">
                <CardContent className="pt-6">
                  <pre className="text-sm overflow-x-auto">
{`# Frontend tests
npm test

# Backend tests
pytest

# Ensure all tests pass before submitting PR`}
                  </pre>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Code Standards</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">TypeScript/React</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use TypeScript for all new files</li>
                  <li>• Follow ESLint configuration</li>
                  <li>• Use functional components with hooks</li>
                  <li>• Add JSDoc comments for public APIs</li>
                  <li>• Write unit tests for components</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Python</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Follow PEP 8 style guide</li>
                  <li>• Use type hints for functions</li>
                  <li>• Write docstrings for all modules</li>
                  <li>• Format with Black (line length 100)</li>
                  <li>• Add unit tests with pytest</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Pull Request Process</h2>
          <Card>
            <CardContent className="pt-6">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">1</Badge>
                  <div>
                    <p className="font-semibold mb-1">Update your branch</p>
                    <p className="text-sm text-muted-foreground">Sync with upstream/main before submitting</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">2</Badge>
                  <div>
                    <p className="font-semibold mb-1">Write clear commit messages</p>
                    <p className="text-sm text-muted-foreground">Use conventional commits format (feat:, fix:, docs:)</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">3</Badge>
                  <div>
                    <p className="font-semibold mb-1">Add tests</p>
                    <p className="text-sm text-muted-foreground">Include unit tests for new features or bug fixes</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">4</Badge>
                  <div>
                    <p className="font-semibold mb-1">Update documentation</p>
                    <p className="text-sm text-muted-foreground">Document new features in appropriate docs pages</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">5</Badge>
                  <div>
                    <p className="font-semibold mb-1">Submit PR</p>
                    <p className="text-sm text-muted-foreground">Use the PR template and link related issues</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Badge className="h-6 w-6 rounded-full flex items-center justify-center p-0 shrink-0">6</Badge>
                  <div>
                    <p className="font-semibold mb-1">Address review feedback</p>
                    <p className="text-sm text-muted-foreground">Respond to code review comments promptly</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Code of Conduct</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                We are committed to providing a welcoming and inclusive environment for all contributors.
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-muted-foreground">Be respectful and considerate in all interactions</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-muted-foreground">Welcome newcomers and help them get started</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <p className="text-muted-foreground">Focus on constructive feedback and solutions</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <p className="text-muted-foreground">No harassment, discrimination, or offensive behavior</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <p className="text-muted-foreground">No trolling, spam, or deliberate disruption</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Report violations to <a href="mailto:conduct@ethixai.com" className="text-primary hover:underline">conduct@ethixai.com</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Recognition</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                We value all contributions and recognize our contributors in the following ways:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Listed in CONTRIBUTORS.md file</li>
                <li>• Mentioned in release notes for significant contributions</li>
                <li>• Special recognition badges for sustained contributors</li>
                <li>• Opportunities to join the core team</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="bg-gradient-to-r from-primary/10 to-purple-500/10 p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Ready to Contribute?</h2>
          <p className="text-muted-foreground mb-4">
            Join our community and help build the future of ethical AI.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <a href="https://github.com/GeoAziz/EthAI-Guard" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/community/discord">
                Join Discord
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
