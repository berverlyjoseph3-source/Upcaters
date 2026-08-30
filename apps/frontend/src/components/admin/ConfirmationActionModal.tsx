// enterprise-ai-agent-platform/apps/frontend/src/components/admin/ConfirmActionModal.tsx
import React, { useState } from 'react';
import { X, AlertTriangle, Ban, CheckCircle, Trash2, AlertCircle } from 'lucide-react';

interface ConfirmActionModalProps {
  action: 'suspend' | 'activate' | 'delete';
  userName: string;
  onClose: () => void;
  onConfirm: () => Promise < void > ;
}

const actionConfig = {
  suspend: {
    title: 'Suspend User',
    icon: <Ban className="h-6 w-6 text-yellow-600" />,
    message: (name: string) => `Are you sure you want to suspend ${name}?`,
    description: 'Suspended users will not be able to access the platform. Their data will be preserved.',
    confirmText: 'Suspend User',
    confirmColor: 'bg-yellow-600 hover:bg-yellow-700',
  },
  activate: {
    title: 'Activate User',
    icon: <CheckCircle className="h-6 w-6 text-green-600" />,
    message: (name: string) => `Are you sure you want to activate ${name}?`,
    description: 'Activated users will regain full access to the platform.',
    confirmText: 'Activate User',
    confirmColor: 'bg-green-600 hover:bg-green-700',
  },
  delete: {
    title: 'Delete User',
    icon: <Trash2 className="h-6 w-6 text-red-600" />,
    message: (name: string) => `Are you sure you want to permanently delete ${name}?`,
    description: 'This action cannot be undone. All user data will be permanently removed.',
    confirmText: 'Delete User',
    confirmColor: 'bg-red-600 hover:bg-red-700',
  },
};

export const ConfirmActionModal: React.FC < ConfirmActionModalProps > = ({
  action,
  userName,
  onClose,
  onConfirm,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const config = actionConfig[action];
  
  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} user`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            {config.icon}
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">{config.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-secondary-900 dark:text-white font-medium">
              {config.message(userName)}
            </p>
            <p className="text-sm text-secondary-500 mt-2">{config.description}</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50 ${config.confirmColor}`}
          >
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : config.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmationActionModal;
