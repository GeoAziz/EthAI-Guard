'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Users,
  Target,
  Lightbulb,
  Award,
  Globe,
  ChevronRight,
  MessageSquare,
  ChevronLeft,
  Mail,
  ExternalLink,
  Plus,
  Minus,
  Check,
} from 'lucide-react';

// Team member data
const TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Founder & CEO',
    bio: 'AI researcher with 12 years at leading tech companies. PhD in Machine Learning.',
    expertise: ['AI Fairness', 'Model Governance', 'Team Leadership'],
    social: { linkedin: '#', twitter: '#' },
  },
  {
    id: 2,
    name: 'Marcus Johnson',
    role: 'VP Research',
    bio: 'Published 40+ papers on explainable AI. Former professor at Stanford.',
    expertise: ['XAI', 'Fairness Metrics', 'Research Strategy'],
    social: { linkedin: '#', twitter: '#' },
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    role: 'VP Compliance',
    bio: 'Financial regulatory expert. 15 years in banking compliance.',
    expertise: ['Regulatory Compliance', 'GDPR', 'SR 11-7'],
    social: { linkedin: '#', twitter: '#' },
  },
  {
    id: 4,
    name: 'David Park',
    role: 'VP Engineering',
    bio: 'Built systems at scale. Previously at financial tech unicorn.',
    expertise: ['Scalable Systems', 'Cloud Architecture', 'DevOps'],
    social: { linkedin: '#', twitter: '#' },
  },
];

// Testimonials
const TESTIMONIALS = [
  {
    id: 1,
    quote: 'EthixAI helped us identify and eliminate bias in our lending model. Recommended by regulators.',
    author: 'Jennifer Lee',
    company: 'Global Finance Corp',
    image: '👩‍💼',
  },
  {
    id: 2,
    quote: 'The transparency we gained was invaluable. Our customers trust us more now.',
    author: 'Robert Chen',
    company: 'Credit Innovation Bank',
    image: '👨‍💼',
  },
  {
    id: 3,
    quote: 'Reduced our audit time by 60%. The compliance dashboard is a game-changer.',
    author: 'Maria Santos',
    company: 'RegTech Solutions',
    image: '👩‍💼',
  },
];

// Timeline milestones
const MILESTONES = [
  { year: '2023', event: 'Company founded with mission to democratize AI fairness' },
  { year: '2023', event: 'Released open-source fairness metrics library' },
  { year: '2024', event: 'Reached 500K GitHub stars on core repository' },
  { year: '2024', event: 'Partnered with 50+ financial institutions' },
  { year: '2025', event: 'Became industry standard for AI governance in finance' },
  { year: '2026', event: 'Enterprise platform serving $5T+ in assets' },
];

