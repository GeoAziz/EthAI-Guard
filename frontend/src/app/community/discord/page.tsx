import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowLeft, MessageCircle, Users, Zap, Calendar, Github, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discord Community - Coming Soon | EthixAI',
  description: 'Join the EthixAI Discord community to connect with other developers building ethical AI systems.',
};

export default function DiscordComingSoonPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-card/20 p-4">
      <div className="max-w-2xl w-full">
        <Card className="border-2">
          <CardContent className="pt-12 pb-12 px-6 md:px-12 text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <MessageCircle className="h-10 w-10 text-primary" />
            </div>

            {/* Badge */}
            <Badge variant="outline" className="mb-4">
              Coming Soon
            </Badge>

            {/* Heading */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Discord Community
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We're building an amazing community space for EthixAI developers, contributors, and ethical AI enthusiasts.
            </p>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
              <div className="p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors">
                <Users className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Connect</h3>
                <p className="text-xs text-muted-foreground">
                  Network with developers building fair AI systems
                </p>
              </div>
              <div className="p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors">
                <Zap className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Get Help</h3>
                <p className="text-xs text-muted-foreground">
                  Ask questions and get support from the community
                </p>
              </div>
              <div className="p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors">
                <Calendar className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm mb-1">Stay Updated</h3>
                <p className="text-xs text-muted-foreground">
                  Get notified about new features and releases
                </p>
              </div>
            </div>

            {/* Launch Timeline */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-8">
              <h3 className="font-semibold mb-2 text-primary">🚀 Expected Launch</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Our Discord server is currently under development and will be launched in Spring 2026.
              </p>
              <p className="text-xs text-muted-foreground">
                We're working on creating dedicated channels for support, feature discussions, contributions, and community events.
              </p>
            </div>

            {/* Alternative Contact Methods */}
            <div className="mb-8">
              <p className="text-sm font-semibold mb-4">In the meantime, connect with us:</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="outline" asChild>
                  <a href="https://github.com/GeoAziz/EthAI-Guard/discussions" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-5 w-5" />
                    GitHub Discussions
                    <span className="ml-1 text-xs">↗</span>
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:community@ethixai.com">
                    <Mail className="mr-2 h-5 w-5" />
                    Email Us
                  </a>
                </Button>
              </div>
            </div>

            {/* Notify Me Form */}
            <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-3">🔔 Get Notified When We Launch</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Be the first to join when our Discord server goes live.
              </p>
              <form className="flex gap-2 max-w-md mx-auto" onSubmit={(e) => {
                e.preventDefault();
                const email = (e.target as HTMLFormElement).email?.value;
                if (email) {
                  alert(`Thank you! We'll notify ${email} when Discord launches.`);
                  (e.target as HTMLFormElement).reset();
                }
              }}>
                <input
                  type="email"
                  name="email"
                  placeholder="your.email@example.com"
                  className="flex-1 px-4 py-2 rounded-md border bg-background text-sm"
                  required
                />
                <Button type="submit">
                  Notify Me
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>

            {/* Back Button */}
            <Button variant="ghost" asChild>
              <Link href="/docs/contributing">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Contributing Guide
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Have questions? Check out our{' '}
          <Link href="/docs" className="text-primary hover:underline">
            Documentation
          </Link>{' '}
          or visit our{' '}
          <a
            href="https://github.com/GeoAziz/EthAI-Guard/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub Issues
          </a>
        </p>
      </div>
    </div>
  );
}
