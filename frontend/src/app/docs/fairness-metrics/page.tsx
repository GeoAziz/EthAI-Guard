import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fairness Metrics - EthixAI Documentation',
  description: 'Mathematical definitions, thresholds, and interpretations of fairness metrics in EthixAI.',
};

export default function FairnessMetricsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Fairness Metrics</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Understand the mathematical foundation of fairness analysis with demographic parity, equal opportunity, and disparate impact.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">Demographic Parity</h2>
          <p className="text-muted-foreground mb-4">
            Measures whether different demographic groups receive positive outcomes at the same rate.
          </p>
          
          <Card className="mb-4 bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Mathematical Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-lg mb-2">P(Ŷ = 1 | A = a) = P(Ŷ = 1 | A = b)</p>
                <p className="text-sm text-muted-foreground">
                  Positive prediction rate should be equal across groups
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1">Male Approval Rate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-primary/20 h-8 rounded flex items-center justify-end px-2">
                      <span className="text-sm font-semibold">75%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Female Approval Rate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-primary/20 h-8 rounded flex items-center justify-end px-2" style={{width: '60%'}}>
                      <span className="text-sm font-semibold">45%</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  30% difference indicates potential bias
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge className="bg-green-500">Fair</Badge>
                    <span className="text-muted-foreground">Difference ≤ 10%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">Warning</Badge>
                    <span className="text-muted-foreground">10% - 20%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-red-500">Biased</Badge>
                    <span className="text-muted-foreground">&gt; 20%</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Equal Opportunity</h2>
          <p className="text-muted-foreground mb-4">
            Requires equal true positive rates across groups. Qualified individuals should have equal chance of positive outcome.
          </p>
          
          <Card className="mb-4 bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Mathematical Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-lg mb-2">P(Ŷ = 1 | Y = 1, A = a) = P(Ŷ = 1 | Y = 1, A = b)</p>
                <p className="text-sm text-muted-foreground">
                  True positive rate (TPR) should be equal across groups
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <pre className="text-xs">
{`TPR = True Positives / (True Positives + False Negatives)

Group A: TPR = 80 / (80 + 20) = 0.80
Group B: TPR = 60 / (60 + 40) = 0.60

Difference: |0.80 - 0.60| = 0.20`}
                    </pre>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interpretation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A 20% TPR difference means qualified individuals in Group B 
                  are 20% less likely to receive approval than Group A, 
                  indicating systematic disadvantage.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Disparate Impact</h2>
          <p className="text-muted-foreground mb-4">
            Legal standard measuring if selection rate for one group is less than 80% of another group's rate (80% rule).
          </p>
          
          <Card className="mb-4 bg-muted">
            <CardHeader>
              <CardTitle className="text-base">Mathematical Definition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <p className="text-lg mb-2">DI = P(Ŷ = 1 | A = unprivileged) / P(Ŷ = 1 | A = privileged)</p>
                <p className="text-sm text-muted-foreground">
                  Ratio of selection rates between groups
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Example Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <pre className="text-xs">
{`White approval rate: 75%
Black approval rate: 50%

DI = 50% / 75% = 0.67

Result: 0.67 < 0.80 → Fails 80% rule`}
                    </pre>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge className="bg-green-500">Pass</Badge>
                    <span className="text-muted-foreground">DI ≥ 0.80</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-yellow-500">Warning</Badge>
                    <span className="text-muted-foreground">0.70 - 0.80</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge className="bg-red-500">Fail</Badge>
                    <span className="text-muted-foreground">&lt; 0.70</span>
                  </li>
                  <li className="text-xs text-muted-foreground pt-2">
                    * Based on EEOC guidelines
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Choosing Metrics</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">When to Use Each Metric</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold mb-1">Demographic Parity</p>
                    <p className="text-muted-foreground">
                      Use when you want equal representation in positive outcomes (hiring quotas, lending targets)
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Equal Opportunity</p>
                    <p className="text-muted-foreground">
                      Use when you want to ensure qualified individuals have equal chance (education admissions, promotions)
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Disparate Impact</p>
                    <p className="text-muted-foreground">
                      Use for legal compliance with EEOC and fair lending regulations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>⚠️</span> Important Note
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  It's mathematically impossible to satisfy all fairness definitions simultaneously 
                  when base rates differ between groups. Choose metrics aligned with your use case 
                  and regulatory requirements.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
