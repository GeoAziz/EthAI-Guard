'use client';

import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ShareJobButtonProps {
  jobId: string;
  jobTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function ShareJobButton({
  jobId,
  jobTitle,
  variant = 'outline',
  size = 'default',
}: ShareJobButtonProps) {
  const [copied, setCopied] = useState(false);

  const jobUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/careers/${jobId}`
    : `https://ethixai.com/careers/${jobId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      toast({
        title: 'Link copied',
        description: 'Job URL copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  const handleShareToLinkedIn = () => {
    const text = `Check out this opportunity at EthixAI: ${jobTitle}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleShareToTwitter = () => {
    const text = `🚀 Exciting opportunity at EthixAI: ${jobTitle}\n\nJoin us in building fair & transparent AI 🤖\n\n${jobUrl}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareToEmail = () => {
    const subject = `Check out this job at EthixAI: ${jobTitle}`;
    const body = `I thought you might be interested in this role at EthixAI:\n\n${jobTitle}\n\n${jobUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          {copied ? 'Copied!' : 'Copy Link'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareToLinkedIn}>
          <span className="mr-2 text-lg">in</span>
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareToTwitter}>
          <span className="mr-2 text-lg">𝕏</span>
          Share on Twitter
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareToEmail}>
          <span className="mr-2">✉️</span>
          Share via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
