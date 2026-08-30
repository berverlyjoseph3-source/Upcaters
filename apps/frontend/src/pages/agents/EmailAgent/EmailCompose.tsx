// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/EmailCompose.tsx
import React, { useState, useRef } from 'react';
import { X, Minimize2, Maximize2, Paperclip, Send } from 'lucide-react';

interface EmailComposeProps {
  onClose: () => void;
  onSend: (to: string, subject: string, body: string) => void;
  initialTo ? : string;
  initialSubject ? : string;
  initialBody ? : string;
}

export const EmailCompose: React.FC < EmailComposeProps > = ({
  onClose,
  onSend,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
}) => {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState < string | null > (null);
  const fileInputRef = useRef < HTMLInputElement > (null);
  
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  const handleSend = async () => {
    if (!to.trim()) {
      setError('Please enter at least one recipient');
      return;
    }
    const emails = to.split(',').map(e => e.trim());
    const invalid = emails.find(e => e && !validateEmail(e));
    if (invalid) {
      setError(`Invalid email address: ${invalid}`);
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    setError(null);
    setIsSending(true);
    try {
      await onSend(to, subject, body);
      onClose();
    } catch (err) {
      setError('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  const handleAttach = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`bg-white dark:bg-secondary-800 rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-2xl transition-all duration-300 ${
          isMinimized ? 'h-14 overflow-hidden' : 'h-auto max-h-[90vh] overflow-hidden flex flex-col'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary-100 dark:bg-secondary-700 rounded-t-xl cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
          <span className="font-medium text-secondary-900 dark:text-white">New Message</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
              className="p-1 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* To field */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">To</label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com (comma separated)"
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Subject field */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Body field */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Write your message here..."
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500 resize-y"
              />
            </div>

            {/* Error message */}
            {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</div>}

            {/* Attachment preview (simplified) */}
            <input type="file" ref={fileInputRef} className="hidden" multiple />

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleAttach}
                className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700"
              >
                <Paperclip className="h-4 w-4" />
                Attach
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex items-center gap-1 px-4 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : <>
                    <Send className="h-4 w-4" />
                    Send
                  </>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default EmailCompose;
