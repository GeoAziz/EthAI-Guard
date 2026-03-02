'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthLayout } from '@/components/auth/auth-layout';
import { PasswordField } from '@/components/auth/password-field';
import { TermsCheckbox } from '@/components/auth/terms-checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseErrorMessage, getHttpErrorMessage } from '@/lib/toast-messages';
import api from '@/lib/api';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(100),
  email: z.string().email({ message: 'Please enter a valid email.' }).toLowerCase().trim(),
  password: z.string().min(12, { message: 'Password must be at least 12 characters.' }),
  passwordConfirm: z.string(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the Terms of Service and Privacy Policy',
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register: registerUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      termsAccepted: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // First, create Firebase user via AuthContext
      await registerUser(values.email, values.password);

      // Then, create backend user record with name
      try {
        await api.post('/auth/register', {
          name: values.name,
          email: values.email,
          password: values.password,
        });
      } catch (backendError: any) {
        // Backend registration failed, but Firebase user was created
        // Log error but continue - user can still login via Firebase
        console.error('Backend registration error:', backendError);
      }

      toast({
        title: 'Account Created Successfully! 🎉',
        description: 'Welcome to EthixAI! Setting up your dashboard...',
        duration: 3000,
      });

      // Redirect after toast completes
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (error: any) {
      let toastMessage;

      // Backend API errors (if registration attempted backend-first)
      if (error.response?.status) {
        if (error.response.status === 429) {
          toastMessage = {
            title: 'Too Many Registration Attempts',
            description: 'Please wait a moment before creating another account.',
            variant: 'destructive' as const,
          };
        } else if (error.response.status === 400 && error.response.data?.error === 'User exists') {
          toastMessage = {
            title: 'Email Already Registered',
            description: 'An account with this email already exists. Please sign in instead.',
            variant: 'destructive' as const,
          };
        } else {
          toastMessage = getHttpErrorMessage(error.response.status);
          // Override with server message if available
          if (error.response.data?.error) {
            toastMessage.description = error.response.data.error;
          }
        }
      }
      // Firebase errors
      else if (error.code) {
        if (error.code === 'auth/email-already-in-use') {
          toastMessage = {
            title: 'Email Already Registered',
            description: 'An account with this email already exists. Please sign in instead.',
            variant: 'destructive' as const,
          };
        } else if (error.code === 'auth/weak-password') {
          toastMessage = {
            title: 'Password Too Weak',
            description: 'Password must be at least 12 characters with uppercase, number, and special characters.',
            variant: 'destructive' as const,
          };
        } else {
          toastMessage = getFirebaseErrorMessage(error.code);
        }
      }
      // Network or unknown errors
      else {
        toastMessage = {
          title: 'Registration Failed',
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

  return (
    <AuthLayout
      title="Create an Account"
      description="Start your journey towards responsible AI today."
      quote="Transparency is not about sharing every detail; it's about providing the right details to build trust."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset className="space-y-4">
            <legend className="sr-only">Registration Form</legend>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      autoComplete="name"
                      aria-describedby={form.formState.errors.name ? 'name-error' : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="name-error" />
                </FormItem>
              )}
            />

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

            <PasswordField
              control={form.control}
              name="password"
              label="Password"
              placeholder="••••••••"
              showRequirements
            />

            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="passwordConfirm">Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      aria-describedby={form.formState.errors.passwordConfirm ? 'passwordConfirm-error' : undefined}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage id="passwordConfirm-error" />
                </FormItem>
              )}
            />

            <TermsCheckbox
              control={form.control}
              name="termsAccepted"
              termsUrl="/docs/terms"
              privacyUrl="/docs/privacy"
            />
          </fieldset>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm">
        <span className="text-muted-foreground">Already have an account?{' '}</span>
        <Link
          href="/login"
          className="font-medium text-primary hover:underline focus-ring rounded"
          aria-label="Sign in to your account"
        >
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
