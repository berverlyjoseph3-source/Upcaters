// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/EmailInbox.tsx
import React, { useState, useEffect } from 'react';
import { EmailList } from './components/EmailList';
import { EmailThread } from './components/EmailThread';
import { EmailToolbar } from './components/EmailToolbar';
import { EmailCompose } from './EmailCompose';
import { Inbox, Send, Star, Archive, Trash2, Search } from 'lucide-react';

interface Email {
  id: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  subject: string;
  snippet: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  receivedAt: Date;
  attachments?: boolean;
}

interface EmailInboxProps {
  initialView?: 'inbox' | 'sent' | 'starred' | 'archive' | 'trash';
  onCompose?: () => void;
}

export const EmailInbox: React.FC<EmailInboxProps> = ({ initialView = 'inbox', onCompose }) => {
  const [currentView, setCurrentView] = useState(initialView);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmails();
  }, [currentView, searchQuery]);

  const fetchEmails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockEmails: Email[] = [
        {
          id: '1',
          from: { name: 'John Doe', email: 'john@example.com' },
          to: [{ name: 'Me', email: 'me@example.com' }],
          subject: 'Project Update',
          snippet: 'Here is the latest update on the project...',
          body: '<p>Full email body content here...</p>',
          isRead: false,
          isStarred: true,
          labels: ['work'],
          receivedAt: new Date(),
          attachments: true,
        },
        {
          id: '2',
          from: { name: 'Sarah Johnson', email: 'sarah@example.com' },
          to: [{ name: 'Me', email: 'me@example.com' }],
          subject: 'Meeting Tomorrow',
          snippet: 'Just a reminder about our meeting...',
          body: '<p>Meeting details...</p>',
          isRead: true,
          isStarred: false,
          labels: ['personal'],
          receivedAt: new Date(Date.now() - 86400000),
        },
        {
          id: '3',
          from: { name: 'Marketing Team', email: 'marketing@example.com' },
          to: [{ name: 'Me', email: 'me@example.com' }],
          subject: 'Newsletter',
          snippet: 'Check out our latest offers...',
          body: '<p>Promotional content...</p>',
          isRead: true,
          isStarred: false,
          labels: ['promotions'],
          receivedAt: new Date(Date.now() - 172800000),
        },
      ];
      // Filter based on view
      let filtered = mockEmails;
      if (currentView === 'starred') filtered = filtered.filter(e => e.isStarred);
      if (currentView === 'sent') filtered = []; // would fetch sent emails
      if (currentView === 'archive') filtered = [];
      if (currentView === 'trash') filtered = [];
      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(e =>
          e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.snippet.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setEmails(filtered);
    } catch (err) {
      setError('Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => fetchEmails();

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    // Mark as read
    setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map(e => e.id)));
    }
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleArchive = () => {
    // API call to archive selected emails
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  };

  const handleDelete = () => {
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  };

  const handleMarkRead = () => {
    setEmails(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, isRead: true } : e));
    setSelectedIds(new Set());
  };

  const handleMarkUnread = () => {
    setEmails(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, isRead: false } : e));
    setSelectedIds(new Set());
  };

  const handleStar = () => {
    setEmails(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, isStarred: !e.isStarred } : e));
    setSelectedIds(new Set());
  };

  const handleSendEmail = async (to: string, subject: string, body: string) => {
    // API call to send email
    console.log('Sending email:', { to, subject, body });
    setIsComposeOpen(false);
    // Optionally refresh inbox or show success
  };

  const selectedEmail = emails.find(e => e.id === selectedEmailId);

  const sidebarItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: emails.filter(e => !e.isRead).length },
    { id: 'sent', label: 'Sent', icon: Send, count: 0 },
    { id: 'starred', label: 'Starred', icon: Star, count: emails.filter(e => e.isStarred).length },
    { id: 'archive', label: 'Archive', icon: Archive, count: 0 },
    { id: 'trash', label: 'Trash', icon: Trash2, count: 0 },
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      {/* Search and compose header */}
      <div className="p-3 border-b border-secondary-200 dark:border-secondary-700 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium"
        >
          Compose
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-secondary-200 dark:border-secondary-700 p-2 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id as any); setSelectedEmailId(null); setSelectedIds(new Set()); }}
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

        {/* Email list area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <EmailToolbar
            selectedCount={selectedIds.size}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            onStar={handleStar}
            onRefresh={handleRefresh}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            isAllSelected={selectedIds.size === emails.length && emails.length > 0}
            isLoading={isLoading}
          />
          <div className="flex-1 overflow-y-auto">
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
                onSelect={handleSelectEmail}
                selectedIds={selectedIds}
                onToggleSelect={(id) => {
                  const newSet = new Set(selectedIds);
                  if (newSet.has(id)) newSet.delete(id);
                  else newSet.add(id);
                  setSelectedIds(newSet);
                }}
              />
            )}
          </div>
        </div>

        {/* Email detail panel */}
        <div className="w-96 flex-shrink-0 border-l border-secondary-200 dark:border-secondary-700 overflow-y-auto">
          {selectedEmail ? (
            <EmailThread email={selectedEmail} onReply={() => setIsComposeOpen(true)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary-400 p-6 text-center">
              <Inbox className="h-12 w-12 mb-2 opacity-50" />
              <p>Select an email to read</p>
            </div>
          )}
        </div>
      </div>

      {isComposeOpen && (
        <EmailCompose
          onClose={() => setIsComposeOpen(false)}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
};
export default EmailInbox;
