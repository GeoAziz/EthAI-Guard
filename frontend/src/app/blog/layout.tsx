import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EthixAI Blog - AI Fairness & Explainability Insights',
  description: 'Technical insights on AI fairness, explainability, bias detection, and responsible ML practices for financial services.',
  alternates: {
    canonical: 'https://ethixai.com/blog',
  },
  openGraph: {
    title: 'EthixAI Blog - AI Ethics & Fairness',
    description: 'Deep dives into SHAP explanations, fairness metrics, regulatory compliance, and ML best practices.',
    type: 'website',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
