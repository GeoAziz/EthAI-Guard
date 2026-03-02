import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Status - EthixAI',
  description: 'Real-time system status and uptime information for EthixAI platform and services.',
  alternates: {
    canonical: 'https://ethixai.com/status',
  },
  openGraph: {
    title: 'EthixAI System Status',
    description: 'Monitor platform health, uptime, and service availability.',
    type: 'website',
  },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
