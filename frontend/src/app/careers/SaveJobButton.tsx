'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface SaveJobButtonProps {
  jobId: string;
  jobTitle: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showLabel?: boolean;
}

export default function SaveJobButton({
  jobId,
  jobTitle,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}: SaveJobButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize saved state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');
      setIsSaved(savedJobs.includes(jobId));
    }
  }, [jobId]);

  const handleSaveJob = () => {
    setIsLoading(true);
    try {
      const savedJobs = JSON.parse(localStorage.getItem('savedJobs') || '[]');

      if (isSaved) {
        // Remove from saved
        const updated = savedJobs.filter((id: string) => id !== jobId);
        localStorage.setItem('savedJobs', JSON.stringify(updated));
        setIsSaved(false);
        toast({
          title: 'Job removed',
          description: `Removed "${jobTitle}" from saved jobs`,
        });
      } else {
        // Add to saved
        if (!savedJobs.includes(jobId)) {
          savedJobs.push(jobId);
          localStorage.setItem('savedJobs', JSON.stringify(savedJobs));
        }
        setIsSaved(true);
        toast({
          title: 'Job saved',
          description: `Added "${jobTitle}" to saved jobs`,
        });
      }
    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        title: 'Error',
        description: 'Failed to save job',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isSaved ? 'default' : variant}
      size={size}
      onClick={handleSaveJob}
      disabled={isLoading}
      className={isSaved ? 'bg-primary text-primary-foreground' : ''}
    >
      <Heart className={`h-4 w-4 ${showLabel ? 'mr-2' : ''} ${isSaved ? 'fill-current' : ''}`} />
      {showLabel && (isSaved ? 'Saved' : 'Save Job')}
    </Button>
  );
}
