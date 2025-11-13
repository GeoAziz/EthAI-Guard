"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
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
    setIsAnalyzing(true);
    toast({
      title: "Analysis Started",
      description: "Your dataset is being analyzed for fairness.",
    });
    setTimeout(() => {
      router.push("/dashboard/fairlens");
      setIsAnalyzing(false);
    }, 2000);
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
        className="relative flex flex-col items-center justify-center w-full p-12 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:border-primary transition-colors"
      >
        <input type="file" className="hidden" id="file-upload" onChange={handleFileChange} accept=".csv" />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center">
          <UploadCloud className="w-12 h-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold">Drag & drop your file here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <p className="mt-2 text-xs text-muted-foreground">CSV files up to 50MB</p>
        </label>
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={loadExample}>Load Example Dataset</Button>
      </div>

      {file && (
        <div className="p-4 border rounded-lg bg-muted/50">
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
          <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
            {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Fairness Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
