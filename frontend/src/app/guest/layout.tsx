import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guest - EthixAI',
  description: 'Explore EthixAI without an account. Try demo reports and learn about our platform.',
  alternates: {
    canonical: 'https://ethixai.com/guest',
  },
  openGraph: {
    title: 'EthixAI Guest Experience',
    description: 'Get a first look at fairness analysis, SHAP explanations, and compliance reporting.',
    type: 'website',
  },
};

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
