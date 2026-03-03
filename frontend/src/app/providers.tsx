'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { AnnounceProvider } from '@/contexts/AnnounceContext';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AnnounceProvider>
        {children}
      </AnnounceProvider>
    </AuthProvider>
  );
}
