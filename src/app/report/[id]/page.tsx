import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Share2, Download, Trash2 } from "lucide-react";
import { FairnessCharts } from "@/components/dashboard/fairness-charts";

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl">Loan Application Model Report</CardTitle>
              <CardDescription className="mt-2">
                Report ID: {params.id} | Generated on: {new Date().toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Compliant</Badge>
              <Button variant="outline" size="icon"><Share2 className="h-4 w-4"/></Button>
              <Button variant="outline" size="icon"><Download className="h-4 w-4"/></Button>
              <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Fairness Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <FairnessCharts />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Explainability (SHAP)</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full text-muted-foreground">
            <p>SHAP plot placeholder.</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">No high-risk violations found. The model meets all current regulatory requirements for fairness and transparency.</p>
        </CardContent>
      </Card>
    </div>
  );
}
