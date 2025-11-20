import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, Users, Heart, Zap, GraduationCap, DollarSign } from "lucide-react";

export default function CareersPage() {
  const openings = [
    {
      title: "Senior ML Engineer - Fairness",
      department: "Engineering",
      location: "Remote / San Francisco",
      type: "Full-time",
      description: "Build and optimize fairness-aware ML pipelines for financial AI systems."
    },
    {
      title: "Applied AI Researcher",
      department: "Research",
      location: "Remote / New York",
      type: "Full-time",
      description: "Conduct research on novel fairness metrics and explainability techniques."
    },
    {
      title: "Product Designer",
      department: "Product",
      location: "Remote",
      type: "Full-time",
      description: "Design intuitive interfaces for complex AI explainability visualizations."
    },
    {
      title: "DevOps Engineer",
      department: "Engineering",
      location: "Remote / London",
      type: "Full-time",
      description: "Scale our infrastructure to handle enterprise-level AI workloads."
    },
    {
      title: "Compliance Specialist",
      department: "Legal",
      location: "Hybrid / Boston",
      type: "Full-time",
      description: "Ensure our platform meets global regulatory requirements for AI in finance."
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "Remote",
      type: "Full-time",
      description: "Help financial institutions maximize value from EthixAI platform."
    }
  ];

  const benefits = [
    {
      icon: DollarSign,
      title: "Competitive Compensation",
      description: "Industry-leading salaries with equity options"
    },
    {
      icon: Heart,
      title: "Health & Wellness",
      description: "Comprehensive health, dental, and vision coverage"
    },
    {
      icon: Clock,
      title: "Flexible Work",
      description: "Remote-first culture with flexible hours"
    },
    {
      icon: GraduationCap,
      title: "Learning & Development",
      description: "$5,000 annual learning budget"
    },
    {
      icon: Users,
      title: "Team Events",
      description: "Regular team offsites and social events"
    },
    {
      icon: Zap,
      title: "Impact",
      description: "Work on technology that makes AI fairer for everyone"
    }
  ];

  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Join Our Mission</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Help us build the future of fair and transparent AI for financial services. 
            We're looking for passionate individuals who want to make a real impact.
          </p>
        </div>

        {/* Why EthixAI */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Why EthixAI?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <benefit.icon className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-8">Open Positions</h2>
          <div className="space-y-4">
            {openings.map((job, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      <CardDescription className="mb-3">{job.description}</CardDescription>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {job.department}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.type}
                        </div>
                      </div>
                    </div>
                    <Button className="flex-shrink-0">Apply Now</Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Culture */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10">
          <CardContent className="pt-8 pb-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl font-bold mb-4">Our Culture</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                At EthixAI, we believe in building an inclusive, collaborative environment where everyone can do their best work. 
                We value curiosity, empathy, and a commitment to making AI systems fairer for everyone. Our team is distributed 
                across the globe, united by a shared mission to eliminate bias in AI-driven financial decisions.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Remote-First</Badge>
                <Badge variant="outline">Diverse Team</Badge>
                <Badge variant="outline">Impact-Driven</Badge>
                <Badge variant="outline">Innovation</Badge>
                <Badge variant="outline">Collaboration</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Opening */}
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Don't See a Perfect Fit?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              We're always interested in meeting talented people who share our mission. 
              Send us your resume and tell us why you'd like to join EthixAI.
            </p>
            <Button variant="outline" size="lg">
              Send General Application
            </Button>
          </CardContent>
        </Card>

        {/* Contact */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about working at EthixAI? Reach out to{" "}
            <a href="mailto:careers@ethixai.com" className="text-primary hover:underline font-semibold">
              careers@ethixai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
