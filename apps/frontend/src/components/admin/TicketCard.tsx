// enterprise-ai-agent-platform/apps/frontend/src/components/admin/TicketCard.tsx
import React, { useState } from 'react';
import { User, Calendar, MessageSquare, Flag, ChevronDown, ChevronUp, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SupportTicket, TicketStatus, TicketPriority } from '../../types/admin.types';

interface TicketCardProps {
  ticket: SupportTicket;
  onStatusChange: (ticketId: string, status: TicketStatus) => Promise<void>;
  onReply: (ticketId: string, message: string) => Promise<void>;
  isSelected?: boolean;
  onSelect?: (ticketId: string) => void;
}

type StatusColorConfig = {
  bg: string;
  text: string;
  icon: React.ReactNode;
};

const statusColors: Record<TicketStatus, StatusColorConfig> = {
  open: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: React.createElement(Clock, { className: "h-3 w-3" })
  },
  in_progress: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    icon: React.createElement(MessageSquare, { className: "h-3 w-3" })
  },
  resolved: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-400',
    icon: React.createElement(CheckCircle, { className: "h-3 w-3" })
  },
  closed: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-400',
    icon: React.createElement(XCircle, { className: "h-3 w-3" })
  },
};

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString();
};

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onStatusChange,
  onReply,
  isSelected = false,
  onSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const status = statusColors[ticket.status];
  const priorityColor = priorityColors[ticket.priority];
  
  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      await onReply(ticket.id, replyText);
      setReplyText('');
    } finally {
      setIsReplying(false);
    }
  };
  
  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    await onStatusChange(ticket.id, newStatus);
  };
  
  return (
    <div className={`bg-white dark:bg-secondary-800 rounded-xl border transition-all ${
      isSelected 
        ? 'border-primary-500 ring-2 ring-primary-500' : 'border-secondary-200 dark:border-secondary-700'}`}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-secondary-900 dark:text-white">{ticket.subject}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                {status.icon}
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor}`}>
                <Flag className="h-3 w-3" />
                {ticket.priority.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-secondary-500">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {ticket.userEmail}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(ticket.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {ticket.messages?.length || 0} messages
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelect(ticket.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-secondary-300"
              />
            )}
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-secondary-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-secondary-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
          {/* Original Message */}
          <div className="bg-secondary-50 dark:bg-secondary-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-secondary-500" />
              <span className="text-sm font-medium text-secondary-900 dark:text-white">{ticket.userEmail}</span>
              <span className="text-xs text-secondary-400">{formatDate(ticket.createdAt)}</span>
            </div>
            <p className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">{ticket.message}</p>
          </div>

          {/* Message Thread */}
          {ticket.messages && ticket.messages.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {ticket.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.isAdmin 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-secondary-100 dark:bg-secondary-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">{msg.userEmail}</span>
                      <span className="text-xs opacity-75">{formatDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply Box */}
          <div className="flex gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="flex-1 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 resize-none"
            />
            <button
              onClick={handleReply}
              disabled={isReplying || !replyText.trim()}
              className="self-end px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isReplying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send
            </button>
          </div>

          {/* Status Actions */}
          <div className="flex gap-2 pt-2 border-t border-secondary-200 dark:border-secondary-700">
            {ticket.status !== 'resolved' && (
              <button
                onClick={() => handleStatusUpdate('resolved')}
                className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Mark Resolved
              </button>
            )}
            {ticket.status === 'resolved' && (
              <button
                onClick={() => handleStatusUpdate('open')}
                className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
              >
                Reopen
              </button>
            )}
            {ticket.status !== 'in_progress' && ticket.status !== 'resolved' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Start Progress
              </button>
            )}
            <button
              onClick={() => handleStatusUpdate('closed')}
              className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketCard;
