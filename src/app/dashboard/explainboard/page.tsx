import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";

export default function ExplainboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ExplainBoard</h2>
          <p className="text-muted-foreground">
            Understand your model's predictions with SHAP analysis.
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Plots
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SHAP Analysis Visualizations</CardTitle>
          <CardDescription>
            Interactive plots to explore model explainability. Plots are static images for demo purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary Plot</TabsTrigger>
              <TabsTrigger value="force">Force Plot</TabsTrigger>
              <TabsTrigger value="dependence">Dependence Plot</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <div className="p-4 border rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">SHAP Summary Plot</h3>
                <p className="text-sm text-muted-foreground mb-4">This plot shows the most important features and their impact on the model's predictions.</p>
                <Image src="https://picsum.photos/seed/shap1/800/400" alt="SHAP Summary Plot" width={800} height={400} className="rounded-md" data-ai-hint="summary plot" />
              </div>
            </TabsContent>
            <TabsContent value="force" className="mt-4">
               <div className="p-4 border rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">SHAP Force Plot</h3>
                <p className="text-sm text-muted-foreground mb-4">This plot shows how features contributed to a single prediction.</p>
                <Image src="https://picsum.photos/seed/shap2/800/200" alt="SHAP Force Plot" width={800} height={200} className="rounded-md" data-ai-hint="force plot" />
              </div>
            </TabsContent>
            <TabsContent value="dependence" className="mt-4">
               <div className="p-4 border rounded-lg bg-muted">
                <h3 className="font-semibold mb-2">SHAP Dependence Plot</h3>
                <p className="text-sm text-muted-foreground mb-4">This plot shows the effect of a single feature on the model's predictions.</p>
                <Image src="https://picsum.photos/seed/shap3/800/400" alt="SHAP Dependence Plot" width={800} height={400} className="rounded-md" data-ai-hint="dependence plot" />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
