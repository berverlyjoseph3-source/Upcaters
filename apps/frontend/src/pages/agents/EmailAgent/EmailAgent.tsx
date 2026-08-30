// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/EmailAgent.tsx
import React, { useState, useEffect } from 'react';
import { Mail, Inbox, Send, Archive, Star, Trash2, Settings, RefreshCw } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { EmailList } from './components/EmailList';
import { EmailThread } from './components/EmailThread';
import { EmailCompose } from './EmailCompose';
import { EmailToolbar } from './components/EmailToolbar';
import { EmailSettings } from './EmailSettings';

type View = 'inbox' | 'sent' | 'starred' | 'archive' | 'trash';

interface Email {
  id: string;
  from: { name: string;email: string };
  to: { name: string;email: string } [];
  subject: string;
  snippet: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  receivedAt: Date;
}

export const EmailAgent: React.FC = () => {
  const [currentView, setCurrentView] = useState < View > ('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState < string | null > (null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [emails, setEmails] = useState < Email[] > ([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  
  // Mock fetch emails – in production, replace with API call
  useEffect(() => {
    const fetchEmails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        // Mock data
        const mockEmails: Email[] = [
          {
            id: '1',
            from: { name: 'John Doe', email: 'john@example.com' },
            to: [{ name: 'Me', email: 'me@example.com' }],
            subject: 'Project Update',
            snippet: 'Here is the latest update on the project...',
            body: 'Full email body content here...',
            isRead: false,
            isStarred: true,
            labels: ['work'],
            receivedAt: new Date(),
          },
          {
            id: '2',
            from: { name: 'Sarah Johnson', email: 'sarah@example.com' },
            to: [{ name: 'Me', email: 'me@example.com' }],
            subject: 'Meeting Tomorrow',
            snippet: 'Just a reminder about our meeting...',
            body: 'Meeting details...',
            isRead: true,
            isStarred: false,
            labels: ['personal'],
            receivedAt: new Date(Date.now() - 86400000),
          },
          // Add more mock emails as needed
        ];
        setEmails(mockEmails);
      } catch (err) {
        setError('Failed to load emails');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmails();
  }, []);
  
  const handleRefresh = () => {
    // Re-fetch emails
    window.location.reload(); // simplistic; replace with actual refresh logic
  };
  
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
    // Mark as read logic would go here
  };
  
  const handleSendEmail = (to: string, subject: string, body: string) => {
    // API call to send email
    console.log('Send email:', { to, subject, body });
    setIsComposeOpen(false);
  };
  
  const selectedEmail = emails.find(e => e.id === selectedEmailId);
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Email Agent"
        description="Smart email management with AI-powered replies and organization"
        icon={<Mail className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        onRefresh={handleRefresh}
        isLoading={isLoading}
        actions={
          <>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Compose
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700"
            >
              <Settings className="h-5 w-5" />
            </button>
          </>
        }
      />

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-1">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox, count: emails.filter(e => !e.isRead).length },
            { id: 'sent', label: 'Sent', icon: Send, count: 0 },
            { id: 'starred', label: 'Starred', icon: Star, count: emails.filter(e => e.isStarred).length },
            { id: 'archive', label: 'Archive', icon: Archive, count: 0 },
            { id: 'trash', label: 'Trash', icon: Trash2, count: 0 },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id as View); setSelectedEmailId(null); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className="text-xs bg-secondary-200 dark:bg-secondary-600 px-1.5 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Email list */}
          <div className="w-96 flex-shrink-0 border-r border-secondary-200 dark:border-secondary-700 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 p-4">{error}</div>
            ) : (
              <EmailList
                emails={emails}
                selectedId={selectedEmailId}
                onSelect={handleEmailSelect}
                onRefresh={handleRefresh}
              />
            )}
          </div>

          {/* Email thread / detail */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmail ? (
              <EmailThread email={selectedEmail} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-secondary-400">
                <Mail className="h-12 w-12 mb-2 opacity-50" />
                <p>Select an email to read</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {isComposeOpen && (
        <EmailCompose
          onClose={() => setIsComposeOpen(false)}
          onSend={handleSendEmail}
        />
      )}

      {/* Settings modal */}
      {isSettingsOpen && (
        <EmailSettings onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  );
};
export default EmailAgent;
