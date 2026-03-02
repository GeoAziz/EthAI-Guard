/**
 * Blog posts data and constants
 */

export interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  content?: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  featured?: boolean;
  relatedPostIds?: number[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    title: 'Understanding Disparate Impact in Lending AI',
    excerpt: 'Learn how to measure and mitigate disparate impact in AI-powered lending decisions using statistical parity and equalized odds.',
    author: 'Dr. Sarah Chen',
    date: 'Nov 15, 2025',
    category: 'Fairness',
    readTime: '8 min read',
    featured: true,
    relatedPostIds: [2, 4, 6],
  },
  {
    id: 2,
    title: 'SHAP Values Explained: Making AI Decisions Transparent',
    excerpt: 'A deep dive into SHAP (SHapley Additive exPlanations) and how it helps explain complex machine learning models in financial services.',
    author: 'Marcus Rodriguez',
    date: 'Nov 10, 2025',
    category: 'Explainability',
    readTime: '12 min read',
    relatedPostIds: [1, 3, 5],
  },
  {
    id: 3,
    title: 'GDPR Compliance for AI Systems in Finance',
    excerpt: 'Navigate GDPR requirements for AI-driven decision-making in financial institutions with practical implementation strategies.',
    author: 'Emma Thompson',
    date: 'Nov 5, 2025',
    category: 'Compliance',
    readTime: '10 min read',
    relatedPostIds: [1, 4, 6],
  },
  {
    id: 4,
    title: 'Detecting Proxy Discrimination in Credit Models',
    excerpt: 'How seemingly neutral features can act as proxies for protected attributes and how to detect them using correlation analysis.',
    author: 'James Liu',
    date: 'Oct 28, 2025',
    category: 'Bias Detection',
    readTime: '7 min read',
    relatedPostIds: [1, 2, 5],
  },
  {
    id: 5,
    title: 'The ROI of Fair Lending: Business Case for Ethics',
    excerpt: 'Beyond compliance: how fair AI practices drive customer trust, reduce risk, and improve long-term profitability.',
    author: 'Patricia Davis',
    date: 'Oct 20, 2025',
    category: 'Business',
    readTime: '6 min read',
    relatedPostIds: [1, 3, 6],
  },
  {
    id: 6,
    title: 'Model Monitoring: Catching Drift Before It Causes Harm',
    excerpt: 'Best practices for continuous monitoring of AI models to detect concept drift, data drift, and fairness degradation.',
    author: 'Dr. Sarah Chen',
    date: 'Oct 12, 2025',
    category: 'MLOps',
    readTime: '9 min read',
    relatedPostIds: [1, 2, 4],
  },
];

export const ALL_CATEGORIES = ['All', 'Fairness', 'Explainability', 'Compliance', 'Bias Detection', 'Business', 'MLOps'] as const;

export type BlogCategory = typeof ALL_CATEGORIES[number];

/**
 * Find a blog post by ID
 */
export function getPostById(id: number): BlogPost | undefined {
  return BLOG_POSTS.find(post => post.id === id);
}

/**
 * Get related posts for a given post
 */
export function getRelatedPosts(postId: number, limit = 3): BlogPost[] {
  const post = getPostById(postId);
  if (!post || !post.relatedPostIds) {return [];}

  return post.relatedPostIds
    .slice(0, limit)
    .map(id => getPostById(id))
    .filter((post): post is BlogPost => post !== undefined);
}

/**
 * Get previous and next posts for navigation
 */
export function getAdjacentPosts(postId: number): { prev: BlogPost | null; next: BlogPost | null } {
  const currentIndex = BLOG_POSTS.findIndex(p => p.id === postId);

  return {
    prev: currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null,
    next: currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null,
  };
}

/**
 * Filter posts by category
 */
export function filterPostsByCategory(category: BlogCategory): BlogPost[] {
  if (category === 'All') {return BLOG_POSTS;}
  return BLOG_POSTS.filter(post => post.category === category);
}
