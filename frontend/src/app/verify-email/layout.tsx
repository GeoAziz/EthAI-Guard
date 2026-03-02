import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Email - EthixAI',
  description: 'Verify your email address to complete your EthixAI account setup. Check your inbox for the verification link, or resend it if needed.',
  robots: { index: false },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
