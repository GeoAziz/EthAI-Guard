'use client';
import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'EthixAI - Public',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="min-h-screen bg-white text-slate-900">
        <header className="border-b py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold">EthixAI</div>
            <span className="text-sm text-slate-500">Explainable AI for regulated industries</span>
          </div>
          <nav className="space-x-4">
            <Link href="/" className="text-sm">Home</Link>
            <Link href="/docs" className="text-sm">Docs</Link>
            <Link href="/login" className="text-sm font-medium">Login</Link>
          </nav>
        </header>

        <main className="max-w-5xl mx-auto p-8">{children}</main>

        <footer className="border-t py-6 px-6 mt-12 text-sm text-slate-500">
          <div>© {new Date().getFullYear()} EthixAI — Responsible AI tooling</div>
        </footer>
      </body>
    </html>
  );
}
