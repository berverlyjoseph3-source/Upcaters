// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/SupportTickets.tsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, AlertCircle, MessageSquare, User, Calendar, Flag, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { SupportTicket, TicketStatus, TicketPriority } from '../../types/admin.types';

const statusColors: Record < TicketStatus, string > = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const priorityColors: Record < TicketPriority, string > = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export const SupportTickets: React.FC = () => {
  const { tickets, ticketsLoading, ticketsError, fetchTickets, updateTicketStatus } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState < string > ('');
  const [priorityFilter, setPriorityFilter] = useState < string > ('');
  const [expandedTicket, setExpandedTicket] = useState < string | null > (null);
  const [replyText, setReplyText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    fetchTickets({
      status: statusFilter as TicketStatus || undefined,
      priority: priorityFilter as TicketPriority || undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit: 20,
    });
  }, [searchQuery, statusFilter, priorityFilter, currentPage, fetchTickets]);
  
  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    await updateTicketStatus(ticketId, status);
    await fetchTickets();
  };
  
  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    // await addTicketMessage(ticketId, replyText);
    setReplyText('');
    setExpandedTicket(null);
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };
  
  if (ticketsLoading && !tickets) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <button
          onClick={() => fetchTickets()}
          className="p-2 rounded-lg bg-white dark:bg-secondary-800 border border-secondary-200"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tickets List */}
      {ticketsError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-300">{ticketsError}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets?.data.map((ticket: SupportTicket) => (
            <div key={ticket.id} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-secondary-900 dark:text-white">{ticket.subject}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-secondary-500">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{ticket.userEmail}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(ticket.createdAt)}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{ticket.messages?.length || 0} messages</span>
                    </div>
                  </div>
                  {expandedTicket === ticket.id ? <ChevronUp className="h-5 w-5 text-secondary-400" /> : <ChevronDown className="h-5 w-5 text-secondary-400" />}
                </div>
              </div>

              {expandedTicket === ticket.id && (
                <div className="border-t border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
                  {/* Original Message */}
                  <div className="bg-secondary-50 dark:bg-secondary-700/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-secondary-500" />
                      <span className="text-sm font-medium text-secondary-900 dark:text-white">{ticket.userEmail}</span>
                      <span className="text-xs text-secondary-400">{formatDate(ticket.createdAt)}</span>
                    </div>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300">{ticket.message}</p>
                  </div>

                  {/* Messages Thread */}
                  {ticket.messages?.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-lg p-3 ${msg.isAdmin ? 'bg-primary-600 text-white' : 'bg-secondary-100 dark:bg-secondary-700'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{msg.userEmail}</span>
                          <span className="text-xs opacity-75">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply Box */}
                  <div className="flex gap-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      rows={3}
                      className="flex-1 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                    />
                    <button
                      onClick={() => handleReply(ticket.id)}
                      className="self-end px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </div>

                  {/* Status Actions */}
                  <div className="flex gap-2 pt-2 border-t border-secondary-200">
                    {ticket.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'resolved')}
                        className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {ticket.status === 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(ticket.id, 'open')}
                        className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(ticket.id, 'closed')}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {tickets?.data.length === 0 && (
            <div className="text-center py-12 text-secondary-500">No support tickets found</div>
          )}
        </div>
      )}
    </div>
  );
};
export default SupportTickets;
