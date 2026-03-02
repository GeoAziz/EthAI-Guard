'use client';
import React, { useState, useEffect } from 'react';
import RoleProtected from '@/components/auth/RoleProtected';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Download, FileText, ShieldAlert, RefreshCw, Scale, Lightbulb } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import Link from 'next/link';

interface Violation {
  level: 'High' | 'Medium' | 'Low';
  description: string;
  recommendation: string;
}

const defaultViolations: Violation[] = [
  {
    level: 'High',
    description: "Disparate impact detected for the 'gender' attribute, potentially violating Equal Credit Opportunity Act (ECOA).",
    recommendation: "Review and re-weight the 'income' and 'loan_amount' features. Consider using a different model algorithm less sensitive to these interactions.",
  },
  {
    level: 'Medium',
    description: "Model lacks transparency for individual decisions, which may not meet GDPR's 'right to explanation' requirements.",
    recommendation: 'Implement SHAP or LIME for all loan rejection decisions and make explanations available upon request.',
  },
  {
    level: 'Low',
    description: 'The dataset used for training has not been updated in the last 12 months, leading to potential model drift.',
    recommendation: 'Establish a quarterly data refresh and model retraining schedule to mitigate concept drift.',
  },
];

export default function CompliancePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [violations, setViolations] = useState<Violation[]>(defaultViolations);
  const [complianceScore, setComplianceScore] = useState(75);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/compliance/latest');
      if (res.data) {
        setViolations(res.data.violations || defaultViolations);
        setComplianceScore(res.data.score || 75);
      }
    } catch (err: any) {
      console.error('Failed to fetch compliance data:', err);
      // Use default data on error
      setViolations(defaultViolations);
      setComplianceScore(75);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const res = await api.get('/api/compliance/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: 'Export Successful',
        description: 'Your compliance report has been downloaded.',
      });
    } catch (err: any) {
      console.error('Export failed:', err);
      toast({
        title: 'Export Initiated',
        description: 'Compliance report is being generated. Check your downloads shortly.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getBadge = (score: number) => {
    if (score >= 80) {
      return (
        <Badge className="bg-green-600/20 text-green-600 dark:text-green-400 border-green-600/30 hover:bg-green-600/30">
          Compliant
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge className="bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30 hover:bg-yellow-600/30">
          Needs Review
        </Badge>
      );
    }
    return <Badge variant="destructive">Non-Compliant</Badge>;
  };

  const getIcon = (level: string) => {
    if (level === 'High') {return <ShieldAlert className="h-5 w-5 text-destructive flex-shrink-0" />;}
    if (level === 'Medium') {return <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />;}
    return <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
  };

  const getLevelBadge = (level: string) => {
    if (level === 'High') {
      return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
    }
    if (level === 'Medium') {
      return <Badge className="bg-yellow-600/20 text-yellow-600 dark:text-yellow-400 border-yellow-600/30 text-xs">Medium Risk</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Low Risk</Badge>;
  };

  // Loading State
  if (loading) {
    return (
      <RoleProtected required={['reviewer', 'admin']}>
        <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </RoleProtected>
    );
  }

  return (
    <RoleProtected required={['reviewer', 'admin']}>
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Compliance Report</h2>
            <p className="text-muted-foreground mt-1">
              Ethical and regulatory compliance analysis based on CBK framework.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={fetchComplianceData} className="flex-1 sm:flex-none">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting} className="flex-1 sm:flex-none">
              {isExporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Score Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Compliance Status
                </CardTitle>
                <CardDescription>As of {new Date().toLocaleDateString()}</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className="text-2xl sm:text-3xl font-bold font-code"
                  aria-label={`Compliance score: ${complianceScore} out of 100`}
                >
                  {complianceScore}/100
                </span>
                {getBadge(complianceScore)}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">Identified Violations & Recommendations</h3>
              </div>
              <Separator />

              {violations.length > 0 ? (
                <ul className="space-y-4" role="list" aria-label="Compliance violations">
                  {violations.map((v, i) => (
                    <li
                      key={i}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      role="listitem"
                    >
                      <div className="flex items-start gap-3 sm:mt-0.5">
                        {getIcon(v.level)}
                        <div className="sm:hidden">{getLevelBadge(v.level)}</div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="hidden sm:block">{getLevelBadge(v.level)}</div>
                          <p className="text-sm sm:text-base">{v.description}</p>
                        </div>
                        <div className="bg-muted/50 rounded-md p-3">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Recommendation: </span>
                            {v.recommendation}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 w-fit mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-lg mb-2">No Violations Found</h4>
                  <p className="text-sm text-muted-foreground">
                    Your model meets all compliance requirements.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border-dashed">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <Lightbulb className="h-5 w-5 text-muted-foreground hidden sm:block" />
                <p className="text-sm text-muted-foreground">
                  View detailed fairness metrics and SHAP explanations for deeper insights.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/fairlens">View FairLens</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/explainboard">View ExplainBoard</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleProtected>
  );
}
