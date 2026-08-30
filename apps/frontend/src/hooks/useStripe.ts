// enterprise-ai-agent-platform/apps/frontend/src/hooks/useStripe.ts
import { useState, useCallback } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise < Stripe | null > | null = null;

export const useStripe = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const getStripe = useCallback(async () => {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      throw new Error('Stripe publishable key not configured');
    }
    if (!stripePromise) {
      stripePromise = loadStripe(publishableKey);
    }
    return stripePromise;
  }, []);
  
  const redirectToCheckout = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const stripe = await getStripe();
      if (!stripe) throw new Error('Failed to load Stripe');
      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redirect to checkout');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getStripe]);
  
  const handlePaymentMethodSetup = useCallback(async (clientSecret: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const stripe = await getStripe();
      if (!stripe) throw new Error('Failed to load Stripe');
      const { error, setupIntent } = await stripe.confirmSetupIntent({
        clientSecret,
        redirect: 'if_required',
      });
      if (error) throw error;
      return setupIntent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup payment method');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getStripe]);
  
  return {
    getStripe,
    redirectToCheckout,
    handlePaymentMethodSetup,
    isLoading,
    error,
  };
};