import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers at EthixAI - Join Our AI Ethics Team',
  description: 'Build trustworthy AI with us. We\'re hiring ML engineers, researchers, designers, and compliance specialists.',
  alternates: {
    canonical: 'https://ethixai.com/careers',
  },
  openGraph: {
    title: 'Join EthixAI - Careers in AI Ethics & Fairness',
    description: 'Help us make AI fair, transparent, and responsible for financial institutions worldwide.',
    type: 'website',
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
