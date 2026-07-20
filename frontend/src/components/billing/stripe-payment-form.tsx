'use client';
import React, { useState } from 'react';
import { loadStripe } from '@stripe/js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export interface StripePaymentFormProps {
  planKey: string;
  planName: string;
  amount: number;
  seats?: number;
  onSuccess?: () => void;
}

function StripeCheckoutForm({ planKey, planName, amount, seats = 1, onSuccess }: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage('Stripe is not loaded. Please refresh the page.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setErrorMessage('Card element not found');
        setLoading(false);
        return;
      }

      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { email: 'billing@company.com' },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed. Please try again.');
        setLoading(false);
        return;
      }

      // Submit to backend to create subscription
      const response = await api.post('/api/billing/subscribe', {
        plan: planKey,
        seats,
        paymentMethodId: paymentMethod?.id,
      });

      if (response?.data?.subscription) {
        toast({
          title: 'Success',
          description: `Upgraded to ${planName}. Your subscription is active.`,
        });
        onSuccess?.();
        cardElement.clear();
      } else {
        throw new Error('Subscription creation failed');
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Payment failed';
      setErrorMessage(message);
      toast({
        title: 'Payment Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{planName}</CardTitle>
        <CardDescription>
          ${(amount / 100).toFixed(2)}/month for {seats} {seats === 1 ? 'user' : 'users'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 border rounded-lg bg-white dark:bg-slate-900">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: { color: '#9e2146' },
                },
              }}
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !stripe}
            className="w-full"
          >
            {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Payment processed securely by Stripe. No sensitive data stored on our servers.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function StripePaymentForm(props: StripePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    setIsLoading(true);
  }, []);

  if (!isLoading) {
    return <div className="h-80 bg-gray-100 animate-pulse rounded" />;
  }

  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutForm {...props} />
    </Elements>
  );
}
