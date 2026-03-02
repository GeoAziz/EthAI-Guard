import React from 'react';

/**
 * Public Layout
 *
 * This layout wraps public pages (landing, about, blog, etc).
 * Individual pages manage their own header/navigation structure.
 * Root layout provides the <html>, <body>, and structural providers.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
