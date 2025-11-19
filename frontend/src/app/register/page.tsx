"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { register: registerUser } = useAuth();
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
      await registerUser(values.email, values.password);
      
      toast({
        title: "Account Created Successfully! 🎉",
        description: "Welcome to EthixAI! Setting up your dashboard...",
        duration: 2500,
      });
      
      // Small delay for better UX
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Improved error handling with specific messages
      let errorTitle = "Registration Failed";
      let errorMessage = "Unable to create your account. Please try again.";
      
      // Firebase error codes with enhanced messaging
      if (error.code === 'auth/email-already-in-use') {
        errorTitle = "Email Already Registered";
        errorMessage = "An account with this email already exists. Please log in instead.";
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = "Invalid Email";
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/weak-password') {
        errorTitle = "Weak Password";
        errorMessage = "Please choose a stronger password with at least 8 characters, including numbers and symbols.";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorTitle = "Service Unavailable";
        errorMessage = "Account creation is temporarily disabled. Please contact support.";
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
      title="Create an Account"
      description="Start your journey towards responsible AI today."
      quote="Transparency is not about sharing every detail; it's about providing the right details to build trust."
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
            Create Account
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline text-primary">
          Sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
