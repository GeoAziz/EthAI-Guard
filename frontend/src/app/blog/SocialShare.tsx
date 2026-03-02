'use client';

import { Share2, Twitter, Linkedin, Mail } from 'lucide-react';
import { generateShareUrls } from './utils';
import { Button } from '@/components/ui/button';

interface SocialShareProps {
  url: string;
  title: string;
  author: string;
  variant?: 'default' | 'compact' | 'inline';
}

export function SocialShare({
  url,
  title,
  author,
  variant = 'default',
}: SocialShareProps) {
  const shareUrls = generateShareUrls(url, title, author);

  const shareLinks = [
    {
      icon: Twitter,
      label: 'Share on Twitter',
      url: shareUrls.twitter,
      color: 'hover:text-blue-400',
    },
    {
      icon: Linkedin,
      label: 'Share on LinkedIn',
      url: shareUrls.linkedin,
      color: 'hover:text-blue-600',
    },
    {
      icon: Mail,
      label: 'Share via Email',
      url: shareUrls.email,
      color: 'hover:text-green-600',
    },
  ];

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Share:</span>
        <div className="flex gap-2">
          {shareLinks.map(({ icon: Icon, label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="p-2 rounded-md hover:bg-secondary transition-colors"
              title={label}
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 py-4 border-t border-b">
        <Share2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Share this post:</span>
        <div className="flex gap-2 ml-auto">
          {shareLinks.map(({ icon: Icon, label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="p-2 rounded-md hover:bg-secondary transition-colors"
            >
              <Icon className="h-4 w-4" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Share this article</h3>
      <div className="grid grid-cols-3 gap-2">
        {shareLinks.map(({ icon: Icon, label, url }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-secondary hover:bg-accent transition-colors text-sm font-medium"
            title={label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label.split(' ')[2]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
