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
import { defaultRouteForRoles } from '@/lib/rbac';
import { auth } from '@/lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import api from '@/lib/api';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login, refreshRoles, hasRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [canResendInline, setCanResendInline] = React.useState(false);
  const [resendSending, setResendSending] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Perform login (this may return a Firebase credential when using Firebase)
      console.log('[LoginPage] Starting login with:', values.email);
      const cred = await login(values.email, values.password);
      console.log('[LoginPage] Login returned:', cred);

      // If using Firebase, enforce email verification only for non-privileged users.
      try {
        const current = auth.currentUser || (cred && (cred as any).user);
        if (current && !current.emailVerified) {
          // Try to get roles from backend (authoritative)
          let privileged = false;
          try {
            const me = await api.get('/v1/users/me');
            const roleFromBackend = me?.data?.role;
            let backendRoles: string[] | undefined;
            if (Array.isArray(roleFromBackend)) {backendRoles = roleFromBackend;}
            else if (typeof roleFromBackend === 'string') {backendRoles = roleFromBackend.split(',').map((s: string) => s.trim()).filter(Boolean);}
            if (backendRoles && backendRoles.some(r => ['admin','analyst','reviewer'].includes(r))) {
              privileged = true;
            }
          } catch (_) {}
          // Fallback: try token claims
          if (!privileged) {
            try {
              const idTokenResult = await current.getIdTokenResult(true);
              const claims = idTokenResult?.claims || {};
              let effectiveRoles: string[] | undefined;
              if (Array.isArray(claims.roles)) {effectiveRoles = claims.roles as string[];}
              else if (typeof claims.role === 'string') {effectiveRoles = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);}
              if (effectiveRoles && effectiveRoles.some(r => ['admin','analyst','reviewer'].includes(r))) {
                privileged = true;
              }
            } catch (_) {}
          }
          if (!privileged) {
            // Best-effort: send a verification email and redirect user to a friendly
            // verification page with a resend button and instructions.
            try { await sendEmailVerification(current); } catch (_) {}
            router.push('/verify-email');
            setIsSubmitting(false);
            return;
          }
        }
      } catch (e) {
        // ignore verification-check errors and proceed (server-side may still gate access)
      }

      toast({
        title: 'Welcome back!',
        description: "You've been successfully logged in. Redirecting...",
        duration: 2000,
      });

      // Refresh roles from backend (best-effort) to get authoritative role mapping
      try { await refreshRoles(); } catch (_) {}

      // 1) Try backend authoritative role
      try {
        console.log('[LoginPage] Fetching /v1/users/me...');
        const me = await api.get('/v1/users/me');
        console.log('[LoginPage] /v1/users/me response:', me?.data);
        const roleFromBackend = me?.data?.role;
        let backendRoles: string[] | undefined;
        if (Array.isArray(roleFromBackend)) {backendRoles = roleFromBackend;}
        else if (typeof roleFromBackend === 'string') {backendRoles = roleFromBackend.split(',').map((s: string) => s.trim()).filter(Boolean);}

        if (backendRoles && backendRoles.length > 0) {
          router.push(defaultRouteForRoles(backendRoles));
          return;
        }
      } catch (_) {
        // ignore and fall back to token claims
      }

      // 2) Try token claims from Firebase (if available)
      try {
        const current = auth.currentUser;
        if (current) {
          const idTokenResult = await current.getIdTokenResult(true);
          const claims = idTokenResult?.claims || {};
          let effectiveRoles: string[] | undefined;
          if (Array.isArray(claims.roles)) {effectiveRoles = claims.roles as string[];}
          else if (typeof claims.role === 'string') {effectiveRoles = (claims.role as string).split(',').map(s => s.trim()).filter(Boolean);}
          const dest = defaultRouteForRoles(effectiveRoles ?? undefined);
          router.push(dest);
          return;
        }
      } catch (_) {
        // ignore and fall through
      }

      // 3) Last-resort: use hasRole from AuthContext
      if (hasRole && hasRole('admin')) {router.push('/dashboard/admin/access-requests');}
      else {router.push('/dashboard');}
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Improved error handling with specific messages
      let errorTitle = 'Authentication Failed';
      let errorMessage = 'Please check your email and password.';

      // Check for backend API errors first (Axios response)
      if (error.response) {
        if (error.response.status === 401) {
          errorTitle = 'Invalid Credentials';
          errorMessage = error.response.data?.error || 'Email or password is incorrect.';
        } else if (error.response.status === 400) {
          errorTitle = 'Invalid Input';
          errorMessage = error.response.data?.error || 'Please check your email and password format.';
        } else if (error.response.status === 429) {
          errorTitle = 'Too Many Attempts';
          errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (error.response.status >= 500) {
          errorTitle = 'Server Error';
          errorMessage = 'The server is temporarily unavailable. Please try again later.';
        } else {
          errorMessage = error.response.data?.error || error.message;
        }
      }
      // Firebase error codes with enhanced messaging
      else if (error.code === 'auth/user-not-found') {
        errorTitle = 'Account Not Found';
        errorMessage = 'No account exists with this email address. Please check your email or sign up.';
      } else if (error.code === 'auth/wrong-password') {
        errorTitle = 'Incorrect Password';
        errorMessage = 'The password you entered is incorrect. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = 'Invalid Email';
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorTitle = 'Account Disabled';
        errorMessage = 'This account has been disabled. Please contact support for assistance.';
      } else if (error.code === 'auth/too-many-requests') {
        errorTitle = 'Too Many Attempts';
        errorMessage = 'Access temporarily blocked due to too many failed attempts. Please try again in a few minutes.';
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = 'Connection Error';
        errorMessage = 'Unable to connect. Please check your internet connection.';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Inline resend support: show a small CTA when there's a signed-in but unverified user
  React.useEffect(() => {
    try {
      const current = auth.currentUser;
      setCanResendInline(!!(current && !current.emailVerified));
      // Listen for auth state changes to update UI
      const unsub = auth.onAuthStateChanged((u) => {
        setCanResendInline(!!(u && !u.emailVerified));
      });
      return () => unsub();
    } catch (e) {
      // ignore
    }
  }, []);

  async function handleInlineResend() {
    setResendSending(true);
    try {
      const current = auth.currentUser;
      if (!current) {
        toast({ title: 'Not signed in', description: 'Please sign in first to resend verification email.', variant: 'destructive' });
        setResendSending(false);
        return;
      }
      await sendEmailVerification(current);
      toast({ title: 'Verification Sent', description: 'A verification email was sent. Check your inbox and click the link to verify.', duration: 8000 });
    } catch (e) {
      console.error('resend failed', e);
      toast({ title: 'Failed to send', description: 'Could not send verification email. Try again later.', variant: 'destructive' });
    } finally {
      setResendSending(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome Back"
      description="Enter your credentials to access your dashboard."
      quote="The measure of intelligence is the ability to change. In AI, the measure of ethics is the willingness to be transparent."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>
      {/* Inline resend CTA for users who are signed-in but email unverified */}
      <div className="mt-3 text-center">
        {canResendInline ? (
          <div className="space-y-2">
            <p className="text-sm">Your email is not verified yet.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={handleInlineResend} disabled={resendSending}>{resendSending ? 'Sending...' : 'Resend verification email'}</Button>
              <Link href="/verify-email" className="underline text-sm">Verification instructions</Link>
            </div>
          </div>
        ) : null}
      </div>
      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="underline text-primary">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
