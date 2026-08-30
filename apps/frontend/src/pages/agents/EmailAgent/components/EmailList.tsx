// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/components/EmailList.tsx
import React from 'react';
import { Star, Clock, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  from: { name: string;email: string };
  subject: string;
  snippet: string;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: Date;
  attachments ? : boolean;
}

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export const EmailList: React.FC < EmailListProps > = ({ emails, selectedId, onSelect }) => {
  return (
    <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
      {emails.map(email => (
        <button
          key={email.id}
          onClick={() => onSelect(email.id)}
          className={`
            w-full text-left px-4 py-3 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-700/50
            ${selectedId === email.id ? 'bg-secondary-50 dark:bg-secondary-700/50' : ''}
            ${!email.isRead ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 pt-0.5">
              <Star
                className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-secondary-400'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline gap-2">
                <p className={`text-sm font-medium truncate ${!email.isRead ? 'text-secondary-900 dark:text-white' : 'text-secondary-700 dark:text-secondary-300'}`}>
                  {email.from.name}
                </p>
                <p className="text-xs text-secondary-400 flex-shrink-0">
                  {formatDistanceToNow(email.receivedAt, { addSuffix: true })}
                </p>
              </div>
              <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-secondary-900 dark:text-white' : 'text-secondary-600 dark:text-secondary-400'}`}>
                {email.subject}
              </p>
              <p className="text-xs text-secondary-500 truncate">{email.snippet}</p>
              {email.attachments && (
                <div className="mt-1">
                  <Paperclip className="h-3 w-3 text-secondary-400" />
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};
export default EmailList;
