/**
 * Blog utilities for social sharing, validation, and other helpers
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate social share URLs
 */
export interface ShareUrls {
  twitter: string;
  linkedin: string;
  email: string;
  facebook: string;
}

export function generateShareUrls(
  url: string,
  title: string,
  author: string,
): ShareUrls {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedMessage = encodeURIComponent(`${title} by ${author}`);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=EthixAI`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedMessage}%0A%0A${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate reading time from word count
 * Assumes average reading speed of 200 words per minute
 */
export function calculateReadingTime(content: string): string {
  const wordCount = content.split(/\s+/).length;
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return `${readingTimeMinutes} min read`;
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {return text;}
  return `${text.substring(0, maxLength).trimEnd()}...`;
}

/**
 * Generate Open Graph image URL (can be customized later)
 */
export function generateOgImageUrl(title: string, category: string): string {
  return `https://ethixai.com/api/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`;
}
