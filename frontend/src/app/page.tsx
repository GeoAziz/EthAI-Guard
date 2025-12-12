
import LandingPageClient from './LandingPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EthixAI - Trustworthy AI for Financial Institutions',
  description: 'Open-source ethics and explainability engine for financial AI. Detect bias, ensure fairness, and achieve compliance with ECOA, GDPR, and FCRA regulations.',
  keywords: ['AI fairness', 'bias detection', 'SHAP', 'explainable AI', 'financial AI', 'ECOA compliance', 'GDPR', 'responsible AI'],
  authors: [{ name: 'EthixAI Team' }],
  openGraph: {
    title: 'EthixAI - Trustworthy AI for Financial Institutions',
    description: 'Ensure your AI models are fair, transparent, and compliant with our open-source ethics engine.',
    type: 'website',
  },
};

export default function Page() {
  return <LandingPageClient />;
}
