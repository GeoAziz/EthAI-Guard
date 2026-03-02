'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: 'json' | 'bash' | 'javascript' | 'typescript';
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = 'json',
  className,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div className={cn('relative bg-muted/50 rounded-lg overflow-hidden', className)}>
      {/* Header with language badge and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-muted-foreground/10">
        <span className="text-xs font-semibold uppercase text-muted-foreground">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-muted-foreground/10 rounded transition-colors"
          title="Copy to clipboard"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Code content */}
      <pre className="overflow-x-auto p-4">
        <code className={cn('text-xs font-mono text-foreground/90', `language-${language}`)}>
          {showLineNumbers ? (
            <div className="flex gap-4">
              <div className="text-muted-foreground select-none">
                {lines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <div>{code}</div>
            </div>
          ) : (
            code
          )}
        </code>
      </pre>
    </div>
  );
}
