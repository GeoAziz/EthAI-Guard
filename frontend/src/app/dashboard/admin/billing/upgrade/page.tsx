'use client';
import React, { useState, useEffect } from 'react';
import { LoadingState } from '@/components/ui/loading-state';
import RoleProtected from '@/components/auth/RoleProtected';
import Breadcrumbs from '@/components/layout/breadcrumbs';
import PageHeader from '@/components/layout/page-header';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StripePaymentForm } from '@/components/billing/stripe-payment-form';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for testing',
    features: [
      '5 analyses per month',
      '1 dataset',
      '2 users',
      'CSV upload',
      'Email support',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$499',
    interval: '/month',
    description: 'For small teams',
    features: [
      '20 analyses per month',
      '5 datasets',
      '5 users + SSO',
      'CSV & Excel upload',
      'API access',
      'Standard support',
    ],
    cta: 'Upgrade to Starter',
    highlighted: false,
  },
  {
    key: 'pro',
    name: 'Professional',
    price: '$2,999',
    interval: '/month',
    description: 'For growing organizations',
    features: [
      'Unlimited analyses',
      'Unlimited datasets',
      '10 users + SSO',
      'API access',
      'Real-time monitoring',
      'Compliance reports (PDF)',
      'Priority support',
      'SLA: 99.9% uptime',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Everything in Pro, plus:',
      'On-premise deployment',
      'Custom integrations',
      'Advanced SSO (SAML)',
      'Dedicated account manager',
      'Custom fairness metrics',
      'Quarterly business reviews',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function BillingUpgradePage() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api.get('/api/billing/subscription')
      .then((res) => {
        if (res?.data?.subscription?.plan) {
          setCurrentPlan(res.data.subscription.plan);
        }
      })
      .catch((err) => {
        console.error('Failed to load subscription', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = (planKey: string) => {
    if (planKey === currentPlan) {
      toast({
        title: 'Already on this plan',
        description: 'You are already subscribed to this plan.',
      });
      return;
    }

    if (planKey === 'free') {
      // Downgrade to free (no payment needed)
      setProcessingPlan(planKey);
      api.post('/api/billing/subscribe', { plan: 'free', seats: 1 })
        .then(() => {
          setCurrentPlan('free');
          setSelectedPlan(null);
          toast({
            title: 'Downgraded to Free',
            description: 'Your subscription has been downgraded.',
          });
        })
        .catch((err) => {
          toast({
            title: 'Downgrade failed',
            description: err?.response?.data?.error || 'Could not process downgrade',
            variant: 'destructive',
          });
        })
        .finally(() => setProcessingPlan(null));
      return;
    }

    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@ethixai.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }

    // Show payment form for paid plans
    setSelectedPlan(planKey);
  };

  const handlePaymentSuccess = () => {
    setSelectedPlan(null);
    setCurrentPlan(selectedPlan || currentPlan);
    toast({
      title: 'Subscription activated',
      description: 'Your new plan is now active.',
    });
    setTimeout(() => window.location.href = '/dashboard/admin/billing', 2000);
  };

  return (
    <RoleProtected required={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl">
        <Breadcrumbs />
        <PageHeader
          title="Upgrade Your Plan"
          subtitle="Choose a plan that fits your organization's needs"
        />

        <LoadingState loading={loading} onRetry={() => window.location.reload()} loadingText="Loading pricing plans...">
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={`relative flex flex-col transition-all ${
                  plan.highlighted ? 'ring-2 ring-blue-500 scale-105 shadow-lg' : ''
                } ${currentPlan === plan.key ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Most Popular
                  </div>
                )}

                {currentPlan === plan.key && (
                  <div className="absolute -top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Current
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-4">
                    <div className="text-3xl font-bold">
                      {plan.price}
                      {plan.interval && <span className="text-sm text-muted-foreground">{plan.interval}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.key === currentPlan ? 'outline' : 'default'}
                    disabled={
                      plan.key === currentPlan || processingPlan === plan.key || processingPlan !== null
                    }
                    onClick={() => handleUpgrade(plan.key)}
                  >
                    {processingPlan === plan.key ? 'Processing...' : plan.cta}
                  </Button>
                </CardContent>
              </Card>
              ))}
            </div>

            <div className="mt-12 max-w-3xl">
          <h2 className="text-2xl font-bold mb-4">FAQ</h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription anytime. Your access will continue until the end of the billing cycle.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Do you offer annual billing discounts?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! Contact our sales team at sales@ethixai.com for annual pricing (typically 15-20% discount).
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Can I pay by invoice?</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise customers can request invoice billing. Contact sales@ethixai.com for details.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) via Stripe. Enterprise customers can pay by wire transfer or ACH.
              </p>
              </div>
            </div>
          </LoadingState>

          {selectedPlan && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg max-w-md w-full">
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Complete Your Payment</h2>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-6">
                  <StripePaymentForm
                    planKey={selectedPlan}
                    planName={PLANS.find(p => p.key === selectedPlan)?.name || selectedPlan}
                    amount={parseInt(
                      PLANS.find(p => p.key === selectedPlan)?.price?.replace(/[^\d]/g, '') || '0'
                    ) * 100}
                    onSuccess={handlePaymentSuccess}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </RoleProtected>
  );
}
