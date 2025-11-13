import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FairnessCharts } from "@/components/dashboard/fairness-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function FairlensPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">FairLens Analysis</h2>
          <p className="text-muted-foreground">
            Bias and fairness metrics for your model based on the 'gender' attribute.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
            </Button>
            <Button>
                <Download className="mr-2 h-4 w-4" />
                Export Report
            </Button>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 flex flex-col items-center justify-center text-center">
            <CardHeader>
                <CardTitle>Overall Fairness Score</CardTitle>
                <CardDescription>A composite score from 0 to 1.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
                <div className="relative h-32 w-32">
                    <svg className="h-full w-full" viewBox="0 0 36 36">
                        <path
                            className="stroke-muted"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            strokeWidth="3"
                        />
                        <path
                            className="stroke-primary"
                            strokeDasharray="83, 100"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                     <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl font-bold font-code">0.83</span>
                    </div>
                </div>
                <Badge variant="default" className="mt-4 bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30">Fair</Badge>
            </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Fairness Metrics Comparison</CardTitle>
            <CardDescription>Comparing metrics across different protected groups.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-medium">Protected Attribute:</span>
              <Select defaultValue="gender">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select attribute" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gender">Gender</SelectItem>
                  <SelectItem value="race">Race (Not available)</SelectItem>
                  <SelectItem value="age_group">Age Group (Not available)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <FairnessCharts />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
