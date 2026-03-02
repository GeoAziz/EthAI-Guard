import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertTriangle, Info } from 'lucide-react';

export function RateLimitsGuide() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Rate Limits
          </CardTitle>
          <CardDescription>Understanding API usage quotas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
              <h4 className="font-semibold text-sm mb-2">Standard Plan</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 100 requests/minute</li>
                <li>• 10,000 requests/day</li>
                <li>• 50MB dataset limit</li>
              </ul>
            </div>

            <div className="border border-green-500/20 rounded-lg p-4 bg-green-500/5">
              <h4 className="font-semibold text-sm mb-2">Enterprise Plan</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 1,000 requests/minute</li>
                <li>• Unlimited daily requests</li>
                <li>• 500MB dataset limit</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Rate Limit Headers
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  All responses include these headers:
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-300 mt-2 space-y-1 font-mono">
                  <li>X-RateLimit-Limit: Total requests allowed</li>
                  <li>X-RateLimit-Remaining: Requests left in window</li>
                  <li>X-RateLimit-Reset: Unix timestamp of next window</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Handling Rate Limits
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  If you exceed your rate limit, the API returns a 429 (Too Many Requests) response. We
                  recommend implementing exponential backoff with jitter for automatic retries.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
