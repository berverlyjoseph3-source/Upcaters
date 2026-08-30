// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/UpgradeModal.tsx
import React, { useState } from 'react';
import { X, CreditCard, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface UpgradeModalProps {
  planId: string;
  interval: 'month' | 'year';
  onClose: () => void;
  onConfirm: () => void;
}

const planDetails: Record < string, { name: string;color: string } > = {
  STARTER: { name: 'Starter', color: 'text-blue-600' },
  PROFESSIONAL: { name: 'Professional', color: 'text-purple-600' },
  ENTERPRISE: { name: 'Enterprise', color: 'text-orange-600' },
};

export const UpgradeModal: React.FC < UpgradeModalProps > = ({ planId, interval, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const plan = planDetails[planId] || { name: planId, color: 'text-primary-600' };
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process upgrade');
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Upgrade Plan</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              You are about to upgrade to the
            </p>
            <p className={`text-2xl font-bold mt-1 ${plan.color}`}>{plan.name} Plan</p>
            <p className="text-sm text-secondary-500 mt-1">
              Billed {interval === 'month' ? 'monthly' : 'annually'}
            </p>
          </div>

          <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-secondary-900 dark:text-white">What you'll get:</p>
            <ul className="space-y-1 text-sm text-secondary-600 dark:text-secondary-400">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Increased AI actions and API calls limits
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Access to premium features
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <p className="text-xs text-secondary-500 text-center">
            Your payment method will be charged immediately. You can cancel anytime.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Confirm Upgrade
          </button>
        </div>
      </div>
    </div>
  );
};
export default UpgradeModal;
