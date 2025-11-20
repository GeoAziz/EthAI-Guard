import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Target, Lightbulb, Award, Globe } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">About EthixAI</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We're on a mission to make AI systems fair, transparent, and accountable for financial institutions worldwide.
          </p>
        </div>

        {/* Mission Statement */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start gap-4">
              <Target className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-3">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  EthixAI was founded with a singular purpose: to eliminate bias and ensure fairness in AI-driven 
                  financial decisions. We believe that everyone deserves equal access to financial opportunities, 
                  and AI systems should empower—not hinder—this goal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Our Core Values</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Trust & Transparency</h3>
                    <p className="text-sm text-muted-foreground">
                      We make AI decisions explainable and auditable, building trust through transparency.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Users className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Fairness First</h3>
                    <p className="text-sm text-muted-foreground">
                      Every individual deserves fair treatment. We detect and eliminate bias at every stage.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Innovation</h3>
                    <p className="text-sm text-muted-foreground">
                      We leverage cutting-edge research in fairness metrics and explainable AI to stay ahead.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Globe className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Global Compliance</h3>
                    <p className="text-sm text-muted-foreground">
                      Built-in support for GDPR, ECOA, SR 11-7, and emerging AI regulations worldwide.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Story */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Our Story</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              EthixAI was born from a simple observation: as AI became more prevalent in financial services, 
              the need for fairness and explainability grew exponentially. Traditional bias detection methods 
              were insufficient for modern machine learning systems.
            </p>
            <p>
              Our founding team—comprising AI researchers, financial industry veterans, and ethics experts—came 
              together to build a solution that addresses the unique challenges of AI governance in finance. 
              We spent years researching fairness metrics, developing SHAP-based explanations, and working with 
              regulatory bodies to ensure compliance.
            </p>
            <p>
              Today, EthixAI serves financial institutions worldwide, helping them deploy AI responsibly while 
              maintaining regulatory compliance and building customer trust.
            </p>
          </div>
        </div>

        {/* Recognition */}
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start gap-4">
              <Award className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-4">Recognition & Impact</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Partnered with 50+ financial institutions across 15 countries</li>
                  <li>• Analyzed over 10 million loan applications for fairness</li>
                  <li>• Reduced bias-related incidents by 85% on average</li>
                  <li>• Recognized by financial regulators as a best-in-class solution</li>
                  <li>• Published 15+ research papers on AI fairness and explainability</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="mt-12 text-center bg-muted/50 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-3">Want to Learn More?</h2>
          <p className="text-muted-foreground mb-6">
            Get in touch with our team to see how EthixAI can help your organization.
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href="mailto:hello@ethixai.com" 
              className="text-primary hover:underline font-semibold"
            >
              hello@ethixai.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
