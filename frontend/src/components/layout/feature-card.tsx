import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  items?: (string | React.ReactNode)[];
  centered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FeatureCard({
  icon,
  title,
  description,
  items,
  centered = true,
  className,
  children,
}: FeatureCardProps) {
  return (
    <Card className={cn('text-center bg-card shadow-md hover:shadow-xl hover:shadow-primary/10 transition-all group', centered ? 'text-center' : 'text-left', className)}>
      {icon && (
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <CardTitle className="mt-4">{title}</CardTitle>
        </CardHeader>
      )}
      {!icon && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={centered ? 'text-center' : 'text-left'}>
        <p className="text-muted-foreground mb-4">{description}</p>
        {items && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="text-primary flex-shrink-0">✓</span>
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
