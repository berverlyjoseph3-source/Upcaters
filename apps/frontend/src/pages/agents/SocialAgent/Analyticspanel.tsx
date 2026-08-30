// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/AnalyticsPanel.tsx
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Heart, Share2, MessageCircle, Eye, RefreshCw } from 'lucide-react';
import { PlatformSelector } from './PlatformSelector';

interface EngagementMetric {
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagementRate: number;
}

interface PostAnalytics {
  id: string;
  content: string;
  platform: string;
  publishedAt: Date;
  metrics: EngagementMetric;
}

export const AnalyticsPanel: React.FC = () => {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'facebook', 'x_twitter']);
  const [analytics, setAnalytics] = useState<PostAnalytics[]>([]);
  const [summary, setSummary] = useState<EngagementMetric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPlatforms, timeRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock analytics data
      const mockAnalytics: PostAnalytics[] = [
        {
          id: '1',
          content: 'Excited to announce our new product launch! #innovation',
          platform: 'linkedin',
          publishedAt: new Date(Date.now() - 3 * 86400000),
          metrics: { likes: 245, comments: 32, shares: 18, views: 3450, engagementRate: 4.2 },
        },
        {
          id: '2',
          content: 'Check out our latest blog post about AI trends...',
          platform: 'x_twitter',
          publishedAt: new Date(Date.now() - 5 * 86400000),
          metrics: { likes: 89, comments: 12, shares: 34, views: 2100, engagementRate: 3.1 },
        },
        {
          id: '3',
          content: 'Join us for a live webinar next week!',
          platform: 'facebook',
          publishedAt: new Date(Date.now() - 7 * 86400000),
          metrics: { likes: 156, comments: 45, shares: 23, views: 890, engagementRate: 5.2 },
        },
      ];
      const filtered = mockAnalytics.filter(a => selectedPlatforms.includes(a.platform));
      setAnalytics(filtered);
      // Calculate summary
      const total = filtered.reduce(
        (acc, p) => ({
          likes: acc.likes + p.metrics.likes,
          comments: acc.comments + p.metrics.comments,
          shares: acc.shares + p.metrics.shares,
          views: acc.views + p.metrics.views,
          engagementRate: acc.engagementRate + p.metrics.engagementRate,
        }),
        { likes: 0, comments: 0, shares: 0, views: 0, engagementRate: 0 }
      );
      const count = filtered.length || 1;
      setSummary({
        ...total,
        engagementRate: total.engagementRate / count,
      });
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <PlatformSelector selected={selectedPlatforms} onChange={setSelectedPlatforms} />
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-pink-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
          <button onClick={fetchAnalytics} className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Heart className="h-5 w-5 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatNumber(summary.likes)}</p>
            <p className="text-xs text-secondary-500">Likes</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <MessageCircle className="h-5 w-5 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatNumber(summary.comments)}</p>
            <p className="text-xs text-secondary-500">Comments</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Share2 className="h-5 w-5 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatNumber(summary.shares)}</p>
            <p className="text-xs text-secondary-500">Shares</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <Eye className="h-5 w-5 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatNumber(summary.views)}</p>
            <p className="text-xs text-secondary-500">Views</p>
          </div>
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
            <TrendingUp className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{summary.engagementRate.toFixed(1)}%</p>
            <p className="text-xs text-secondary-500">Engagement Rate</p>
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Recent Posts</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-700/50">
              <tr>
                <th className="px-4 py-2 text-left">Content</th>
                <th className="px-4 py-2 text-left">Platform</th>
                <th className="px-4 py-2 text-center">Likes</th>
                <th className="px-4 py-2 text-center">Comments</th>
                <th className="px-4 py-2 text-center">Shares</th>
                <th className="px-4 py-2 text-center">Views</th>
                <th className="px-4 py-2 text-center">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
              {analytics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-secondary-400">No data available</td>
                </tr>
              ) : (
                analytics.map(post => (
                  <tr key={post.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                    <td className="px-4 py-2 max-w-xs truncate">{post.content}</td>
                    <td className="px-4 py-2 capitalize">{post.platform}</td>
                    <td className="px-4 py-2 text-center">{formatNumber(post.metrics.likes)}</td>
                    <td className="px-4 py-2 text-center">{formatNumber(post.metrics.comments)}</td>
                    <td className="px-4 py-2 text-center">{formatNumber(post.metrics.shares)}</td>
                    <td className="px-4 py-2 text-center">{formatNumber(post.metrics.views)}</td>
                    <td className="px-4 py-2 text-center font-medium">{post.metrics.engagementRate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default Analyticspanel;
