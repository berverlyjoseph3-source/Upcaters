// enterprise-ai-agent-platform/apps/frontend/src/components/billing/PaymentMethodCard.tsx
import React, { useState } from 'react';
import { CreditCard, Trash2, Star, MoreVertical, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentMethod } from '../../types/billing.types';

interface PaymentMethodCardProps {
  paymentMethod: PaymentMethod;
  onSetDefault: (id: string) => Promise < void > ;
  onRemove: (id: string) => Promise < void > ;
  isProcessing ? : boolean;
}

const getCardBrandIcon = (brand ? : string): string => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return '💳 Visa';
    case 'mastercard':
      return '💳 Mastercard';
    case 'amex':
      return '💳 American Express';
    case 'discover':
      return '💳 Discover';
    default:
      return '💳 Card';
  }
};

const getCardBrandColor = (brand ? : string): string => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    case 'mastercard':
      return 'border-red-200 bg-red-50 dark:bg-red-900/20';
    case 'amex':
      return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
    default:
      return 'border-secondary-200 bg-secondary-50 dark:bg-secondary-800';
  }
};

const formatExpiry = (month ? : number, year ? : number): string => {
  if (!month || !year) return 'Expiry date unknown';
  return `Expires ${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
};

export const PaymentMethodCard: React.FC < PaymentMethodCardProps > = ({
  paymentMethod,
  onSetDefault,
  onRemove,
  isProcessing = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  
  const handleSetDefault = async () => {
    setIsSettingDefault(true);
    try {
      await onSetDefault(paymentMethod.id);
    } finally {
      setIsSettingDefault(false);
    }
  };
  
  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove this payment method ending in ${paymentMethod.last4}?`)) {
      return;
    }
    setIsRemoving(true);
    try {
      await onRemove(paymentMethod.id);
    } finally {
      setIsRemoving(false);
    }
  };
  
  const brandIcon = getCardBrandIcon(paymentMethod.brand);
  const cardColor = getCardBrandColor(paymentMethod.brand);
  
  return (
    <div className={`relative rounded-xl border p-4 transition-all ${cardColor} ${isProcessing ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white dark:bg-secondary-700 rounded-lg flex items-center justify-center shadow-sm">
            <CreditCard className="h-5 w-5 text-secondary-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-secondary-900 dark:text-white">{brandIcon}</p>
              {paymentMethod.isDefault && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                  <Star className="h-3 w-3" />
                  Default
                </span>
              )}
            </div>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              •••• {paymentMethod.last4}
            </p>
            <p className="text-xs text-secondary-500">
              {formatExpiry(paymentMethod.expMonth, paymentMethod.expYear)}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            disabled={isProcessing}
            className="p-1.5 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
          >
            <MoreVertical className="h-4 w-4 text-secondary-500" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700 z-20 overflow-hidden">
                {!paymentMethod.isDefault && (
                  <button
                    onClick={() => {
                      handleSetDefault();
                      setShowMenu(false);
                    }}
                    disabled={isSettingDefault}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                  >
                    {isSettingDefault ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-600 border-t-transparent" />
                    ) : (
                      <Star className="h-3 w-3" />
                    )}
                    Set as Default
                  </button>
                )}
                <button
                  onClick={() => {
                    handleRemove();
                    setShowMenu(false);
                  }}
                  disabled={isRemoving}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  {isRemoving ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isProcessing && (
        <div className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center">
          <div className="bg-white dark:bg-secondary-800 rounded-lg px-3 py-1.5 text-sm shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary-600 border-t-transparent" />
            Processing...
          </div>
        </div>
      )}
    </div>
  );
};
export default PaymentMethodCard;
