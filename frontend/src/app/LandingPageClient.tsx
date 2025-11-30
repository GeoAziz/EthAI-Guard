'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ArrowRight, CheckCircle, BarChart, FileJson, ShieldCheck, Github, BookOpen, FileText } from 'lucide-react';
import { Footer } from '@/components/layout/footer';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const features = [
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: 'Fairness Analysis',
    description: 'Detect and mitigate bias with 3 key metrics: Demographic Parity, Equal Opportunity, and Disparate Impact. Get instant fairness scores and actionable insights.',
    metrics: ['Demographic Parity ≤ 0.10', 'Equal Opportunity ≤ 0.10', 'Disparate Impact ≥ 0.80'],
  },
  {
    icon: <FileJson className="w-8 h-8 text-primary" />,
    title: 'Explainability',
    description: 'Understand model predictions with SHAP analysis. Visualize feature importance, force plots, and dependence plots for complete transparency.',
    metrics: ['SHAP Values', 'Feature Importance', 'Force Plots'],
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: 'Compliance Reporting',
    description: 'Ensure your AI systems adhere to ECOA, GDPR, and FCRA regulations. Generate audit-ready reports with compliance scores and violation alerts.',
    metrics: ['ECOA Compliance', 'GDPR Ready', 'FCRA Aligned'],
  },
];

const carouselFeatures = [
  {
    id: PlaceHolderImages[0]?.id || '1',
    title: 'FairLens',
    description: 'Analyze disparate impact, statistical parity, and equal opportunity with interactive charts.',
    image: PlaceHolderImages[0]?.imageUrl || 'https://picsum.photos/seed/fairlens/600/400',
    imageHint: PlaceHolderImages[0]?.imageHint || 'data visualization',
  },
  {
    id: PlaceHolderImages[1]?.id || '2',
    title: 'ExplainBoard',
    description: 'Generate SHAP summary plots, force plots, and dependence plots to demystify your model\'s behavior.',
    image: PlaceHolderImages[1]?.imageUrl || 'https://picsum.photos/seed/explainboard/600/400',
    imageHint: PlaceHolderImages[1]?.imageHint || 'abstract graph',
  },
  {
    id: PlaceHolderImages[2]?.id || '3',
    title: 'Compliance Reports',
    description: 'Automatically generate audit-ready reports with compliance scores and actionable recommendations.',
    image: PlaceHolderImages[2]?.imageUrl || 'https://picsum.photos/seed/compliance/600/400',
    imageHint: PlaceHolderImages[2]?.imageHint || 'document paper',
  },
];

const frameworkLogos = [
  { name: 'SHAP', logo: <span className="text-2xl font-bold">SHAP</span> },
  { name: 'AIF360', logo: <span className="text-2xl font-bold">AIF360</span> },
  { name: 'Scikit-learn', logo: <span className="text-2xl font-bold">Scikit-learn</span> },
  { name: 'TensorFlow', logo: <span className="text-2xl font-bold">TensorFlow</span> },
  { name: 'PyTorch', logo: <span className="text-2xl font-bold">PyTorch</span> },
];