// Animated counter component
function AnimatedCounter({
  value,
  suffix = '',
  duration = 2000,
}: {
  value: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {return;}

    let start = 0;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value, duration]);

  return (
    <div ref={ref} className="text-4xl font-bold text-primary">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

// Expandable team member card
function TeamMemberCard({ member }: { member: (typeof TEAM_MEMBERS)[0] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-lg animate-fade-in"
      role="article"
      aria-label={`${member.name}, ${member.role}`}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg text-foreground">{member.name}</h3>
            <p className="text-sm text-primary font-medium">{member.role}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${member.name}'s details`}
          >
            {expanded ? (
              <Minus className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        </div>

        {expanded && (
          <div className="space-y-4 mt-4 border-t pt-4 animate-fade-in">
            <p className="text-sm text-muted-foreground">{member.bio}</p>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                EXPERTISE
              </p>
              <div className="flex flex-wrap gap-2">
                {member.expertise.map((exp) => (
                  <span
                    key={exp}
                    className="px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary"
                  >
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Testimonial carousel
function TestimonialCarousel() {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) {return;}
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    setAutoPlay(false);
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    setAutoPlay(false);
  };

  return (
    <div
      className="relative"
      role="region"
      aria-label="Client testimonials"
      aria-live="polite"
    >
      <div className="overflow-hidden rounded-lg">
        <Card className="border-0">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-4">
              <div className="text-4xl mb-4">{TESTIMONIALS[current].image}</div>
              <blockquote className="text-lg italic text-foreground mb-4">
                "{TESTIMONIALS[current].quote}"
              </blockquote>
              <div>
                <p className="font-semibold text-foreground">
                  {TESTIMONIALS[current].author}
                </p>
                <p className="text-sm text-muted-foreground">
                  {TESTIMONIALS[current].company}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={prev}
          className="p-2 rounded-lg border hover:bg-muted transition-colors"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Indicators */}
        <div className="flex gap-2 items-center">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === current ? 'bg-primary w-6' : 'bg-muted w-2'
              }`}
              aria-label={`Go to testimonial ${idx + 1}`}
              aria-current={idx === current}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-2 rounded-lg border hover:bg-muted transition-colors"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Main component
export default function AboutPage() {
  const [formState, setFormState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [showContactForm, setShowContactForm] = useState(false);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('loading');
    try {
      // Simulated contact submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setFormState('success');
      setTimeout(() => {
        setShowContactForm(false);
        setFormState('idle');
      }, 2000);
    } catch {
      setFormState('error');
    }
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'EthixAI',
          url: 'https://ethixai.com',
          logo: 'https://ethixai.com/logo.png',
          description: 'Open-source Ethical AI Governance Platform for financial institutions',
          foundingDate: '2023',
          sameAs: [
            'https://github.com/ethixai/ethixai',
            'https://twitter.com/ethixai',
            'https://linkedin.com/company/ethixai',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer service',
            email: 'hello@ethixai.com',
          },
          areaServed: 'Worldwide',
          knowsAbout: [
            'AI Fairness',
            'Explainable AI',
            'Bias Detection',
            'Model Governance',
            'Regulatory Compliance',
          ],
        })}
      </script>

      <div className="container px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Hero Section */}
          <section className="text-center animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
              About EthixAI
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              We're on a mission to make AI systems fair, transparent, and accountable for
              financial institutions worldwide.
            </p>
          </section>

          {/* Mission Statement */}
          <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10 border-primary/20 animate-fade-in">
            <CardContent className="pt-8 pb-8">
              <div className="flex items-start gap-4">
                <Target className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    EthixAI was founded with a singular purpose: to eliminate bias and ensure
                    fairness in AI-driven financial decisions. We believe that everyone deserves
                    equal access to financial opportunities, and AI systems should empower—not
                    hinder—this goal.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Values */}
          <section aria-labelledby="values-heading">
            <h2 id="values-heading" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Our Core Values
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="animate-fade-in transition-all hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Trust & Transparency</h3>
                      <p className="text-sm text-muted-foreground">
                        We make AI decisions explainable and auditable, building trust through
                        transparency.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in transition-all hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Users className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Fairness First</h3>
                      <p className="text-sm text-muted-foreground">
                        Every individual deserves fair treatment. We detect and eliminate bias
                        at every stage.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in transition-all hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Innovation</h3>
                      <p className="text-sm text-muted-foreground">
                        We leverage cutting-edge research in fairness metrics and explainable AI
                        to stay ahead.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-in transition-all hover:shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Globe className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Global Compliance</h3>
                      <p className="text-sm text-muted-foreground">
                        Built-in support for GDPR, ECOA, SR 11-7, and emerging AI regulations
                        worldwide.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Impact Metrics */}
          <section aria-labelledby="impact-heading" className="py-8">
            <h2 id="impact-heading" className="text-2xl md:text-3xl font-bold mb-12 text-center">
              Our Impact
            </h2>
            <div className="grid gap-8 md:grid-cols-4">
              <div className="text-center animate-fade-in">
                <AnimatedCounter value={50} suffix="+" />
                <p className="text-muted-foreground mt-2">Financial Institutions</p>
              </div>
              <div className="text-center animate-fade-in">
                <AnimatedCounter value={10} suffix="M+" />
                <p className="text-muted-foreground mt-2">Loan Applications Analyzed</p>
              </div>
              <div className="text-center animate-fade-in">
                <AnimatedCounter value={85} suffix="%" />
                <p className="text-muted-foreground mt-2">Average Bias Reduction</p>
              </div>
              <div className="text-center animate-fade-in">
                <AnimatedCounter value={15} suffix="+" />
                <p className="text-muted-foreground mt-2">Research Papers Published</p>
              </div>
            </div>
          </section>

          {/* Story */}
          <section aria-labelledby="story-heading">
            <h2 id="story-heading" className="text-2xl md:text-3xl font-bold mb-6">
              Our Story
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed animate-fade-in">
              <p>
                EthixAI was born from a simple observation: as AI became more prevalent in
                financial services, the need for fairness and explainability grew exponentially.
                Traditional bias detection methods were insufficient for modern machine learning
                systems.
              </p>
              <p>
                Our founding team—comprising AI researchers, financial industry veterans, and
                ethics experts—came together to build a solution that addresses the unique
                challenges of AI governance in finance. We spent years researching fairness
                metrics, developing SHAP-based explanations, and working with regulatory bodies
                to ensure compliance.
              </p>
              <p>
                Today, EthixAI serves financial institutions worldwide, helping them deploy AI
                responsibly while maintaining regulatory compliance and building customer trust.
              </p>
            </div>
          </section>

          {/* Timeline */}
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Our Journey
            </h2>
            <div className="space-y-4">
              {MILESTONES.map((milestone, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 animate-fade-in"
                  role="listitem"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center flex-shrink-0">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                    {idx < MILESTONES.length - 1 && (
                      <div className="w-0.5 h-12 bg-primary/20 my-2" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 pt-2 pb-4">
                    <h3 className="font-semibold text-primary">{milestone.year}</h3>
                    <p className="text-muted-foreground">{milestone.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Team Section */}
          <section aria-labelledby="team-heading">
            <h2 id="team-heading" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              Meet Our Team
            </h2>
            <div className="grid gap-6 md:grid-cols-2" role="list">
              {TEAM_MEMBERS.map((member) => (
                <div key={member.id} role="listitem">
                  <TeamMemberCard member={member} />
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials */}
          <section aria-labelledby="testimonials-heading">
            <h2 id="testimonials-heading" className="text-2xl md:text-3xl font-bold mb-8 text-center">
              What Our Clients Say
            </h2>
            <TestimonialCarousel />
          </section>

          {/* Recognition */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 animate-fade-in">
            <CardContent className="pt-8 pb-8">
              <div className="flex items-start gap-4">
                <Award className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-4">Recognition & Achievements</h2>
                  <ul className="space-y-3 text-muted-foreground" role="list">
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Partnered with 50+ financial institutions across 15 countries</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Analyzed over 10 million loan applications for fairness</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Reduced bias-related incidents by 85% on average</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Recognized by financial regulators as a best-in-class solution</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>Published 15+ research papers on AI fairness and explainability</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA Section */}
          <section
            className="text-center bg-gradient-to-br from-primary/10 to-transparent p-8 rounded-lg border border-primary/20 animate-fade-in"
            aria-labelledby="cta-heading"
          >
            <h2 id="cta-heading" className="text-3xl font-bold mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join the growing number of financial institutions using EthixAI to build
              fair, transparent, and compliant AI systems.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                onClick={() => setShowContactForm(true)}
                className="gap-2"
                size="lg"
              >
                <Mail className="w-4 h-4" />
                Contact Us
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/docs', '_blank')}
                className="gap-2"
                size="lg"
              >
                <ExternalLink className="w-4 h-4" />
                View Documentation
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('/demo', '_blank')}
                className="gap-2"
                size="lg"
              >
                <ChevronRight className="w-4 h-4" />
                Try Demo
              </Button>
            </div>
          </section>

          {/* Contact Form Modal */}
          {showContactForm && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in"
              role="dialog"
              aria-labelledby="contact-modal-title"
              aria-modal="true"
            >
              <Card className="w-full max-w-md animate-fade-in">
                <CardContent className="pt-6">
                  <h3 id="contact-modal-title" className="text-xl font-bold mb-4">
                    Get in Touch
                  </h3>
                  <form onSubmit={handleContact} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        className="w-full px-3 py-2 border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="w-full px-3 py-2 border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block" htmlFor="message">
                        Message
                      </label>
                      <textarea
                        id="message"
                        className="w-full px-3 py-2 border rounded-lg bg-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-24"
                        required
                      />
                    </div>

                    {formState === 'success' && (
                      <div
                        className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-sm text-green-300"
                        role="alert"
                      >
                        Thanks for reaching out! We'll be in touch soon.
                      </div>
                    )}

                    {formState === 'error' && (
                      <div
                        className="p-3 bg-red-900/20 border border-red-700/30 rounded-lg text-sm text-red-300"
                        role="alert"
                      >
                        Something went wrong. Please try again.
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={formState === 'loading'}
                        className="flex-1"
                      >
                        {formState === 'loading' ? 'Sending...' : 'Send'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowContactForm(false)}
                        disabled={formState === 'loading'}
                      >
                        Close
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* CSS Animations */}
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
              animation: fade-in-up 0.5s ease-out forwards;
            }
          `}
          </style>
        </div>
      </div>

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        About EthixAI: Our mission, values, team, impact metrics, and contact information.
      </div>
    </>
  );
}
