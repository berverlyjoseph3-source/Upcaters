// enterprise-ai-agent-platform/apps/frontend/src/components/admin/BulkActions.tsx
import React from 'react';
import { CheckCircle, Ban, Trash2, X, Users } from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onActivate: () => void;
  onSuspend: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export const BulkActions: React.FC < BulkActionsProps > = ({
  selectedCount,
  onActivate,
  onSuspend,
  onDelete,
  onClear,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 px-4 py-3 flex items-center gap-4 animate-slide-in-bottom">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-600" />
          <span className="text-sm font-medium text-secondary-900 dark:text-white">
            {selectedCount} {selectedCount === 1 ? 'user' : 'users'} selected
          </span>
        </div>
        <div className="w-px h-6 bg-secondary-200 dark:bg-secondary-700" />
        <div className="flex gap-2">
          <button
            onClick={onActivate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            title="Activate selected users"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Activate
          </button>
          <button
            onClick={onSuspend}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            title="Suspend selected users"
          >
            <Ban className="h-3.5 w-3.5" />
            Suspend
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            title="Delete selected users"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
        <button
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          title="Clear selection"
        >
          <X className="h-4 w-4 text-secondary-500" />
        </button>
      </div>
    </div>
  );
};
export default BulkActions;
