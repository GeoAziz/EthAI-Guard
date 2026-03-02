import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Privacy Policy | EthixAI',
  description: 'Privacy Policy for the EthixAI platform',
};

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <p className="text-lg text-muted-foreground mb-8">
          Last updated: February 28, 2026
        </p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              EthixAI ("Company," "we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process your personal information through our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p>We collect information you provide directly, such as:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Account registration data (name, email, password)</li>
              <li>Profile information and preferences</li>
              <li>Datasets and analysis inputs you upload</li>
              <li>Communication and support inquiries</li>
              <li>Payment information (processed securely by third parties)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Provide, maintain, and improve our services</li>
              <li>Authenticate your identity and secure your account</li>
              <li>Process your requests and analyze your data</li>
              <li>Send necessary communications and updates</li>
              <li>Comply with legal obligations and enforce our agreements</li>
              <li>Monitor and prevent fraudulent activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p>
              Our platform may use third-party services including Firebase for authentication and cloud services. These third parties have their own privacy policies, and we encourage you to review them. We are not responsible for third-party privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p>Depending on your location, you may have rights including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Right to access your personal information</li>
              <li>Right to correct inaccurate information</li>
              <li>Right to request deletion of your data</li>
              <li>Right to data portability</li>
              <li>Right to opt-out of certain processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience and analyze how you interact with our platform. You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. GDPR Compliance (EU Users)</h2>
            <p>
              If you are located in the European Union, our processing of your personal information is based on your consent, contractual necessity, or our legitimate interests. You have the right to lodge a complaint with your local data protection authority.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Policy Updates</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the effective date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p>
              If you have questions about our Privacy Policy or wish to exercise your rights, please contact us at{' '}
              <a href="mailto:privacy@ethixai.com" className="text-primary hover:underline">
                privacy@ethixai.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
