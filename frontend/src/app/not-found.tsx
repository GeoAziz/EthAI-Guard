'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Home, RotateCcw, HelpCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Not Found (404) Error Page
 * Displays when user requests a page that doesn't exist
 */

interface SuggestionLink {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export default function NotFound() {
  const router = useRouter();
  const { user, roles, loading } = useAuth();
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  // Role-aware navigation suggestions
  const suggestions: SuggestionLink[] = React.useMemo(() => {
    const base = [
      {
        href: '/',
        label: 'Home',
        description: 'Return to the homepage',
        icon: <Home className="w-5 h-5" />,
      },
      {
        href: '/docs',
        label: 'Documentation',
        description: 'Browse API docs and guides',
        icon: <Search className="w-5 h-5" />,
      },
    ];

    if (!loading && user && roles) {
      if (roles.includes('admin')) {
        base.push({
          href: '/dashboard/admin',
          label: 'Admin Dashboard',
          description: 'Go to admin console',
          icon: <Home className="w-5 h-5" />,
        });
      }
      if (roles.includes('analyst')) {
        base.push({
          href: '/dashboard/analyst',
          label: 'Analysis Workspace',
          description: 'Back to analysis tools',
          icon: <Home className="w-5 h-5" />,
        });
      }
      if (roles.includes('reviewer')) {
        base.push({
          href: '/dashboard/reviewer',
          label: 'Compliance Dashboard',
          description: 'Back to reviews',
          icon: <Home className="w-5 h-5" />,
        });
      }
      if (roles.includes('user')) {
        base.push({
          href: '/dashboard',
          label: 'Dashboard',
          description: 'Back to your dashboard',
          icon: <Home className="w-5 h-5" />,
        });
      }
    } else if (!loading && !user) {
      base.push({
        href: '/login',
        label: 'Sign In',
        description: 'Sign in to access more features',
        icon: <ArrowRight className="w-5 h-5" />,
      });
    }

    return base;
  }, [user, roles, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background/95 p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Error Code */}
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-amber-900/20 border border-amber-700/30">
            <Search className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-900/20 border border-amber-700/30">
            <span className="text-xs font-mono font-semibold text-amber-400">
              Error 404
            </span>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground">
            Page Not Found
          </h1>
          <p className="text-base text-muted-foreground">
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.back()}
            className="w-full justify-between gap-2"
            variant="default"
          >
            <RotateCcw className="w-4 h-4" />
            Go Back
          </Button>

          <Button
            onClick={() => router.push('/')}
            className="w-full justify-between gap-2"
            variant="outline"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>

        {/* Suggestions */}
        {!showSuggestions && (
          <button
            onClick={() => setShowSuggestions(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 text-center border-t"
            aria-label="Show navigation suggestions"
          >
            Show more options
          </button>
        )}

        {showSuggestions && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3 animate-fade-in">
            <h3 className="text-sm font-semibold text-foreground">
              Navigation Options
            </h3>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <Link
                  key={suggestion.href}
                  href={suggestion.href}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
                    {suggestion.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      {suggestion.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Support Link */}
        <div className="text-center border-t pt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Can't find what you're looking for?
          </p>
          <Button
            variant="ghost"
            onClick={() => router.push('/support')}
            className="w-full justify-between gap-2 text-primary hover:text-primary"
            size="sm"
          >
            <HelpCircle className="w-4 h-4" />
            Contact Support
          </Button>
        </div>

        {/* CSS for animations */}
        <style>{`
          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in {
            animation: fade-in-up 0.5s ease-out;
          }
        `}
        </style>
      </div>

      {/* Screen reader announcement */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Error 404: Page Not Found. The page you're looking for doesn't exist or may have been moved.
      </div>
    </div>
  );
}
