// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/components/EmailToolbar.tsx
import React from 'react';
import { Archive, Trash2, Mail, Star, Clock, RefreshCw, Filter, CheckSquare, Square } from 'lucide-react';

interface EmailToolbarProps {
  selectedCount: number;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onStar: () => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  isLoading ? : boolean;
}

export const EmailToolbar: React.FC < EmailToolbarProps > = ({
  selectedCount,
  onArchive,
  onDelete,
  onMarkRead,
  onMarkUnread,
  onStar,
  onRefresh,
  onSelectAll,
  onClearSelection,
  isAllSelected,
  isLoading = false,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50/50 dark:bg-secondary-800/50">
      <div className="flex items-center gap-1">
        <button
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
          aria-label={isAllSelected ? 'Clear selection' : 'Select all'}
        >
          {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        {selectedCount > 0 && (
          <span className="text-xs text-secondary-500 ml-1">{selectedCount} selected</span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {selectedCount > 0 ? (
          <>
            <button
              onClick={onArchive}
              className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onMarkRead}
              className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              title="Mark as read"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              onClick={onMarkUnread}
              className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              title="Mark as unread"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={onStar}
              className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
              title="Star"
            >
              <Star className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors" title="Filter">
              <Filter className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
export default EmailToolbar;
