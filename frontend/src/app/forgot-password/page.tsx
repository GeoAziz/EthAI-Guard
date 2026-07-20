'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.status === 200) {
        setSubmitted(true);
        toast({
          title: 'Success',
          description: 'If an account exists with this email, you will receive a password reset link',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.error || 'Failed to process password reset request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [email, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 mb-6">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </Button>
                </Link>
              </div>

              <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
              <p className="text-muted-foreground mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link href="/auth/login" className="font-medium text-primary hover:underline">
                    Back to login
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="w-16 h-16 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-muted-foreground mb-4">
                  If an account exists with <strong>{email}</strong>, you will receive an email with instructions to reset your password.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  The reset link will expire in 30 minutes.
                </p>

                <Link href="/auth/login">
                  <Button className="w-full" size="lg">
                    Back to login
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
