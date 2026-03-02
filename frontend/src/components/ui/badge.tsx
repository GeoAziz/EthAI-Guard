import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Status variants
        completed: 'border-transparent bg-green-100 text-green-700 hover:bg-green-200',
        running: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200',
        failed: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200',
        pending: 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
        // Active status variants
        active: 'border-transparent bg-green-100 text-green-700 hover:bg-green-200',
        inactive: 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
        // Severity variants
        high: 'border-transparent bg-red-100 text-red-700 hover:bg-red-200',
        medium: 'border-transparent bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
        low: 'border-transparent bg-green-100 text-green-700 hover:bg-green-200',
        unknown: 'border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
