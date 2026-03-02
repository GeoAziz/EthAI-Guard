import React from 'react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  gradient?: string;
  children?: React.ReactNode;
  centered?: boolean;
  className?: string;
}

export function HeroSection({
  title,
  subtitle,
  gradient = 'from-primary to-purple-600',
  children,
  centered = true,
  className,
}: HeroSectionProps) {
  return (
    <section className={cn('relative py-12 md:py-20 lg:py-32 overflow-hidden', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 grid grid-cols-2 -space-x-52 opacity-20"
      >
        <div className={`blur-[106px] h-56 bg-gradient-to-br ${gradient} dark:from-blue-700`} />
        <div className="blur-[106px] h-32 bg-gradient-to-r from-cyan-400 to-sky-300 dark:to-indigo-600" />
      </div>
      <div className={`container relative z-10 ${centered ? 'text-center' : ''} px-4`}>
        {typeof title === 'string' ? (
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 md:mb-6 animate-fade-in-up px-4">
            {title.includes('<span>') ? (
              <div dangerouslySetInnerHTML={{ __html: title }} />
            ) : (
              title
            )}
          </h1>
        ) : (
          <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4 md:mb-6 animate-fade-in-up px-4">
            {title}
          </div>
        )}

        {subtitle && (
          typeof subtitle === 'string' ? (
            <p className="max-w-3xl mx-auto text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 px-4">
              {subtitle}
            </p>
          ) : (
            <div className="max-w-3xl mx-auto text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 px-4">
              {subtitle}
            </div>
          )
        )}

        {children}
      </div>
    </section>
  );
}
