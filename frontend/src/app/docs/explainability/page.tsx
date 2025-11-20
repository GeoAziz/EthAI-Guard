import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explainability - EthixAI Documentation',
  description: 'Learn how SHAP values provide model explanations with feature importance and force plots.',
};

export default function ExplainabilityPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Explainability</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Understand how your model makes decisions with SHAP (SHapley Additive exPlanations) values.
      </p>

      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">What is SHAP?</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                SHAP is a game-theoretic approach to explain machine learning model predictions. 
                It assigns each feature an importance value for a particular prediction, showing 
                how much each feature contributed to pushing the prediction higher or lower.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-semibold mb-2">Key Properties:</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <strong>Local</strong> - Explains individual predictions</li>
                  <li>• <strong>Global</strong> - Aggregates to show overall feature importance</li>
                  <li>• <strong>Consistent</strong> - Mathematically grounded in Shapley values</li>
                  <li>• <strong>Model-agnostic</strong> - Works with any ML model</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">SHAP Summary Plot</h2>
          <p className="text-muted-foreground mb-4">
            The summary plot shows global feature importance ranked by average impact on predictions.
          </p>
          
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Reading the Plot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg mb-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Badge className="w-32">credit_score</Badge>
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded"></div>
                    <span className="text-sm font-mono">0.42</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="w-32">income</Badge>
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded" style={{width: '70%'}}></div>
                    <span className="text-sm font-mono">0.31</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="w-32">age</Badge>
                    <div className="flex-1 h-2 bg-gradient-to-r from-blue-500 to-red-500 rounded" style={{width: '40%'}}></div>
                    <span className="text-sm font-mono">0.18</span>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-2">�� Red dots (high values)</p>
                  <p className="text-muted-foreground">
                    Push prediction toward positive outcome (approval)
                  </p>
                </div>
                <div>
                  <p className="font-semibold mb-2">🔵 Blue dots (low values)</p>
                  <p className="text-muted-foreground">
                    Push prediction toward negative outcome (rejection)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interpretation Example</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If <strong>credit_score</strong> has the highest mean SHAP value (0.42), 
                it means credit score is the most influential feature in your model's decisions. 
                Red dots on the right indicate high credit scores increase approval likelihood.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Force Plots</h2>
          <p className="text-muted-foreground mb-4">
            Force plots show how features push individual predictions away from the base value.
          </p>
          
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Example Force Plot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">Base Value: 0.50</Badge>
                  <Badge className="bg-green-500">Prediction: 0.82</Badge>
                </div>
                <div className="relative h-16 bg-gray-200 rounded-lg overflow-hidden">
                  <div className="absolute left-0 top-0 h-full bg-green-500/30 flex items-center justify-center text-xs font-semibold" style={{width: '45%'}}>
                    credit_score=740 (+0.22)
                  </div>
                  <div className="absolute right-0 top-0 h-full bg-red-500/30 flex items-center justify-center text-xs font-semibold" style={{width: '15%'}}>
                    age=28 (-0.05)
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>← Lower prediction</span>
                  <span>Higher prediction →</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reading Force Plots</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Base value</strong> - Average model prediction across all data</li>
                <li>• <strong>Green bars</strong> - Features pushing prediction higher</li>
                <li>• <strong>Red bars</strong> - Features pushing prediction lower</li>
                <li>• <strong>Bar width</strong> - Magnitude of feature's impact</li>
                <li>• <strong>Final prediction</strong> - Where all forces balance out</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Feature Importance</h2>
          <p className="text-muted-foreground mb-4">
            Aggregated SHAP values provide a clear ranking of feature importance.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'credit_score', value: 0.42, color: 'bg-blue-500' },
                    { name: 'income', value: 0.31, color: 'bg-blue-400' },
                    { name: 'age', value: 0.18, color: 'bg-blue-300' },
                    { name: 'employment', value: 0.09, color: 'bg-blue-200' }
                  ].map(feature => (
                    <div key={feature.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-mono">{feature.name}</span>
                        <span className="text-sm font-semibold">{feature.value}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className={`${feature.color} h-2 rounded-full`} style={{width: `${feature.value * 100}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Use Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Model debugging</strong> - Identify unexpected feature impacts</li>
                  <li>• <strong>Feature engineering</strong> - Focus on high-impact features</li>
                  <li>• <strong>Stakeholder communication</strong> - Explain model behavior</li>
                  <li>• <strong>Regulatory compliance</strong> - Demonstrate transparency</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Dependence Plots</h2>
          <p className="text-muted-foreground mb-4">
            Show how SHAP values change as a feature value changes, revealing interaction effects.
          </p>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Example: Credit Score Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-6 rounded-lg mb-4">
                <div className="text-xs text-muted-foreground mb-2">SHAP Value</div>
                <div className="border-l-2 border-b-2 border-gray-400 h-32 relative">
                  <div className="absolute bottom-0 left-0 w-full h-full">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <path d="M 0,90 Q 25,70 50,40 T 100,10" fill="none" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right mt-2">Credit Score →</div>
              </div>
              <p className="text-sm text-muted-foreground">
                This plot shows that as credit score increases, its positive impact on approval 
                predictions grows non-linearly, with the strongest effect above 700.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Best Practices</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✓ Do</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Use summary plots for overall model behavior</li>
                  <li>• Check force plots for contested decisions</li>
                  <li>• Validate explanations with domain experts</li>
                  <li>• Monitor SHAP values for drift over time</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">✗ Don't</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Confuse correlation with causation</li>
                  <li>• Ignore feature interactions</li>
                  <li>• Over-interpret small SHAP values</li>
                  <li>• Skip validation on new data</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
