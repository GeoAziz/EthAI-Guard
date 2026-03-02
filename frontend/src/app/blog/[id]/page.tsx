import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostById, getRelatedPosts, getAdjacentPosts, BLOG_POSTS } from '../constants';
import { SocialShare } from '../SocialShare';
import { generateOgImageUrl } from '../utils';

interface BlogPostPageProps {
  params: {
    id: string;
  };
}

/**
 * Generate metadata for each blog post dynamically
 */
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const postId = parseInt(params.id, 10);
  const post = getPostById(postId);

  if (!post) {
    return {
      title: 'Post not found',
    };
  }

  const url = `https://ethixai.com/blog/${postId}`;
  const ogImage = generateOgImageUrl(post.title, post.category);

  return {
    title: `${post.title} | EthixAI Blog`,
    description: post.excerpt,
    authors: [{ name: post.author }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.date,
      authors: [post.author],
      tags: [post.category],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage],
      creator: '@EthixAI',
    },
  };
}

/**
 * Generate static parameters for all blog posts (for static generation)
 */
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    id: post.id.toString(),
  }));
}

/**
 * Individual blog post page with full content, related posts, and navigation
 */
export default function BlogPostPage({ params }: BlogPostPageProps) {
  const postId = parseInt(params.id, 10);
  const post = getPostById(postId);

  if (!post) {
    notFound();
  }

  const relatedPosts = getRelatedPosts(postId, 3);
  const { prev, next } = getAdjacentPosts(postId);
  const currentUrl = `https://ethixai.com/blog/${postId}`;

  // Sample full content - in production, this would come from a CMS
  const fullContent = `
${post.excerpt}

## Introduction

This comprehensive guide explores the key aspects of ${post.title.toLowerCase()}. Whether you're a data scientist, compliance officer, or financial services professional, understanding these concepts is crucial for building ethical and fair AI systems.

## Key Concepts

### Understanding the Problem

${post.category === 'Fairness' ? 'Fairness in lending is not just about compliance - it\'s about ensuring that AI-powered lending decisions don\'t perpetuate historical biases or create new forms of discrimination. Disparate impact occurs when a neutral policy or practice has a disproportionately negative effect on members of a protected class.' : ''}

${post.category === 'Explainability' ? 'Explainability transforms AI from a "black box" into a transparent tool that stakeholders can understand, trust, and audit. SHAP (SHapley Additive exPlanations) provides a game-theoretic approach to feature importance that is theoretically sound and practically useful.' : ''}

${post.category === 'Compliance' ? 'GDPR and other regulations require organizations to be able to explain algorithmic decisions that affect individuals. This goes beyond technical explainability - it requires organizational processes, documentation, and audit trails.' : ''}

${post.category === 'Bias Detection' ? 'Proxy variables are features that aren\'t themselves protected attributes but are highly correlated with them. For example, zip code might proxy for race. Detecting these proxies is essential for building truly fair models.' : ''}

${post.category === 'Business' ? 'The business case for ethics isn\'t just moral - it\'s financial. Fair lending practices reduce legal risk, increase customer trust, and lead to better long-term business outcomes.' : ''}

${post.category === 'MLOps' ? 'Model performance degrades over time due to data drift, concept drift, and other factors. Continuous monitoring combined with automated retraining ensures models remain fair and accurate.' : ''}

### Practical Implementation

When implementing solutions in this area, consider:

1. **Data Quality**: Ensure your training data is representative and free from historical biases
2. **Metric Selection**: Choose fairness metrics that align with your business objectives and regulatory requirements
3. **Stakeholder Engagement**: Involve domain experts, ethicists, and affected communities
4. **Continuous Monitoring**: Implement observability to detect degradation over time
5. **Documentation**: Maintain clear records of decisions, changes, and rationale

## Advanced Techniques

Modern approaches leverage advanced statistical methods and machine learning techniques to address these challenges. Implementation requires careful attention to detail and close collaboration between technical and non-technical stakeholders.

### Framework and Tools

Organizations typically use:
- SHAP and LIME for model explainability
- Fairness libraries (AI Fairness 360, Fairlearn, etc.)
- Custom monitoring and alerting systems
- Audit logging and compliance documentation systems

### Case Studies

Real-world organizations have successfully implemented these practices, seeing:
- Reduced regulatory risk
- Improved model performance
- Enhanced stakeholder trust
- Better employee satisfaction

## Best Practices

Based on industry experience, here are key best practices:

1. **Start Early**: Build fairness considerations into your model design, not as an afterthought
2. **Measure and Monitor**: What gets measured gets managed
3. **Iterate**: Fairness is a journey, not a destination
4. **Communicate**: Help stakeholders understand the trade-offs and decisions
5. **Automate**: Where possible, automate checks and monitoring to catch issues early

## Conclusion

Building ethical, fair, and explainable AI systems is both a technical and organizational challenge. By combining advanced techniques, governance processes, and stakeholder engagement, financial institutions can build AI systems that are powerful, fair, and trustworthy.

The future of AI in finance depends on the industry's commitment to these principles. Organizations that lead in this space will build stronger customer relationships and long-term competitive advantages.

## Further Reading

- ${post.category === 'Fairness' ? 'Binns, R. (2018). Fairness in Machine Learning.' : 'Mitchell, T. M. (1997). Machine Learning.'}
- Research papers on algorithmic fairness and explainability
- OECD guidance on trustworthy AI
- Regulatory guidance from financial regulators on AI governance

---

**Author**: ${post.author}
**Published**: ${post.date}
**Category**: ${post.category}
**Reading time**: ${post.readTime}
`;

  return (
    <div className="container px-4 py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-sm" aria-label="Breadcrumb">
          <Link
            href="/blog"
            className="flex items-center gap-1 text-primary hover:underline"
            aria-label="Back to blog"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Blog
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground truncate">{post.title}</span>
        </nav>

        {/* Post Header */}
        <article>
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-primary text-primary-foreground">{post.category}</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">{post.title}</h1>
            <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b pb-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <time dateTime={post.date}>{post.date}</time>
              </div>
              <div>{post.readTime}</div>
            </div>
          </header>

          {/* Social Share - Inline */}
          <div className="my-6">
            <SocialShare url={currentUrl} title={post.title} author={post.author} variant="inline" />
          </div>

          {/* Main Content */}
          <div className="prose dark:prose-invert max-w-none mb-12">
            {fullContent.split('\n').map((line, idx) => {
              if (line.startsWith('##')) {
                const heading = line.replace('## ', '');
                return (
                  <h2 key={idx} className="text-2xl font-bold mt-8 mb-4">
                    {heading}
                  </h2>
                );
              }
              if (line.startsWith('###')) {
                const heading = line.replace('### ', '');
                return (
                  <h3 key={idx} className="text-xl font-semibold mt-6 mb-3">
                    {heading}
                  </h3>
                );
              }
              if (line.startsWith('-')) {
                return (
                  <li key={idx} className="ml-6">
                    {line.replace('- ', '')}
                  </li>
                );
              }
              if (line.startsWith('1.') || line.match(/^\d+\./)) {
                return (
                  <li key={idx} className="ml-6">
                    {line.replace(/^\d+\.\s/, '')}
                  </li>
                );
              }
              if (line.trim() === '') {
                return <div key={idx} className="my-4" />;
              }
              if (line === '---') {
                return <hr key={idx} className="my-8" />;
              }
              if (line.startsWith('**')) {
                return (
                  <p key={idx} className="font-semibold text-sm text-muted-foreground">
                    {line}
                  </p>
                );
              }
              return (
                <p key={idx} className="mb-4 leading-relaxed">
                  {line}
                </p>
              );
            })}
          </div>

          {/* Social Share - Bottom */}
          <div className="my-12 p-6 bg-secondary rounded-lg">
            <SocialShare url={currentUrl} title={post.title} author={post.author} variant="compact" />
          </div>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="my-12" aria-labelledby="related-posts-heading">
            <h2 id="related-posts-heading" className="text-2xl font-bold mb-6">
              Related Articles
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((relatedPost) => (
                <Card
                  key={relatedPost.id}
                  className="flex flex-col hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <Badge variant="outline" className="w-fit mb-2">
                      {relatedPost.category}
                    </Badge>
                    <CardTitle className="text-lg">{relatedPost.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end">
                    <p className="text-sm text-muted-foreground mb-4">{relatedPost.excerpt}</p>
                    <Link
                      href={`/blog/${relatedPost.id}`}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
                    >
                      Read More <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Post Navigation */}
        {(prev || next) && (
          <nav className="grid grid-cols-2 gap-4 mt-12" aria-label="Post navigation">
            {prev ? (
              <Link
                href={`/blog/${prev.id}`}
                className="group flex items-center gap-3 p-4 rounded-lg border hover:bg-secondary transition-colors"
                aria-label={`Previous post: ${prev.title}`}
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Previous</p>
                  <p className="font-semibold line-clamp-2">{prev.title}</p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                href={`/blog/${next.id}`}
                className="group flex items-center justify-end gap-3 p-4 rounded-lg border hover:bg-secondary transition-colors text-right"
                aria-label={`Next post: ${next.title}`}
              >
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Next</p>
                  <p className="font-semibold line-clamp-2">{next.title}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ) : (
              <div />
            )}
          </nav>
        )}

        {/* Back to Blog CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary hover:underline font-semibold"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to all posts
          </Link>
        </div>
      </div>
    </div>
  );
}