function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll when menu is open to prevent background scrolling
  useEffect(() => {
    if (typeof document === 'undefined') {return;}
    const prev = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? 'hidden' : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);
  return (
    <div className="container flex h-14 items-center px-4">
      <Link href="/" className="mr-4 md:mr-6 flex items-center space-x-2">
        <Logo />
      </Link>
      {/* Desktop nav */}
      <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
        <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">Features</Link>
        <Link href="/docs" className="transition-colors hover:text-foreground/80 text-foreground/60">Docs</Link>
        <Link href="/about" className="transition-colors hover:text-foreground/80 text-foreground/60">About</Link>
        <Link href="/blog" className="transition-colors hover:text-foreground/80 text-foreground/60">Blog</Link>
      </nav>
      {/* Mobile hamburger */}
      <button
        className="md:hidden ml-auto flex items-center justify-center rounded p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(v => !v)}
      >
        <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-foreground">
          {menuOpen ? (
            <line x1="18" y1="6" x2="6" y2="18" />
          ) : (
            <line x1="3" y1="12" x2="21" y2="12" />
          )}
          {menuOpen ? (
            <line x1="6" y1="6" x2="18" y2="18" />
          ) : (
            <line x1="3" y1="6" x2="21" y2="6" />
          )}
          {!menuOpen && <line x1="3" y1="18" x2="21" y2="18" />}
        </svg>
      </button>
      {/* Mobile overlay (darker for better contrast) */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-md transition-opacity duration-200 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />
      {/* Mobile drawer: fully opaque background (light/dark) so content behind isn't visible */}
      <nav
        className={`fixed top-0 right-0 h-full w-72 !bg-white dark:!bg-slate-900 bg-white/100 dark:bg-slate-900/100 border-l border-border/10 text-foreground shadow-2xl z-50 transform transition-transform duration-200 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Main menu"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
      >
        <div className="flex flex-col h-full p-6 gap-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-lg">Menu</span>
            <button
              className="rounded p-2 hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-foreground">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <Link href="#features" className="py-3 px-4 rounded text-base font-medium transition-colors text-foreground hover:bg-card/20" onClick={() => setMenuOpen(false)}>Features</Link>
            <Link href="/docs" className="py-3 px-4 rounded text-base font-medium transition-colors text-foreground hover:bg-card/20" onClick={() => setMenuOpen(false)}>Docs</Link>
            <Link href="/about" className="py-3 px-4 rounded text-base font-medium transition-colors text-foreground hover:bg-card/20" onClick={() => setMenuOpen(false)}>About</Link>
            <Link href="/blog" className="py-3 px-4 rounded text-base font-medium transition-colors text-foreground hover:bg-card/20" onClick={() => setMenuOpen(false)}>Blog</Link>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button variant="ghost" asChild className="w-full">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="w-full text-center">Log In</Link>
            </Button>
            <Button asChild size="sm" className="w-full">
              <Link href="/register" onClick={() => setMenuOpen(false)} className="w-full inline-flex items-center justify-center gap-2">
                <span>Sign Up</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default function LandingPageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <MobileHeader />
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 lg:py-32 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20"
          >
            <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700" />
            <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600" />
          </div>
          <div className="container relative z-10 text-center px-4">
            <Link href="/blog" className="inline-flex items-center rounded-full border px-3 md:px-4 py-1 md:py-1.5 mb-4 md:mb-6 text-xs md:text-sm font-medium bg-card/50 backdrop-blur-sm hover:bg-card transition-colors">
              <span className="mr-1 md:mr-2">🎉</span>
              <span>Now with real-time bias detection</span>
              <ArrowRight className="ml-1 md:ml-2 h-3 w-3" />
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 md:mb-6 animate-fade-in-up px-4">
              Trustworthy AI starts with<br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
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
                  Start Free Analysis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base md:text-lg px-6 md:px-8">
                <Link href="/docs">
                  <BookOpen className="mr-2 h-4 w-4 md:h-5 md:w-5" />
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
                    <div className="mx-auto bg-primary/10 p-3 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                      {feature.icon}
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-left">
                    <p className="text-muted-foreground mb-4">{feature.description}</p>
                    <div className="space-y-2">
                      {feature.metrics.map((metric, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
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
                        <div className="grid md:grid-cols-2 items-center">
                          <div className="p-6 md:p-8">
                            <h3 className="text-xl md:text-2xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
                          </div>
                          <div className="bg-muted h-48 md:h-64 lg:h-full flex items-center justify-center">
                            <Image
                              src={feature.image}
                              alt={feature.title}
                              width={600}
                              height={400}
                              data-ai-hint={feature.imageHint}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </div>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex sm:left-0" />
              <CarouselNext className="hidden sm:flex sm:right-0" />
            </Carousel>
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
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
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
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
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
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
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
                      <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
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
                <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl p-4 md:p-6 lg:p-8 backdrop-blur-sm border border-primary/20">
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
              Trusted by Financial Institutions
            </h2>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      JD
                    </div>
                    <div>
                      <div className="font-semibold">Jane Doe</div>
                      <div className="text-xs text-muted-foreground">Chief Risk Officer, FinBank</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "EthixAI helped us identify and eliminate bias in our loan approval models. The SHAP explanations are invaluable for our audit process."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500">★</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      MS
                    </div>
                    <div>
                      <div className="font-semibold">Michael Smith</div>
                      <div className="text-xs text-muted-foreground">Head of AI, CreditTech</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "The real-time bias detection caught issues we didn't even know existed. Now we're fully ECOA compliant with confidence."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500">★</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      SC
                    </div>
                    <div>
                      <div className="font-semibold">Sarah Chen</div>
                      <div className="text-xs text-muted-foreground">VP Engineering, LoanAI</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    "Open source, production-ready, and incredibly easy to integrate. EthixAI is now a critical part of our ML pipeline."
                  </p>
                  <div className="flex gap-1 mt-4" aria-label="5 star rating">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="text-yellow-500">★</span>
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-8 md:p-12 text-center text-white shadow-2xl">
              <div className="absolute inset-0 bg-grid-white/10" />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                  Ready to Build Trustworthy AI?
                </h2>
                <p className="text-base md:text-lg lg:text-xl mb-6 md:mb-8 text-white/90 max-w-2xl mx-auto px-4">
                  Join financial institutions using EthixAI to ensure their AI models are fair, explainable, and compliant.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 px-4">
                  <Button size="lg" variant="secondary" asChild className="text-base md:text-lg px-6 md:px-8">
                    <Link href="/dashboard">
                      Start Free Analysis <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
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
    </div>
  );
}
