// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/ScheduleManager.tsx
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit, Trash2, MoreVertical, Plus, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  mediaUrl?: string;
  scheduledAt: Date;
  status: 'scheduled' | 'processing' | 'published' | 'failed';
}

export const ScheduleManager: React.FC = () => {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockPosts: ScheduledPost[] = [
        {
          id: '1',
          platform: 'linkedin',
          content: 'Excited to announce our new product launch! #innovation',
          scheduledAt: new Date(Date.now() + 86400000),
          status: 'scheduled',
        },
        {
          id: '2',
          platform: 'x_twitter',
          content: 'Check out our latest blog post about AI trends...',
          scheduledAt: new Date(Date.now() + 172800000),
          status: 'scheduled',
        },
        {
          id: '3',
          platform: 'facebook',
          content: 'Join us for a live webinar next week!',
          mediaUrl: 'https://example.com/image.jpg',
          scheduledAt: new Date(Date.now() - 86400000),
          status: 'published',
        },
      ];
      setScheduledPosts(mockPosts);
    } catch (err) {
      setError('Failed to load scheduled posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setScheduledPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleEdit = (id: string) => {
    // Open edit modal – simplified for demo
    console.log('Edit post', id);
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      linkedin: 'bg-[#0077B5]',
      instagram: 'bg-[#E4405F]',
      facebook: 'bg-[#4267B2]',
      x_twitter: 'bg-[#1DA1F2]',
    };
    return colors[platform] || 'bg-secondary-500';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      scheduled: { label: 'Scheduled', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      published: { label: 'Published', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    return badges[status] || { label: status, className: 'bg-secondary-100' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-center">
        {error}
        <button onClick={fetchScheduledPosts} className="ml-2 underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex justify-between items-center">
        <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
          >
            List View
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'calendar' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''}`}
          >
            Calendar View
          </button>
        </div>
        <button onClick={fetchScheduledPosts} className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-3">
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-12 text-secondary-400">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No scheduled posts</p>
              <p className="text-sm">Create a post and schedule it for future publishing</p>
            </div>
          ) : (
            scheduledPosts.map(post => {
              const statusBadge = getStatusBadge(post.status);
              return (
                <div key={post.id} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${getPlatformColor(post.platform)} flex items-center justify-center text-white text-xs font-bold`}>
                        {post.platform.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-secondary-900 dark:text-white">{post.platform}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.className}`}>{statusBadge.label}</span>
                        </div>
                        <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-secondary-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(post.scheduledAt, 'MMM dd, yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(post.scheduledAt, 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(post.id)} className="p-1 rounded hover:bg-secondary-100" title="Edit">
                        <Edit className="h-4 w-4 text-secondary-500" />
                      </button>
                      <button onClick={() => handleDelete(post.id)} className="p-1 rounded hover:bg-red-100" title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Calendar View (simplified – would use a full calendar library in production) */}
      {view === 'calendar' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="text-center py-12 text-secondary-400">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Calendar view coming soon</p>
            <p className="text-sm">Switch to list view to manage scheduled posts</p>
          </div>
        </div>
      )}
    </div>
  );
};
export default ScheduleManager;
