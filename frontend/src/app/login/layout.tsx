import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - EthixAI',
  description: 'Sign in to your EthixAI account to access bias detection, fairness analysis, and compliance reporting.',
  alternates: {
    canonical: 'https://ethixai.com/login',
  },
  robots: { index: true, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
