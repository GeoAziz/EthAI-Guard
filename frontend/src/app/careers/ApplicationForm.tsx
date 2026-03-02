'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { validateApplicationData } from './utils';

interface ApplicationFormProps {
  jobId: string;
  jobTitle: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export default function ApplicationForm({ jobId, jobTitle, onClose, onSuccess }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    linkedIn: '',
    resume: null as File | null,
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, resume: e.target.files?.[0] || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateApplicationData(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus('loading');
    setErrors([]);

    try {
      const form = new FormData();
      form.append('fullName', formData.fullName);
      form.append('email', formData.email);
      form.append('phone', formData.phone);
      form.append('jobId', jobId);
      form.append('coverLetter', formData.coverLetter);
      form.append('linkedIn', formData.linkedIn);
      if (formData.resume) {
        form.append('resume', formData.resume);
      }

      const response = await fetch('/api/careers/applications', {
        method: 'POST',
        body: form,
      });

      if (response.ok) {
        const data = await response.json();
        setStatus('success');
        setSuccessMessage(data.message);
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        } else if (onClose) {
          setTimeout(() => onClose(), 3000);
        }
      } else {
        const data = await response.json();
        setStatus('error');
        setErrors([data.error || 'Failed to submit application']);
      }
    } catch (error) {
      setStatus('error');
      setErrors(['An error occurred. Please try again.']);
      console.error('Application submission error:', error);
    }
  };

  // Determine if this is inline or modal mode
  const isInlineMode = !!onSuccess && !onClose;

  if (status === 'success') {
    if (isInlineMode) {
      return null; // Use onSuccess callback instead
    }
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-card rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-start mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
            {onClose && (
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <h2 className="text-xl font-bold mb-2">Application Received!</h2>
          <p className="text-muted-foreground mb-4">{successMessage}</p>
          {onClose && (
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Inline form rendering (for full-page use)
  if (isInlineMode) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 space-y-1">
            {errors.map((error, i) => (
              <div key={i} className="flex gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleInputChange}
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number *</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        {/* LinkedIn */}
        <div>
          <label className="block text-sm font-medium mb-1">LinkedIn Profile</label>
          <input
            type="url"
            name="linkedIn"
            value={formData.linkedIn}
            onChange={handleInputChange}
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            placeholder="https://linkedin.com/in/johndoe"
          />
        </div>

        {/* Resume */}
        <div>
          <label className="block text-sm font-medium mb-1">Resume (PDF/DOCX) *</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={status === 'loading'}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
          />
          {formData.resume && (
            <p className="text-sm text-muted-foreground mt-1">{formData.resume.name}</p>
          )}
        </div>

        {/* Cover Letter */}
        <div>
          <label className="block text-sm font-medium mb-1">Cover Letter / Why You Want to Join *</label>
          <textarea
            name="coverLetter"
            value={formData.coverLetter}
            onChange={handleInputChange}
            disabled={status === 'loading'}
            rows={4}
            className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50 resize-none"
            placeholder="Tell us why you're interested in this role..."
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={status === 'loading'}
          className="w-full"
          aria-busy={status === 'loading'}
        >
          {status === 'loading' ? 'Submitting...' : 'Submit Application'}
        </Button>
      </form>
    );
  }

  // Modal form rendering (for modal use)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-card rounded-lg shadow-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">Apply for Position</h2>
            <p className="text-muted-foreground mt-1">{jobTitle}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              disabled={status === 'loading'}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 space-y-1">
              {errors.map((error, i) => (
                <div key={i} className="flex gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              disabled={status === 'loading'}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              disabled={status === 'loading'}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
              placeholder="john@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={status === 'loading'}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* LinkedIn */}
          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn Profile</label>
            <input
              type="url"
              name="linkedIn"
              value={formData.linkedIn}
              onChange={handleInputChange}
              disabled={status === 'loading'}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>

          {/* Resume */}
          <div>
            <label className="block text-sm font-medium mb-1">Resume (PDF/DOCX) *</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              disabled={status === 'loading'}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            />
            {formData.resume && (
              <p className="text-sm text-muted-foreground mt-1">{formData.resume.name}</p>
            )}
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium mb-1">Cover Letter / Why You Want to Join *</label>
            <textarea
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleInputChange}
              disabled={status === 'loading'}
              rows={4}
              className="w-full px-3 py-2 border rounded-md bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50 resize-none"
              placeholder="Tell us why you're interested in this role..."
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={status === 'loading'}
              className="flex-1"
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Submitting...' : 'Submit Application'}
            </Button>
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={status === 'loading'}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
