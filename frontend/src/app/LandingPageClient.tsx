'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ArrowRight, CheckCircle, BarChart, FileJson, ShieldCheck, Github, BookOpen, FileText } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Logo } from '@/components/logo';
import { MobileHeader } from '@/components/layout/mobile-header';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { productionImages } from '@/lib/production-images';
import { debugLogger } from '@/lib/debug-logger';
import { DebugPanel } from '@/components/debug/debug-panel';

const features = [
  {
    icon: <BarChart aria-label="Analytics for fairness" className="w-6 h-6 text-primary" />,
    title: 'Fairness Analysis',
    description: 'Detect and mitigate bias with 3 key metrics: Demographic Parity, Equal Opportunity, and Disparate Impact. Get instant fairness scores and actionable insights.',
    metrics: ['Demographic Parity ≤ 0.10', 'Equal Opportunity ≤ 0.10', 'Disparate Impact ≥ 0.80'],
  },
  {
    icon: <FileJson aria-label="Model explanations" className="w-6 h-6 text-primary" />,
    title: 'Explainability',
    description: 'Understand model predictions with SHAP analysis. Visualize feature importance, force plots, and dependence plots for complete transparency.',
    metrics: ['SHAP Values', 'Feature Importance', 'Force Plots'],
  },
  {
    icon: <ShieldCheck aria-label="Compliance protection" className="w-6 h-6 text-primary" />,
    title: 'Compliance Reporting',
    description: 'Ensure your AI systems adhere to ECOA, GDPR, and FCRA regulations. Generate audit-ready reports with compliance scores and violation alerts.',
    metrics: ['ECOA Compliance', 'GDPR Ready', 'FCRA Aligned'],
  },
];

const carouselFeatures = [
  {
    id: 'fairlens',
    title: 'FairLens',
    description: 'Analyze disparate impact, statistical parity, and equal opportunity with interactive charts.',
    image: productionImages.fairlens.url,
    imageHint: productionImages.fairlens.description,
  },
  {
    id: 'explainboard',
    title: 'ExplainBoard',
    description: 'Generate SHAP summary plots, force plots, and dependence plots to demystify your model\'s behavior.',
    image: productionImages.explainboard.url,
    imageHint: productionImages.explainboard.description,
  },
  {
    id: 'compliance',
    title: 'Compliance Reports',
    description: 'Automatically generate audit-ready reports with compliance scores and actionable recommendations.',
    image: productionImages.compliance.url,
    imageHint: productionImages.compliance.description,
  },
];

const frameworkLogos = [
  { name: 'SHAP', logo: <span className="text-2xl font-bold">SHAP</span> },
  { name: 'AIF360', logo: <span className="text-2xl font-bold">AIF360</span> },
  { name: 'Scikit-learn', logo: <span className="text-2xl font-bold">Scikit-learn</span> },
  { name: 'TensorFlow', logo: <span className="text-2xl font-bold">TensorFlow</span> },
  { name: 'PyTorch', logo: <span className="text-2xl font-bold">PyTorch</span> },
];

