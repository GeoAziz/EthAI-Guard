import type { HttpMethod } from '@/types/api-reference';
import { cn } from '@/lib/utils';

interface HttpMethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
  POST: 'bg-green-500/20 text-green-700 dark:text-green-400',
  PUT: 'bg-amber-500/20 text-amber-700 dark:text-amber-400',
  PATCH: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
  DELETE: 'bg-red-500/20 text-red-700 dark:text-red-400',
};

export function HttpMethodBadge({ method, className }: HttpMethodBadgeProps) {
  return (
    <span
      className={cn(
        'px-2 py-1 rounded text-xs font-mono font-semibold',
        methodColors[method],
        className,
      )}
    >
      {method}
    </span>
  );
}
