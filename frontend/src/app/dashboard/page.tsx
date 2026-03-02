import { UploadForm } from '@/components/dashboard/upload-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Dataset</h2>
          <p className="text-muted-foreground mt-1">
            Start by uploading a CSV file or use an example dataset to begin your analysis.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            Dataset Uploader
          </CardTitle>
          <CardDescription>Drag and drop your CSV file or click to select a file.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
