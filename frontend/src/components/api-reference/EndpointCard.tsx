'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiEndpoint } from '@/types/api-reference';
import { HttpMethodBadge } from './HttpMethodBadge';
import { CodeBlock } from './CodeBlock';
import { ParametersTable } from './ParametersTable';
import { cn } from '@/lib/utils';

interface EndpointCardProps {
  endpoint: ApiEndpoint;
  isExpanded?: boolean;
}

export function EndpointCard({ endpoint, isExpanded: defaultExpanded = false }: EndpointCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <HttpMethodBadge method={endpoint.method} />
              <code className="text-sm font-mono text-primary bg-muted/50 px-2 py-1 rounded">
                {endpoint.path}
              </code>
            </div>
            <CardTitle className="text-lg mb-1">{endpoint.title}</CardTitle>
            <CardDescription>{endpoint.description}</CardDescription>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform flex-shrink-0',
              isExpanded && 'rotate-180',
            )}
          />
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 border-t border-muted-foreground/10 pt-6">
          {/* Parameters */}
          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Parameters</h4>
              <ParametersTable parameters={endpoint.parameters} />
            </div>
          )}

          {/* Request Example */}
          {endpoint.requestExample && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Request Example</h4>
              <CodeBlock code={endpoint.requestExample} language="json" />
            </div>
          )}

          {/* Response Example */}
          {endpoint.responseExample && (
            <div>
              <h4 className="font-semibold text-sm mb-3">Response Example</h4>
              <CodeBlock code={endpoint.responseExample} language="json" />
            </div>
          )}

          {/* Authentication & Rate Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {endpoint.authentication && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Authentication</p>
                <p className="text-sm text-foreground">
                  Required · JWT Bearer Token in Authorization header
                </p>
              </div>
            )}
            {endpoint.rateLimit && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Rate Limit</p>
                <p className="text-sm text-foreground">{endpoint.rateLimit}</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
