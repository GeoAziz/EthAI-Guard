import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Download, FileText, ShieldAlert } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const violations = [
  {
    level: "High",
    description: "Disparate impact detected for the 'gender' attribute, potentially violating Equal Credit Opportunity Act (ECOA).",
    recommendation: "Review and re-weight the 'income' and 'loan_amount' features. Consider using a different model algorithm less sensitive to these interactions.",
  },
  {
    level: "Medium",
    description: "Model lacks transparency for individual decisions, which may not meet GDPR's 'right to explanation' requirements.",
    recommendation: "Implement SHAP or LIME for all loan rejection decisions and make explanations available upon request.",
  },
  {
    level: "Low",
    description: "The dataset used for training has not been updated in the last 12 months, leading to potential model drift.",
    recommendation: "Establish a quarterly data refresh and model retraining schedule to mitigate concept drift.",
  },
];


export default function CompliancePage() {
  const getBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Compliant</Badge>;
    if (score >= 60) return <Badge variant="destructive" className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30">Needs Review</Badge>;
    return <Badge variant="destructive">Non-Compliant</Badge>;
  };
  
  const getIcon = (level: string) => {
    if (level === "High") return <ShieldAlert className="h-5 w-5 text-destructive" />;
    if (level === "Medium") return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
  }

  const complianceScore = 75;

  return (
    <div className="space-y-8">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Compliance Report</h2>
          <p className="text-muted-foreground">
            Ethical and regulatory compliance analysis based on CBK framework.
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>As of {new Date().toLocaleDateString()}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-2xl font-bold font-code">{complianceScore}/100</span>
                {getBadge(complianceScore)}
            </div>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Identified Violations & Recommendations</h3>
                </div>
                <Separator />
                <ul className="space-y-4">
                    {violations.map((v, i) => (
                        <li key={i} className="flex gap-4">
                            <div className="mt-1">{getIcon(v.level)}</div>
                            <div>
                                <p className="font-semibold">{v.level} Risk: <span className="font-normal">{v.description}</span></p>
                                <p className="text-sm text-muted-foreground mt-1"><span className="font-medium text-foreground">Recommendation:</span> {v.recommendation}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
