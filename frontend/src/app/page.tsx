import Link from 'next/link';
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
    title: 'Fairness',
    description: 'Detect and mitigate bias in your models with advanced fairness metrics and visualizations.',
  },
  {
    icon: <FileJson className="w-8 h-8 text-primary" />,
    title: 'Explainability',
    description: 'Understand model predictions with SHAP and LIME, providing clear, human-readable explanations.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    title: 'Compliance',
    description: 'Ensure your AI systems adhere to regulatory standards with our CBK-aligned ethical compliance scoring.',
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

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo />
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="#features" className="transition-colors hover:text-foreground/80 text-foreground/60">Features</Link>
            <Link href="/docs" className="transition-colors hover:text-foreground/80 text-foreground/60">Docs</Link>
          </nav>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20"
          >
            <div className="blur-[106px] h-56 bg-gradient-to-br from-primary to-purple-400 dark:from-blue-700"></div>
            <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600"></div>
          </div>
          <div className="container relative z-10 text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 animate-fade-in-up">
              Trustworthy AI starts with measurable fairness.
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
              EthixAI is an open-source ethics and explainability engine for financial institutions, ensuring your AI models are fair, transparent, and compliant.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/dashboard">Run Analysis <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">Read Docs</Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* About Section */}
        <section id="features" className="py-20 bg-card/20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Built for Responsible AI</h2>
              <p className="max-w-2xl mx-auto mt-4 text-muted-foreground">
                A comprehensive toolkit to navigate the complexities of AI ethics in finance.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center bg-card shadow-md hover:shadow-primary/20 transition-shadow">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-lg w-fit">
                      {feature.icon}
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Carousel */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Powerful Features, Simplified</h2>
              <p className="max-w-2xl mx-auto mt-4 text-muted-foreground">
                From bias detection to regulatory reporting, all in one platform.
              </p>
            </div>
            <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true }}>
              <CarouselContent>
                {carouselFeatures.map((feature) => (
                  <CarouselItem key={feature.id}>
                    <div className="p-1">
                      <Card className="overflow-hidden">
                        <div className="grid md:grid-cols-2 items-center">
                          <div className="p-8">
                            <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                          </div>
                          <div className="bg-muted h-64 md:h-full flex items-center justify-center">
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
              <CarouselPrevious className="left-[-50px]" />
              <CarouselNext className="right-[-50px]" />
            </Carousel>
          </div>
        </section>

        {/* Frameworks Section */}
        <section className="py-20 bg-card/20">
          <div className="container">
            <h2 className="text-center text-2xl font-bold mb-8">
              Integrating with Industry Standards
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
              {frameworkLogos.map((fw) => (
                <div key={fw.name} className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
                  {fw.logo}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
