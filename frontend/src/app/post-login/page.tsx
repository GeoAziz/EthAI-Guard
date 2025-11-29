"use client";
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function PostLoginRedirect() {
  const { roles, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (roles?.includes('admin')) {
      router.replace('/dashboard/admin');
      return;
    }
    if (roles?.includes('reviewer')) {
      router.replace('/dashboard/reviewer');
      return;
    }
    if (roles?.includes('analyst')) {
      router.replace('/dashboard/analyst');
      return;
    }
    if (roles?.includes('user')) {
      router.replace('/dashboard');
      return;
    }
    // fallback
    router.replace('/login');
  }, [roles, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div>Redirecting based on role…</div>
    </div>
  );
}
