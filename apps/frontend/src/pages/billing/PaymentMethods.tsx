// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/PaymentMethods.tsx
import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Star, AlertCircle } from 'lucide-react';
import { PaymentMethod } from '../../types/billing.types';

interface PaymentMethodsProps {
  paymentMethods: PaymentMethod[];
  onRefresh: () => void;
}

const getCardIcon = (brand ? : string) => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return '💳';
    case 'mastercard':
      return '💳';
    case 'amex':
      return '💳';
    default:
      return '💳';
  }
};

export const PaymentMethods: React.FC < PaymentMethodsProps > = ({ paymentMethods, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSetDefault = async (id: string) => {
    setIsLoading(true);
    try {
      // API call to set default payment method
      await new Promise(resolve => setTimeout(resolve, 500));
      onRefresh();
    } catch (err) {
      setError('Failed to set default payment method');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemove = async (id: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) return;
    setIsLoading(true);
    try {
      // API call to remove payment method
      await new Promise(resolve => setTimeout(resolve, 500));
      onRefresh();
    } catch (err) {
      setError('Failed to remove payment method');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddPaymentMethod = async () => {
    // Redirect to Stripe Customer Portal for adding payment method
    // This would be implemented with the manageSubscription action
    setIsAdding(true);
    try {
      // Call API to create portal session
      const response = await fetch('/api/billing/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError('Failed to open payment portal');
    } finally {
      setIsAdding(false);
    }
  };
  
  if (paymentMethods.length === 0) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-8 text-center">
        <CreditCard className="h-12 w-12 mx-auto text-secondary-400 mb-3" />
        <p className="text-secondary-900 dark:text-white font-medium">No payment methods</p>
        <p className="text-sm text-secondary-500 mt-1">Add a payment method to manage subscriptions</p>
        <button
          onClick={handleAddPaymentMethod}
          disabled={isAdding}
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm flex items-center gap-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          Add Payment Method
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {paymentMethods.map(method => (
        <div
          key={method.id}
          className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="text-2xl">{getCardIcon(method.brand)}</div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-secondary-900 dark:text-white">
                  {method.brand ? `${method.brand} ` : ''}•••• {method.last4}
                </p>
                {method.isDefault && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700">
                    <Star className="h-3 w-3" />
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary-500">
                Expires {method.expMonth}/{method.expYear}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!method.isDefault && (
              <button
                onClick={() => handleSetDefault(method.id)}
                disabled={isLoading}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-secondary-50"
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => handleRemove(method.id)}
              disabled={isLoading}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={handleAddPaymentMethod}
        disabled={isAdding}
        className="w-full py-3 border-2 border-dashed border-secondary-300 rounded-xl text-secondary-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add New Payment Method
      </button>
    </div>
  );
};
export default PaymentMethods;
