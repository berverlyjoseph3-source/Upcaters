// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/components/EmailThread.tsx
import React, { useState } from 'react';
import { Reply, Forward, Archive, Trash2, Star, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';

interface Email {
  id: string;
  from: { name: string;email: string };
  to: { name: string;email: string } [];
  subject: string;
  body: string;
  isStarred: boolean;
  receivedAt: Date;
}

interface EmailThreadProps {
  email: Email;
  onReply ? : () => void;
}

export const EmailThread: React.FC < EmailThreadProps > = ({ email, onReply }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const handleReply = () => {
    // API call to send reply
    console.log('Reply sent:', replyText);
    setShowReply(false);
    setReplyText('');
    onReply?.();
  };
  
  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">{email.subject}</h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-secondary-500">
            <span>{email.from.name} &lt;{email.from.email}&gt;</span>
            <span>to</span>
            <span>{email.to[0].email}</span>
          </div>
          <p className="text-xs text-secondary-400 mt-1">
            {format(email.receivedAt, 'PPPpp')}
          </p>
        </div>
        <div className="flex gap-1">
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Star className={`h-4 w-4 ${email.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </button>
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Archive className="h-4 w-4" />
          </button>
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Email body */}
      <div className="prose dark:prose-invert max-w-none mt-6 pb-6 border-b border-secondary-200 dark:border-secondary-700">
        <div dangerouslySetInnerHTML={{ __html: email.body }} />
      </div>

      {/* Reply section */}
      <div className="mt-6">
        <div className="flex gap-2">
          <button
            onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Reply className="h-4 w-4" />
            Reply
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors">
            <Forward className="h-4 w-4" />
            Forward
          </button>
        </div>

        {showReply && (
          <div className="mt-4 space-y-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
              className="w-full p-3 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Write your reply..."
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowReply(false)}
                className="px-3 py-1.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                className="px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
              >
                Send Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default EmailThread;
