import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { AnnounceProvider } from '@/contexts/AnnounceContext';

export const metadata: Metadata = {
  title: 'EthixAI Dashboard',
  description: 'AI ethics and explainability engine for financial institutions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>EthixAI Dashboard</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased min-h-screen bg-background">
        <a className="skip-link sr-only focus:not-sr-only" href="#content">Skip to content</a>
        <AuthProvider>
          <AnnounceProvider>
            <div id="content" tabIndex={-1}>
              {children}
            </div>
          </AnnounceProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