const landingMenuItems = [
  { label: 'Features', href: '#features' },
  { label: 'Docs', href: '/docs' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
];

export default function LandingPageClient() {
  const searchParams = useSearchParams();
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    // Initialize debug logging
    debugLogger.info('LANDING_PAGE', 'Landing page mounted');
    debugLogger.debug('LANDING_PAGE', 'User agent', { userAgent: navigator.userAgent });
    debugLogger.debug('LANDING_PAGE', 'Browser language', { language: navigator.language });

    // Check if debug panel should be shown
    if (searchParams?.get('show-logs') === '1') {
      debugLogger.enable();
      setShowDebugPanel(true);
      debugLogger.info('DEBUG_UI', 'Debug panel enabled via query parameter');
    }

    // Check localStorage for debug mode
    if (typeof window !== 'undefined' && localStorage.getItem('DEBUG_MODE') === '1') {
      debugLogger.enable();
    }

    // Log page visibility changes
    const handleVisibilityChange = () => {
      const state = document.hidden ? 'hidden' : 'visible';
      debugLogger.info('PAGE_VISIBILITY', `Page became ${state}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('offline', () => {
      debugLogger.warn('NETWORK', 'Device went offline');
    });
    window.addEventListener('online', () => {
      debugLogger.success('NETWORK', 'Device came online');
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [searchParams]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <MobileHeader logo={<Logo />} menuItems={landingMenuItems} ctaLabel="Sign Up" ctaHref="/register" />
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 lg:py-32 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20"
          >
            <div className="blur-[80px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700 dark:to-purple-900 will-change-filter" style={{ contentVisibility: 'auto' }} />
            <div className="blur-[80px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:from-indigo-600 dark:to-purple-800 will-change-filter" style={{ contentVisibility: 'auto' }} />
          </div>
          <div className="container relative z-10 text-center px-4">
            <Link href="/blog" className="inline-flex items-center rounded-full border px-3 md:px-4 py-1 md:py-1.5 mb-4 md:mb-6 text-xs md:text-sm font-medium bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <span className="mr-1 md:mr-2">🎉</span>
              <span>Now with real-time bias detection</span>
              <ArrowRight className="ml-1 md:ml-2 h-3 w-3" />
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 md:mb-6 animate-fade-in-up px-4">
              Trustworthy AI starts with<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-purple-600 dark:from-primary dark:to-purple-800 bg-clip-text text-transparent">
                measurable fairness
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 px-4">
              EthixAI is an <span className="font-semibold text-foreground">open-source</span> ethics and explainability engine for financial institutions,
              ensuring your AI models are <span className="font-semibold text-foreground">fair</span>, <span className="font-semibold text-foreground">transparent</span>, and <span className="font-semibold text-foreground">compliant</span>.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-8 md:mb-12 px-4">
              <Button size="lg" asChild className="text-base md:text-lg px-6 md:px-8">
                <Link href="/dashboard">
                  Start Free Analysis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base md:text-lg px-6 md:px-8">
                <Link href="/docs">
                  <BookOpen className="mr-2 h-4 w-4 md:h-5 md:w-5" aria-hidden="true" />
                  View Docs
                </Link>
              </Button>
            </div>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 max-w-4xl mx-auto mt-8 md:mt-16 px-4">
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="text-3xl font-bold text-primary">95%</div>
                <div className="text-sm text-muted-foreground mt-1">Accuracy</div>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="text-3xl font-bold text-primary">3</div>
                <div className="text-sm text-muted-foreground mt-1">Compliance Standards</div>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="text-3xl font-bold text-primary">&lt;2s</div>
                <div className="text-sm text-muted-foreground mt-1">Analysis Time</div>
              </div>
              <div className="bg-card/30 backdrop-blur-sm rounded-lg p-4 border border-border/50">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground mt-1">Open Source</div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="features" className="py-12 md:py-20 bg-card/20">
          <div className="container px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Built for Responsible AI</h2>
              <p className="max-w-2xl mx-auto mt-3 md:mt-4 text-sm md:text-base text-muted-foreground px-4">
                A comprehensive toolkit to navigate the complexities of AI ethics in finance.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center bg-card shadow-md hover:shadow-xl hover:shadow-primary/10 transition-all group">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-lg w-fit group-hover:bg-primary/20 transition-colors flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-left">
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                          <span className="text-muted-foreground">{metric}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Carousel */}
        <section className="py-12 md:py-20">
          <div className="container px-4">
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Powerful Features, Simplified</h2>
              <p className="max-w-2xl mx-auto mt-3 md:mt-4 text-sm md:text-base text-muted-foreground px-4">
                From bias detection to regulatory reporting, all in one platform.
              </p>
            </div>
            <Carousel className="w-full max-w-4xl mx-auto px-4 sm:px-12" opts={{ loop: true }}>
              <CarouselContent>
                {carouselFeatures.map((feature) => (
                  <CarouselItem key={feature.id}>
                    <div className="p-1">
                      <Card className="overflow-hidden">
                        <div className="grid md:grid-cols-2 items-center relative">
                          <div className="p-6 md:p-8">
                            <h3 className="text-xl md:text-2xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
                          </div>
                          <div className="bg-muted h-48 md:h-64 lg:h-full flex items-center justify-center overflow-hidden">
                            <Image
                              src={feature.image}
                              alt={`${feature.title}: ${feature.description}`}
                              width={600}
                              height={400}
                              data-ai-hint={feature.imageHint}
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect fill='%23888' width='600' height='400'/%3E%3C/svg%3E"
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                // Show error fallback instead of hiding
                                const target = e.target as HTMLImageElement;
                                const container = target.parentElement;
                                if (container) {
                                  target.style.display = 'none';
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full flex items-center justify-center bg-muted';
                                  fallback.innerHTML = '<svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
                                  container.appendChild(fallback);
                                }
                              }}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="flex md:absolute left-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:-left-12 h-8 w-8 md:h-auto md:w-auto" />
              <CarouselNext className="flex md:absolute right-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:-right-12 h-8 w-8 md:h-auto md:w-auto" />
            </Carousel>
            <div className="flex justify-center gap-2 mt-4 md:mt-0">
              {/* Carousel indicators for mobile */}
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="py-12 md:py-20">
          <div className="container px-4">
            <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6">
                  Why Choose EthixAI?
                </h2>
                <div className="space-y-4 md:space-y-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Real-Time Analysis</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Get instant fairness scores and bias detection in under 2 seconds. Upload your CSV and receive comprehensive analysis immediately.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Production-Ready</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Built with MongoDB Atlas, Docker, and microservices architecture. Scale from prototype to production seamlessly.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Open Source & Transparent</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        100% open source with MIT license. No black boxes, no vendor lock-in. Full transparency in how fairness is measured.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base md:text-lg mb-1 md:mb-2">Financial Industry Focused</h3>
                      <p className="text-sm md:text-base text-muted-foreground">
                        Designed specifically for loan approvals, credit scoring, and financial decision-making. ECOA and FCRA compliant out of the box.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative mt-8 lg:mt-0">
                <div className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-yellow-500 dark:bg-yellow-600 text-black dark:text-gray-900 px-3 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                  🔍 DEMO
                </div>
                <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 dark:from-primary/30 dark:to-purple-800/30 rounded-2xl p-4 md:p-6 lg:p-8 backdrop-blur-sm border border-primary/20">
                  <div className="mb-4 text-xs text-muted-foreground italic">
                    Example values — your real results will vary based on your dataset
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    <div className="bg-card rounded-lg p-4 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Fairness Score</span>
                        <span className="text-2xl font-bold text-green-500">83%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '83%' }} />
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-lg">
                      <div className="text-sm font-medium mb-3">Bias Metrics</div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Demographic Parity</span>
                          <span className="font-mono text-green-600">0.08 ✓</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Equal Opportunity</span>
                          <span className="font-mono text-green-600">0.05 ✓</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Disparate Impact</span>
                          <span className="font-mono text-yellow-600">0.82 ⚠</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-lg">
                      <div className="text-sm font-medium mb-2">Feature Importance</div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">credit_score</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '35%' }} />
                          </div>
                          <span className="text-xs font-mono">35%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">debt_ratio</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '28%' }} />
                          </div>
                          <span className="text-xs font-mono">28%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">income</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: '22%' }} />
                          </div>
                          <span className="text-xs font-mono">22%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="py-12 md:py-20 bg-card/20">
          <div className="container px-4">
            <h2 className="text-center text-xl md:text-2xl font-bold mb-8 md:mb-12">
              Voices in Financial Governance
            </h2>
            <p className="text-center text-xs md:text-sm text-muted-foreground mb-8 md:mb-12">
              Illustrative personas based on common customer profiles
            </p>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold" aria-label="Avatar for Jane Doe">
                      JD
                    </div>
                    <div>
                      <div className="font-semibold">Jane Doe</div>
                      <div className="text-xs text-muted-foreground"><span className="text-yellow-600 font-semibold">[Example]</span> Chief Risk Officer, FinBank</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "EthixAI helped us identify and eliminate bias in our loan approval models. The SHAP explanations are invaluable for our audit process."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500 h-4 w-4 flex items-center justify-center" aria-hidden="true">★</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold" aria-label="Avatar for Michael Smith">
                      MS
                    </div>
                    <div>
                      <div className="font-semibold">Michael Smith</div>
                      <div className="text-xs text-muted-foreground"><span className="text-yellow-600 font-semibold">[Example]</span> Head of AI, CreditTech</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "The real-time bias detection caught issues we didn't even know existed. Now we're fully ECOA compliant with confidence."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500 h-4 w-4 flex items-center justify-center" aria-hidden="true">★</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold" aria-label="Avatar for Sarah Chen">
                      SC
                    </div>
                    <div>
                      <div className="font-semibold">Sarah Chen</div>
                      <div className="text-xs text-muted-foreground"><span className="text-yellow-600 font-semibold">[Example]</span> VP Engineering, LoanAI</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "Open source, production-ready, and incredibly easy to integrate. EthixAI is now a critical part of our ML pipeline."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500 h-4 w-4 flex items-center justify-center" aria-hidden="true">★</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Frameworks Section */}
        <section className="py-12 md:py-20">
          <div className="container px-4">
            <h2 className="text-center text-xl md:text-2xl font-bold mb-3 md:mb-4">
              Built on Industry Standards
            </h2>
            <p className="text-center text-sm md:text-base text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
              Integrating best-in-class tools for fairness, explainability, and machine learning
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
              {frameworkLogos.map((fw) => (
                <div
                  key={fw.name}
                  className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title={`Built with ${fw.name}`}
                  aria-label={fw.name}
                >
                  {fw.logo}
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/docs" className="text-sm text-primary hover:underline">
                View full tech stack documentation →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-20">
          <div className="container px-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-purple-600 dark:from-blue-900 dark:to-purple-900 p-8 md:p-12 text-center text-white shadow-2xl">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  Ready to explore ethical AI?
                </h2>
                <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-4">
                  Join financial institutions using EthixAI to ensure their AI models are fair, explainable, and compliant.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 px-4">
                  <Button size="lg" asChild className="text-base md:text-lg px-6 md:px-8">
                    <Link href="/dashboard">
                      Get Started Today <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-base md:text-lg px-6 md:px-8 bg-white/10 text-white border-white/20 hover:bg-white/20">
                    <Link href="/docs">
                      <BookOpen className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      View Documentation
                    </Link>
                  </Button>
                </div>
                <div className="mt-6 md:mt-8 text-xs md:text-sm text-white/80">
                  No credit card required • Open source • MIT License
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Debug Panel */}
      {showDebugPanel && (
        <DebugPanel onClose={() => setShowDebugPanel(false)} />
      )}

      {/* Debug Mode Toggle - only visible if debug mode is enabled */}
      {debugLogger.isDebugMode() && !showDebugPanel && (
        <button
          onClick={() => setShowDebugPanel(true)}
          className="fixed bottom-4 right-4 z-[9998] p-2 rounded-full bg-orange-500/80 text-white hover:bg-orange-600 shadow-lg"
          title="Show debug panel"
        >
          🐛
        </button>
      )}
    </div>
  );
}
