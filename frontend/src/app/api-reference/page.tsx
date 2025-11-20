import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Database, Shield, Zap } from "lucide-react";

export default function ApiReferencePage() {
  return (
    <div className="container px-4 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">API Reference</h1>
          <p className="text-lg text-muted-foreground">
            Complete reference for integrating EthixAI's fairness analysis and explainability APIs into your systems.
          </p>
        </div>

        <div className="space-y-8">
          {/* Core Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Core Analysis Endpoints
              </CardTitle>
              <CardDescription>Primary endpoints for bias detection and fairness analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-mono font-semibold">POST</span>
                  <code className="text-sm font-mono">/api/analyze</code>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Trigger a comprehensive fairness analysis on your dataset.</p>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
{`{
  "dataset_name": "loan_applications",
  "data": {
    "age": [25, 45, 35, ...],
    "income": [50000, 80000, 65000, ...],
    "loan_approved": [1, 1, 0, ...]
  },
  "target_column": "loan_approved",
  "protected_features": ["age", "gender"]
}`}
                  </pre>
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-xs font-mono font-semibold">GET</span>
                  <code className="text-sm font-mono">/api/analyses/latest</code>
                </div>
                <p className="text-sm text-muted-foreground">Retrieve the most recent analysis results.</p>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-xs font-mono font-semibold">GET</span>
                  <code className="text-sm font-mono">/api/report/:id</code>
                </div>
                <p className="text-sm text-muted-foreground">Fetch a specific analysis report by ID.</p>
              </div>
            </CardContent>
          </Card>

          {/* Explainability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Explainability Endpoints
              </CardTitle>
              <CardDescription>Generate SHAP plots and feature importance analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-mono font-semibold">POST</span>
                  <code className="text-sm font-mono">/api/explain</code>
                </div>
                <p className="text-sm text-muted-foreground">Generate SHAP explanations for model predictions.</p>
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Compliance Endpoints
              </CardTitle>
              <CardDescription>Validate against regulatory frameworks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-mono font-semibold">POST</span>
                  <code className="text-sm font-mono">/api/compliance/validate</code>
                </div>
                <p className="text-sm text-muted-foreground">Validate model against GDPR, ECOA, SR 11-7 frameworks.</p>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Data Management
              </CardTitle>
              <CardDescription>Upload datasets and manage analysis history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-mono font-semibold">POST</span>
                  <code className="text-sm font-mono">/api/datasets/upload</code>
                </div>
                <p className="text-sm text-muted-foreground">Upload a new dataset for analysis.</p>
              </div>

              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-500 rounded text-xs font-mono font-semibold">GET</span>
                  <code className="text-sm font-mono">/api/datasets</code>
                </div>
                <p className="text-sm text-muted-foreground">List all uploaded datasets.</p>
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-4">
              All API requests require authentication via Firebase JWT tokens. Include the token in the Authorization header:
            </p>
            <div className="bg-card p-3 rounded-md">
              <code className="text-xs font-mono">Authorization: Bearer &lt;your-jwt-token&gt;</code>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Rate Limits</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Standard tier: 100 requests/minute</li>
              <li>• Enterprise tier: 1000 requests/minute</li>
              <li>• Dataset size limit: 50MB per upload</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
