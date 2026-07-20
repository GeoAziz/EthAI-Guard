'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !email) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token, email]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter and confirm your password',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 12) {
      toast({
        title: 'Error',
        description: 'Password must be at least 12 characters long',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        email,
        newPassword,
      });

      if (response.status === 200) {
        setSuccess(true);
        toast({
          title: 'Success',
          description: 'Your password has been reset successfully',
        });
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || 'Failed to reset password';
      setError(errorMsg);
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, token, email, toast, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <div className="p-8">
          {error ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Invalid reset link</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button
                onClick={() => router.push('/auth/forgot-password')}
                className="w-full"
                size="lg"
              >
                Request new reset link
              </Button>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Password reset successfully</h1>
              <p className="text-muted-foreground mb-6">
                Your password has been reset. You will be redirected to login.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
              <p className="text-muted-foreground mb-6">
                Enter your new password below. It must be at least 12 characters long.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm password
                  </label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={12}
                  />
                </div>

                <div className="text-sm text-muted-foreground">
                  Password requirements:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>At least 12 characters</li>
                    <li>Mix of uppercase and lowercase letters</li>
                    <li>Include numbers and special characters</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !newPassword || !confirmPassword}
                  size="lg"
                >
                  {loading ? 'Resetting...' : 'Reset password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
