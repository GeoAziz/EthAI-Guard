import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BlogPage() {
  const posts = [
    {
      id: 1,
      title: "Understanding Disparate Impact in Lending AI",
      excerpt: "Learn how to measure and mitigate disparate impact in AI-powered lending decisions using statistical parity and equalized odds.",
      author: "Dr. Sarah Chen",
      date: "Nov 15, 2025",
      category: "Fairness",
      readTime: "8 min read"
    },
    {
      id: 2,
      title: "SHAP Values Explained: Making AI Decisions Transparent",
      excerpt: "A deep dive into SHAP (SHapley Additive exPlanations) and how it helps explain complex machine learning models in financial services.",
      author: "Marcus Rodriguez",
      date: "Nov 10, 2025",
      category: "Explainability",
      readTime: "12 min read"
    },
    {
      id: 3,
      title: "GDPR Compliance for AI Systems in Finance",
      excerpt: "Navigate GDPR requirements for AI-driven decision-making in financial institutions with practical implementation strategies.",
      author: "Emma Thompson",
      date: "Nov 5, 2025",
      category: "Compliance",
      readTime: "10 min read"
    },
    {
      id: 4,
      title: "Detecting Proxy Discrimination in Credit Models",
      excerpt: "How seemingly neutral features can act as proxies for protected attributes and how to detect them using correlation analysis.",
      author: "James Liu",
      date: "Oct 28, 2025",
      category: "Bias Detection",
      readTime: "7 min read"
    },
    {
      id: 5,
      title: "The ROI of Fair Lending: Business Case for Ethics",
      excerpt: "Beyond compliance: how fair AI practices drive customer trust, reduce risk, and improve long-term profitability.",
      author: "Patricia Davis",
      date: "Oct 20, 2025",
      category: "Business",
      readTime: "6 min read"
    },
    {
      id: 6,
      title: "Model Monitoring: Catching Drift Before It Causes Harm",
      excerpt: "Best practices for continuous monitoring of AI models to detect concept drift, data drift, and fairness degradation.",
      author: "Dr. Sarah Chen",
      date: "Oct 12, 2025",
      category: "MLOps",
      readTime: "9 min read"
    }
  ];

  const categories = ["All", "Fairness", "Explainability", "Compliance", "Bias Detection", "Business", "MLOps"];

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

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <Badge 
              key={category} 
              variant={category === "All" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Featured Post */}
        <Card className="mb-12 bg-gradient-to-br from-primary/10 via-transparent to-blue-700/10">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge>Featured</Badge>
              <Badge variant="outline">{posts[0].category}</Badge>
            </div>
            <CardTitle className="text-2xl md:text-3xl">{posts[0].title}</CardTitle>
            <CardDescription className="text-base">{posts[0].excerpt}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {posts[0].author}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {posts[0].date}
              </div>
              <div>{posts[0].readTime}</div>
            </div>
            <Link 
              href={`/blog/${posts[0].id}`}
              className="inline-flex items-center gap-2 mt-4 text-primary hover:underline font-semibold"
            >
              Read More <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        {/* Blog Posts Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.slice(1).map((post) => (
            <Card key={post.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader>
                <Badge variant="outline" className="w-fit mb-2">{post.category}</Badge>
                <CardTitle className="text-xl">{post.title}</CardTitle>
                <CardDescription>{post.excerpt}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-end">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {post.author}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{post.readTime}</div>
                  <Link 
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
                  >
                    Read Article <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter CTA */}
        <Card className="mt-12">
          <CardContent className="pt-8 pb-8 text-center">
            <h2 className="text-2xl font-bold mb-3">Stay Updated</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Subscribe to our newsletter for the latest insights on AI fairness, regulatory updates, and product announcements.
            </p>
            <div className="flex gap-2 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 px-4 py-2 rounded-md border bg-background"
              />
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold">
                Subscribe
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
