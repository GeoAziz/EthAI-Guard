'use client';
import React from 'react';
import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-4">Access denied</h1>
        <p className="mb-6 text-slate-600">You don't have permission to view this page. If you believe this is an error, contact your administrator.</p>
        <div className="space-x-3">
          <Link href="/" className="px-4 py-2 bg-slate-800 text-white rounded">Home</Link>
          <Link href="/login" className="px-4 py-2 border rounded">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
