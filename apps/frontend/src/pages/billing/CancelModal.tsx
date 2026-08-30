// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/CancelModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

interface CancelModalProps {
  planName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const CancelModal: React.FC < CancelModalProps > = ({ planName, onClose, onConfirm }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const [reason, setReason] = useState('');
  
  const handleConfirm = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Cancel Subscription</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              You are about to cancel your
            </p>
            <p className="text-xl font-bold text-red-600 mt-1">{planName} Plan</p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              ⚠️ Cancelling will downgrade you to the Free plan. You will lose access to premium features immediately.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Reason for cancelling (optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="">Select a reason...</option>
              <option value="too_expensive">Too expensive</option>
              <option value="missing_features">Missing features I need</option>
              <option value="not_using">Not using enough</option>
              <option value="technical_issues">Technical issues</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <p className="text-xs text-secondary-500 text-center">
            You can reactivate your subscription at any time before the period ends.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50 disabled:opacity-50"
          >
            Keep Plan
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              'Confirm Cancellation'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CancelModal;
