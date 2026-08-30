// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/PostComposer.tsx
import React, { useState } from 'react';
import { Send, Calendar, Image, Link2, Hash, Sparkles, AlertCircle } from 'lucide-react';
import { PlatformSelector } from './PlatformSelector';
import { PostPreview } from './PostPreview';

interface PostComposerProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const PostComposer: React.FC < PostComposerProps > = ({ isLoading, setIsLoading }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState < string[] > (['linkedin']);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [error, setError] = useState < string | null > (null);
  const [aiEnhanced, setAiEnhanced] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  const characterLimits: Record < string, number > = {
    linkedin: 3000,
    instagram: 2200,
    facebook: 63206,
    x_twitter: 280,
  };
  
  const getRemainingChars = () => {
    const limit = Math.min(...selectedPlatforms.map(p => characterLimits[p] || 3000));
    return limit - content.length;
  };
  
  const remaining = getRemainingChars();
  const isOverLimit = remaining < 0;
  
  const handleAiEnhance = async () => {
    if (!content.trim()) {
      setError('Please enter some content to enhance');
      return;
    }
    setIsEnhancing(true);
    setError(null);
    try {
      // Simulate AI enhancement – replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setContent(prev => `${prev}\n\n✨ AI-enhanced: This content has been optimized for engagement. Consider adding relevant hashtags and a call-to-action.`);
      setAiEnhanced(true);
    } catch (err) {
      setError('Failed to enhance content');
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handlePost = async () => {
    if (!content.trim()) {
      setError('Please enter content to post');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform');
      return;
    }
    if (isOverLimit) {
      setError(`Content exceeds character limit for some platforms`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call to post to selected platforms
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Posting to:', selectedPlatforms, { content, mediaUrl, scheduledDate, scheduledTime });
      // Reset form on success
      setContent('');
      setMediaUrl('');
      setScheduledDate('');
      setScheduledTime('');
      alert('Post published successfully!');
    } catch (err) {
      setError('Failed to publish post');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      setError('Please select a date and time to schedule');
      return;
    }
    // Similar to handlePost but for scheduling
    handlePost();
  };
  
  return (
    <div className="space-y-6">
      {/* Platform selector */}
      <PlatformSelector selected={selectedPlatforms} onChange={setSelectedPlatforms} />

      {/* Content input */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Post Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="Write your post here... Use #hashtags and @mentions for better reach."
          className={`w-full px-4 py-3 rounded-xl border ${
            isOverLimit ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'
          } bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-pink-500`}
        />
        <div className="flex justify-between mt-2 text-xs">
          <div className="flex gap-3">
            <span className={`${remaining < 50 ? 'text-red-500' : 'text-secondary-400'}`}>
              {remaining} characters remaining
            </span>
            <button
              onClick={handleAiEnhance}
              disabled={isEnhancing || !content.trim()}
              className="flex items-center gap-1 text-pink-600 hover:text-pink-700 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {isEnhancing ? 'Enhancing...' : 'AI Enhance'}
            </button>
          </div>
          <div className="flex gap-2">
            <button className="p-1 rounded hover:bg-secondary-100" title="Add image">
              <Image className="h-4 w-4 text-secondary-400" />
            </button>
            <button className="p-1 rounded hover:bg-secondary-100" title="Add link">
              <Link2 className="h-4 w-4 text-secondary-400" />
            </button>
            <button className="p-1 rounded hover:bg-secondary-100" title="Add hashtag">
              <Hash className="h-4 w-4 text-secondary-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Media URL (optional) */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Media URL (optional)</label>
        <input
          type="text"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        />
      </div>

      {/* Scheduling (optional) */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-secondary-500" />
          <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Schedule Post (Optional)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
          <input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        {scheduledDate && scheduledTime ? (
          <button
            onClick={handleSchedule}
            disabled={isLoading || isOverLimit || selectedPlatforms.length === 0}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Calendar className="h-4 w-4" />}
            Schedule Post
          </button>
        ) : (
          <button
            onClick={handlePost}
            disabled={isLoading || isOverLimit || selectedPlatforms.length === 0}
            className="px-6 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            Post Now
          </button>
        )}
      </div>

      {/* Live preview */}
      <PostPreview content={content} platform={selectedPlatforms[0]} mediaUrl={mediaUrl} />
    </div>
  );
};
export default PostComposer;
