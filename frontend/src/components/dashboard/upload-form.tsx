"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { exampleDataset } from "@/lib/mock-data";

type FilePreview = {
  name: string;
  size: number;
};

export function UploadForm() {
  const [file, setFile] = useState<FilePreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== "text/csv") {
        toast({
            title: "Invalid File Type",
            description: "Please upload a CSV file.",
            variant: "destructive",
        });
        return;
    }
    setFile({ name: selectedFile.name, size: selectedFile.size });
    setPreviewData(null); // Clear previous preview
    // Simulate reading CSV header for preview
    setPreviewData(exampleDataset.slice(0, 10));
    simulateUpload();
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
        setUploadProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                setIsUploading(false);
                 toast({
                    title: "Upload Complete",
                    description: `${file?.name} has been uploaded successfully.`,
                });
                return 100;
            }
            return prev + 20;
        });
    }, 300);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setPreviewData(null);
  };

  const handleRunAnalysis = () => {
    // Use an async handler to keep types clear and payload shaped as columns->arrays
    (async () => {
      setIsAnalyzing(true);
      toast({
        title: "Analysis Started",
        description: "Your dataset is being analyzed for fairness.",
      });

      // Convert preview rows [{colA: v, colB: v}, ...] into {colA: [..], colB: [..]}
      const rowsToColumns = (rows: any[]) => {
        if (!rows || rows.length === 0) return {};
        const cols: Record<string, any[]> = {};
        Object.keys(rows[0]).forEach((k) => (cols[k] = []));
        rows.forEach((r) => {
          Object.entries(r).forEach(([k, v]) => cols[k].push(v));
        });
        return cols;
      };

      try {
        const data = previewData ? rowsToColumns(previewData) : {};
        const payload = { dataset_name: file?.name || 'example', data };
        const res = await api.post('/analyze', payload);
        const reportId = res?.data?.reportId || res?.data?.analysisId || res?.data?.analysis_id;
        toast({ title: 'Analysis Complete', description: 'Results are available.' });
        if (reportId) router.push(`/report/${reportId}`);
        else router.push('/dashboard/fairlens');
      } catch (err: any) {
        console.error('Analyze error', err);
        toast({ title: 'Analysis Failed', description: String(err?.response?.data?.error || err?.message), variant: 'destructive' });
      } finally {
        setIsAnalyzing(false);
      }
    })();
  };

  const loadExample = () => {
    setFile({name: 'example_loan_data.csv', size: 12345});
    setPreviewData(exampleDataset.slice(0, 10));
    setIsUploading(false);
    setUploadProgress(100);
     toast({
        title: "Example Dataset Loaded",
        description: "You can now proceed with the analysis.",
    });
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        className="relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:border-primary transition-colors duration-200 ease-out hover:shadow-lg"
        aria-busy={isUploading}
      >
        <input type="file" className="hidden" id="file-upload" onChange={handleFileChange} accept=".csv" disabled={isUploading} />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center" title={isUploading ? 'Uploading...' : 'Click to select a CSV file'}>
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Drag & drop your file here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <p className="mt-2 text-xs text-muted-foreground">CSV files up to 50MB</p>
        </label>

        {isUploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg" aria-hidden>
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-medium">Uploading… {uploadProgress}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={loadExample}
          disabled={isUploading || isAnalyzing}
          title="Load a small synthetic dataset for the demo"
          className="transition-transform duration-200 transform hover:-translate-y-0.5"
        >
          {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Load Example Dataset
        </Button>
      </div>

      {file && (
        <div className="p-4 border rounded-lg bg-muted/50 transition-shadow duration-150 hover:shadow-sm">
            <div className="flex items-center gap-4">
                <File className="w-8 h-8 text-primary" />
                <div className="flex-1">
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
        {isUploading && <Progress value={uploadProgress} className="w-1/3" />}
        <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
          <X className="w-4 h-4" />
        </Button>
            </div>
        </div>
      )}

      {previewData && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Preview</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(previewData[0]).map(key => <TableHead key={key}>{key}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value: any, i) => <TableCell key={i} className="font-code">{String(value)}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {file && uploadProgress === 100 && (
        <div className="flex justify-end">
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {isAnalyzing ? 'Running analysis…' : 'Ready to analyze'}
            </div>
            <Button onClick={handleRunAnalysis} disabled={isAnalyzing} title="Run the fairness & explainability analysis">
              {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isAnalyzing ? 'Analyzing' : 'Run Fairness Analysis'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
