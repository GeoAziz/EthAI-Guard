'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BLOG_POSTS, ALL_CATEGORIES, filterPostsByCategory } from './constants';
import { isValidEmail } from './utils';

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  const filteredPosts = filterPostsByCategory(activeCategory as any);
  const featuredPost = BLOG_POSTS[0];

  const handleCategoryFilter = (category: string) => {
    setActiveCategory(category);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setEmailStatus('error');
      setEmailMessage('Email is required');
      return;
    }

    if (!isValidEmail(email)) {
      setEmailStatus('error');
      setEmailMessage('Please enter a valid email address');
      return;
    }

    setEmailStatus('loading');

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setEmailStatus('success');
        setEmailMessage('Successfully subscribed! Check your email for confirmation.');
        setEmail('');
        setTimeout(() => setEmailStatus('idle'), 5000);
      } else {
        const data = await response.json();
        setEmailStatus('error');
        setEmailMessage(data.error || 'Failed to subscribe');
      }
    } catch (error) {
      setEmailStatus('error');
      setEmailMessage('An error occurred. Please try again.');
      console.error('Newsletter subscription error:', error);
    }
  };

  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">EthixAI Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Insights on AI fairness, explainability, and responsible ML practices in financial services.
          </p>
        </div>

        {/* Category Filter with ARIA labels */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          <div role="group" aria-label="Filter blog posts by category">
            {ALL_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryFilter(category)}
                aria-pressed={activeCategory === category}
                aria-label={`Filter posts by ${category}`}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary hover:bg-accent text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filters info */}
        {activeCategory !== 'All' && (
          <div className="mb-4 text-center">
            <button
              onClick={() => setActiveCategory('All')}
              className="text-sm text-primary hover:underline"
              aria-label="Clear category filter"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Featured Post */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge className="bg-primary text-primary-foreground">Featured</Badge>
              <Badge variant="outline">{featuredPost.category}</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl">{featuredPost.title}</CardTitle>
            <CardDescription className="text-base">{featuredPost.excerpt}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{featuredPost.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <time dateTime={featuredPost.date}>{featuredPost.date}</time>
              </div>
              <div>{featuredPost.readTime}</div>
            </div>
            <Link
              href={`/blog/${featuredPost.id}`}
              className="inline-flex items-center gap-2 mt-4 text-primary hover:underline font-semibold"
              aria-label={`Read more about ${featuredPost.title}`}
            >
              Read More <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>

        {/* Blog Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.slice(1).map((post) => (
              <Card
                key={post.id}
                className="flex flex-col hover:shadow-lg transition-shadow hover:scale-105 transform duration-200"
              >
                <CardHeader>
                  <Badge variant="outline" className="w-fit mb-2">
                    {post.category}
                  </Badge>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                  <CardDescription>{post.excerpt}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" aria-hidden="true" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        <time dateTime={post.date}>{post.date}</time>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{post.readTime}</div>
                    <Link
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
                      aria-label={`Read article: ${post.title}`}
                    >
                      Read Article <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No posts found in the {activeCategory} category yet.
            </p>
          </div>
        )}

        {/* Newsletter CTA */}
        <Card className="mt-12">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold mb-3 text-center">Stay Updated</h2>
              <p className="text-muted-foreground mb-6 text-center">
                Subscribe to our newsletter for the latest insights on AI fairness, regulatory updates, and product announcements.
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="flex gap-2 flex-col sm:flex-row">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailStatus !== 'idle') {setEmailStatus('idle');}
                    }}
                    aria-label="Email address for newsletter"
                    aria-describedby={emailStatus !== 'idle' ? 'email-message' : undefined}
                    className="flex-1 px-4 py-2 rounded-md border bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    disabled={emailStatus === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={emailStatus === 'loading' || emailStatus === 'success'}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold whitespace-nowrap"
                    aria-busy={emailStatus === 'loading'}
                  >
                    {emailStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>

                {/* Status messages */}
                {emailStatus === 'success' && (
                  <div
                    id="email-message"
                    className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-md"
                    role="alert"
                  >
                    <CheckCircle className="h-4 w-4" aria-hidden="true" />
                    {emailMessage}
                  </div>
                )}

                {emailStatus === 'error' && (
                  <div
                    id="email-message"
                    className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    {emailMessage}
                  </div>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
