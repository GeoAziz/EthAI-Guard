import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up - EthixAI',
  description: 'Create an account to run bias detection, access SHAP explanations, and ensure AI compliance in your organization.',
  alternates: {
    canonical: 'https://ethixai.com/register',
  },
  robots: { index: true, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
