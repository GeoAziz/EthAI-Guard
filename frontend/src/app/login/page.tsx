'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import api from '@/lib/api';
import { getFirebaseErrorMessage, getHttpErrorMessage } from '@/lib/toast-messages';
import {
  extractRoles,
  shouldEnforceEmailVerification,
  getRedirectAfterLogin,
  type AuthUser,
} from '@/lib/auth-routing';
import { debugLogger } from '@/lib/debug-logger';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, refreshRoles } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showInlineResend, setShowInlineResend] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // Log login attempt
    debugLogger.info('LOGIN', 'Login attempt started', {
      email: values.email,
      timestamp: new Date().toISOString(),
    });

    try {
      debugLogger.debug('LOGIN', 'Calling Firebase login', { email: values.email });
      
      // Perform login
      const cred = await login(values.email, values.password);
      const current = auth.currentUser || (cred && (cred as any).user);

      debugLogger.success('LOGIN', 'Firebase authentication successful', {
        uid: current?.uid,
        email: current?.email,
      });

      // Check email verification requirement for non-privileged users
      try {
        if (current) {
          debugLogger.debug('LOGIN', 'Fetching user roles from backend');
          const me = await api.get('/v1/users/me');
          const backendRoles = me?.data?.role;
          const roles = extractRoles(backendRoles);

          debugLogger.info('LOGIN', 'User roles retrieved', {
            roles,
            rawRole: backendRoles,
          });

          if (shouldEnforceEmailVerification(current as AuthUser, roles)) {
            debugLogger.info('LOGIN', 'Email verification required');
            try {
              await sendEmailVerification(current);
              debugLogger.success('LOGIN', 'Verification email sent');
            } catch (err) {
              debugLogger.warn('LOGIN', 'Failed to send verification email', err);
              // Best-effort; continue even if send fails
            }
            router.push('/verify-email');
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err) {
        debugLogger.warn('LOGIN', 'Error checking email verification', err);
        // If we can't fetch user info, proceed and let server-side auth handle it
      }

      toast({
        title: 'Welcome back!',
        description: "You've been successfully logged in. Redirecting...",
        duration: 2000,
      });

      // Refresh roles from backend
      try {
        debugLogger.debug('LOGIN', 'Refreshing roles');
        await refreshRoles();
        debugLogger.success('LOGIN', 'Roles refreshed');
      } catch (err) {
        debugLogger.warn('LOGIN', 'Failed to refresh roles', err);
        // Continue on error
      }

      // Detect redirect destination with priority: backend → token → context
      try {
        debugLogger.debug('LOGIN', 'Determining redirect destination');
        const me = await api.get('/v1/users/me');
        const backendRoles = me?.data?.role;
        if (backendRoles) {
          const redirectPath = getRedirectAfterLogin(backendRoles);
          debugLogger.success('LOGIN', 'Redirecting based on backend roles', {
            redirectPath,
            roles: backendRoles,
          });
          router.push(redirectPath);
          return;
        }
      } catch (err) {
        debugLogger.warn('LOGIN', 'Failed to get backend roles for redirect', err);
        // Fall through to token claims
      }

      // Try Firebase ID token claims
      try {
        if (current) {
          debugLogger.debug('LOGIN', 'Checking Firebase ID token claims');
          const idTokenResult = await current.getIdTokenResult(true);
          const claims = idTokenResult?.claims || {};
          const redirectPath = getRedirectAfterLogin(undefined, claims);
          debugLogger.success('LOGIN', 'Redirecting based on ID token claims', {
            redirectPath,
            claims: Object.keys(claims),
          });
          router.push(redirectPath);
          return;
        }
      } catch (err) {
        debugLogger.warn('LOGIN', 'Failed to get ID token claims', err);
        // Fall through to context-based routing
      }

      // Final fallback: use context role
      debugLogger.info('LOGIN', 'Using default redirect to dashboard');
      router.push('/dashboard');
    } catch (error: any) {
      // Centralized error handling using toast message catalog
      debugLogger.error('LOGIN', 'Login failed with error', error);

      let toastMessage;

      // Backend API errors (Axios response)
      if (error.response?.status) {
        debugLogger.warn('LOGIN', 'Backend API error', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
        toastMessage = getHttpErrorMessage(error.response.status);
        // Use server message if available
        if (error.response.data?.error) {
          toastMessage.description = error.response.data.error;
          debugLogger.debug('LOGIN', 'Using server error message', {
            message: error.response.data.error,
          });
        }
      }
      // Firebase errors
      else if (error.code) {
        debugLogger.warn('LOGIN', 'Firebase authentication error', {
          code: error.code,
          message: error.message,
        });
        toastMessage = getFirebaseErrorMessage(error.code);
      }
      // Network or unknown errors
      else {
        debugLogger.error('LOGIN', 'Unknown error occurred', {
          message: error.message,
          stack: error.stack,
        });
        toastMessage = {
          title: 'Login Failed',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive' as const,
        };
      }

      toast({
        ...toastMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Inline resend support: show a small CTA when there's a signed-in but unverified user
  React.useEffect(() => {
    debugLogger.info('LOGIN_PAGE', 'Component mounted');
    debugLogger.debug('LOGIN_PAGE', 'Browser environment check', {
      hasNavigator: typeof navigator !== 'undefined',
      hasWindow: typeof window !== 'undefined',
    });

    try {
      const current = auth.currentUser;
      if (current) {
        debugLogger.info('LOGIN_PAGE', 'User already signed in', {
          uid: current.uid,
          email: current.email,
          emailVerified: current.emailVerified,
        });
        if (!current.emailVerified) {
          setShowInlineResend(true);
          debugLogger.debug('LOGIN_PAGE', 'Email not verified - showing inline resend');
        }
      } else {
        debugLogger.debug('LOGIN_PAGE', 'No user currently signed in');
      }

      // Listen for auth state changes to update UI
      const unsub = auth.onAuthStateChanged((u) => {
        if (u) {
          debugLogger.info('LOGIN_PAGE', 'Auth state changed - user signed in', {
            uid: u.uid,
            emailVerified: u.emailVerified,
          });
          setShowInlineResend(!u.emailVerified);
        } else {
          debugLogger.debug('LOGIN_PAGE', 'Auth state changed - user signed out');
          setShowInlineResend(false);
        }
      });
      return () => unsub();
    } catch (e) {
      debugLogger.error('LOGIN_PAGE', 'Error in auth state setup', e);
    }
  }, []);

  async function handleInlineResend() {
    debugLogger.info('LOGIN', 'Inline resend initiated');
    
    try {
      const current = auth.currentUser;
      if (!current) {
        debugLogger.warn('LOGIN', 'No user found for resend', {
          timestamp: new Date().toISOString(),
        });
        toast({
          title: 'Not signed in',
          description: 'Please sign in first to resend verification email.',
          variant: 'destructive' as const,
        });
        return;
      }

      debugLogger.debug('LOGIN', 'Sending verification email', {
        email: current.email,
        uid: current.uid,
      });

      await sendEmailVerification(current);
      
      debugLogger.success('LOGIN', 'Verification email resent successfully', {
        email: current.email,
      });

      toast({
        title: 'Verification Sent',
        description: 'Check your inbox for the verification link.',
        duration: 8000,
      });
    } catch (e: any) {
      debugLogger.error('LOGIN', 'Failed to resend verification email', {
        message: e.message,
        code: e.code,
      });

      toast({
        title: 'Failed to send',
        description: 'Could not send verification email. Try again later.',
        variant: 'destructive' as const,
        duration: 5000,
      });
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Enter your credentials to access your dashboard."
      quote="The measure of intelligence is the ability to change. In AI, the measure of ethics is the willingness to be transparent."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset className="space-y-4">
            <legend className="sr-only">Login Form</legend>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="email"
                      aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="email-error" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="password-error" />
                </FormItem>
              )}
            />
          </fieldset>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      {/* Inline resend CTA for users who are signed-in but email unverified */}
      {showInlineResend ? (
        <div
          className="mt-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
          role="status"
          aria-live="polite"
          aria-label="Email verification status"
        >
          <div className="space-y-2">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Email verification required
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Please verify your email to access the dashboard.
            </p>
            <div className="flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleInlineResend}
                disabled={isSubmitting}
                aria-label="Resend verification email to your inbox"
              >
                Resend email
              </Button>
              <Link
                href="/verify-email"
                className="text-sm text-primary hover:underline focus-ring rounded"
                aria-label="Go to email verification page for more help"
              >
                Help
              </Link>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Don&apos;t have an account?{' '}</span>
        <Link
          href="/register"
          className="font-medium text-primary hover:underline focus-ring rounded"
          aria-label="Create a new account"
        >
          Sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
