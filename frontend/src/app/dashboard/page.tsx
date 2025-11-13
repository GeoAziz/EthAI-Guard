import { UploadForm } from "@/components/dashboard/upload-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Upload Dataset</h2>
          <p className="text-muted-foreground">
            Start by uploading a CSV file or use an example dataset to begin your analysis.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dataset Uploader</CardTitle>
          <CardDescription>Drag and drop your CSV file or click to select a file.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
