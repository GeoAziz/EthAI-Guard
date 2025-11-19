"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      await login(values.email, values.password);
      
      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in. Redirecting...",
        duration: 2000,
      });
      
      // Small delay for better UX
      setTimeout(() => router.push("/dashboard"), 500);
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Improved error handling with specific messages
      let errorTitle = "Authentication Failed";
      let errorMessage = "Please check your email and password.";
      
      // Firebase error codes with enhanced messaging
      if (error.code === 'auth/user-not-found') {
        errorTitle = "Account Not Found";
        errorMessage = "No account exists with this email address. Please check your email or sign up.";
      } else if (error.code === 'auth/wrong-password') {
        errorTitle = "Incorrect Password";
        errorMessage = "The password you entered is incorrect. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = "Invalid Email";
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/user-disabled') {
        errorTitle = "Account Disabled";
        errorMessage = "This account has been disabled. Please contact support for assistance.";
      } else if (error.code === 'auth/too-many-requests') {
        errorTitle = "Too Many Attempts";
        errorMessage = "Access temporarily blocked due to too many failed attempts. Please try again in a few minutes.";
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = "Connection Error";
        errorMessage = "Unable to connect. Please check your internet connection.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
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
      <div className="mt-4 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="underline text-primary">
          Sign up
        </Link>
      </div>
    </AuthLayout>
  );
}
