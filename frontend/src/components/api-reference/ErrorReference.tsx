import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import type { ApiErrorResponse } from '@/types/api-reference';

interface ErrorReferenceProps {
  errors: Record<number, ApiErrorResponse>;
}

export function ErrorReference({ errors }: ErrorReferenceProps) {
  const errorArray = Object.values(errors).sort((a, b) => a.code - b.code);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Error Responses
        </CardTitle>
        <CardDescription>HTTP status codes and error handling guide</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {errorArray.map((error) => (
            <div key={error.code} className="border border-muted-foreground/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-mono font-bold text-foreground">{error.code}</span>
                <span className="text-sm font-semibold text-muted-foreground">{error.status}</span>
              </div>
              <p className="text-sm text-foreground mb-2">{error.description}</p>
              {error.example && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <code className="text-xs font-mono text-muted-foreground break-words">
                    {error.example}
                  </code>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
