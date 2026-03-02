import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

export function AuthenticationGuide() {
  const curlExample = `curl -X POST https://api.ethixai.com/v1/api/analyze \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset_name": "loan_applications",
    "data": {...},
    "target_column": "loan_approved",
    "protected_features": ["age", "gender"]
  }'`;

  const pythonExample = `import requests

headers = {
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "Content-Type": "application/json"
}

response = requests.post(
    "https://api.ethixai.com/v1/api/analyze",
    json={
        "dataset_name": "loan_applications",
        "data": {...},
        "target_column": "loan_approved",
        "protected_features": ["age", "gender"]
    },
    headers=headers
)`;

  const jsExample = `const response = await fetch('https://api.ethixai.com/v1/api/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dataset_name: 'loan_applications',
    data: {...},
    target_column: 'loan_approved',
    protected_features: ['age', 'gender']
  })
});

const data = await response.json();`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Authentication
          </CardTitle>
          <CardDescription>
            All API requests require Firebase JWT authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Include your JWT token in the Authorization header for every request:
            </p>
            <CodeBlock code="Authorization: Bearer <your-jwt-token>" language="bash" />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
            <p className="text-small font-semibold text-blue-700 dark:text-blue-400 mb-2">
              Getting Your Token
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                1. Sign in to your EthixAI dashboard at{' '}
                <code className="bg-muted px-2 py-1 rounded text-xs text-foreground">
                  https://app.ethixai.com
                </code>
              </li>
              <li>2. Navigate to Settings → API Keys</li>
              <li>3. Click "Generate New Token"</li>
              <li>4. Copy your JWT token (keep it secure!)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>Integration examples in different languages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="font-semibold text-sm mb-3">cURL</h4>
            <CodeBlock code={curlExample} language="bash" />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Python</h4>
            <CodeBlock code={pythonExample} language="javascript" />
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">JavaScript</h4>
            <CodeBlock code={jsExample} language="javascript" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
