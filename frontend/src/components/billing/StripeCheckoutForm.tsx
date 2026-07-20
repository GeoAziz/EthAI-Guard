'use client';
import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface StripeCheckoutFormProps {
  planKey: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function StripeCheckoutForm({
  planKey,
  amount,
  onSuccess,
  onError,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create payment intent on backend
      const paymentIntentRes = await api.post('/v1/billing/create-payment-intent', {
        plan: planKey,
        amount,
      });

      const { clientSecret } = paymentIntentRes.data;

      // 2. Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {},
        },
      });

      if (result.error) {
        setError(result.error.message || 'Payment failed');
        onError?.(result.error.message || 'Payment failed');
        return;
      }

      if (result.paymentIntent?.status === 'succeeded') {
        toast({
          title: 'Payment successful',
          description: 'Your plan has been updated',
          variant: 'success',
        });
        onSuccess?.();
      }
    } catch (err: any) {
      const message = err?.message || 'Payment processing failed';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-white dark:bg-slate-950">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
        <p className="font-semibold mb-1">Test Card Numbers:</p>
        <p>Success: 4242 4242 4242 4242</p>
        <p>Decline: 4000 0000 0000 0002</p>
        <p>CVC: any 3 digits | Date: any future date</p>
      </div>

      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
      >
        {loading ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
      </Button>
    </form>
  );
}
