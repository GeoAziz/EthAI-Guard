import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Terms of Service | EthixAI',
  description: 'Terms of Service for the EthixAI platform',
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 md:px-8">
      <div className="mb-8">
        <Link href="/docs">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Documentation
          </Button>
        </Link>
      </div>

      <article className="prose prose-invert max-w-none dark:prose-invert">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <p className="text-lg text-muted-foreground mb-8">
          Last updated: February 28, 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using the EthixAI platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. License</h2>
            <p>
              EthixAI grants you a limited, non-exclusive, non-transferable license to access and use the platform for lawful purposes only, in accordance with these terms. You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Reverse engineer, decompile, or disassemble any part of the platform</li>
              <li>Use the platform for any unlawful purposes or in violation of any applicable laws</li>
              <li>Share your account credentials with third parties</li>
              <li>Attempt to gain unauthorized access to the platform</li>
              <li>Transmit malware, viruses, or harmful code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account information and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, EthixAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to damages for loss of profits, goodwill, use, data, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Modifications to Terms</h2>
            <p>
              EthixAI reserves the right to modify these terms at any time. Your continued use of the platform following the posting of revised terms means that you accept and agree to the changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@ethixai.com" className="text-primary hover:underline">
                legal@ethixai.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
