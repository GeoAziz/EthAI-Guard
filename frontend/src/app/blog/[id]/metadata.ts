import type { Metadata } from 'next';
import { getPostById } from '../constants';
import { generateOgImageUrl } from '../utils';
import { notFound } from 'next/navigation';

interface BlogPostPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const postId = parseInt(params.id, 10);
  const post = getPostById(postId);

  if (!post) {
    notFound();
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

// Generate static params for all blog posts
export function generateStaticParams() {
  // Import here to avoid circular dependencies
  const { BLOG_POSTS } = require('../constants');
  return BLOG_POSTS.map((post: any) => ({
    id: post.id.toString(),
  }));
}
