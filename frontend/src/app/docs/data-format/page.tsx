import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Format - EthixAI Documentation',
  description: 'CSV structure requirements, field specifications, and data formatting guidelines for EthixAI.',
};

export default function DataFormatPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Data Format</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Learn how to structure your CSV files for fairness analysis with EthixAI.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">CSV Structure</h2>
          <p className="text-muted-foreground mb-4">
            Your data must be in CSV format with specific columns for demographic attributes and model predictions.
          </p>
          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Example Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto">
{`applicant_id,age,gender,race,income,credit_score,decision,prediction
1001,32,Female,White,55000,720,Approved,Approved
1002,45,Male,Black,62000,680,Approved,Rejected
1003,28,Female,Hispanic,48000,695,Rejected,Rejected
1004,51,Male,Asian,78000,740,Approved,Approved`}
              </pre>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Required Fields</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Protected Attributes</CardTitle>
                  <Badge>Required</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  At least one demographic attribute for fairness analysis:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">gender</Badge>
                    <span className="text-muted-foreground">Binary (Male/Female) or categories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">race</Badge>
                    <span className="text-muted-foreground">White, Black, Hispanic, Asian, etc.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">age</Badge>
                    <span className="text-muted-foreground">Numeric or age groups</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">ethnicity</Badge>
                    <span className="text-muted-foreground">Alternative to race</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Outcome Fields</CardTitle>
                  <Badge>Required</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">decision</Badge>
                    <span className="text-muted-foreground">Actual decision (Approved/Rejected, True/False, 1/0)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-0.5">prediction</Badge>
                    <span className="text-muted-foreground">Model prediction (same format as decision)</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Feature Columns</CardTitle>
                  <Badge variant="secondary">Optional</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Additional columns used by your model for predictions (income, credit_score, etc.). 
                  These enable SHAP explainability analysis.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Data Types</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categorical</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Text labels for discrete categories:
                </p>
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <pre className="text-xs">
{`gender: "Male", "Female", "Other"
race: "White", "Black", "Asian"
decision: "Approved", "Rejected"`}
                    </pre>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Numeric</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Numbers for continuous values:
                </p>
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <pre className="text-xs">
{`age: 32, 45, 28
income: 55000, 62000, 48000
credit_score: 720, 680, 695`}
                    </pre>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✓ Data Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use consistent category labels (avoid typos: "Male" vs "male")</li>
                  <li>• Handle missing values before upload</li>
                  <li>• Ensure binary outcomes are clearly defined</li>
                  <li>• Include at least 100 records for meaningful metrics</li>
                  <li>• Balance protected attribute groups when possible</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">⚠️ Common Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Missing required columns (decision or prediction)</li>
                  <li>• Inconsistent category names (Male/male/M)</li>
                  <li>• Empty cells in protected attributes</li>
                  <li>• Mixed data types in same column</li>
                  <li>• Non-CSV file formats</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Example Datasets</h2>
          <p className="text-muted-foreground mb-4">
            Download sample datasets to test EthixAI:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Loan Applications</p>
                  <Badge>50 rows</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Loan approval decisions with demographics
                </p>
                <p className="text-xs text-primary">Download CSV →</p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">Hiring Decisions</p>
                  <Badge>100 rows</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Job candidate screening results
                </p>
                <p className="text-xs text-primary">Download CSV →</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
