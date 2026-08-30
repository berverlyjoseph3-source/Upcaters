// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/PostPreview.tsx
import React from 'react';
import { Linkedin, Instagram, Facebook, Twitter, Heart, MessageCircle, Share2 } from 'lucide-react';

interface PostPreviewProps {
  content: string;
  platform: string;
  mediaUrl ? : string;
}

const platformConfig = {
  linkedin: { icon: Linkedin, name: 'LinkedIn', color: 'text-[#0077B5]', bg: 'bg-[#0077B5]/10' },
  instagram: { icon: Instagram, name: 'Instagram', color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10' },
  facebook: { icon: Facebook, name: 'Facebook', color: 'text-[#4267B2]', bg: 'bg-[#4267B2]/10' },
  x_twitter: { icon: Twitter, name: 'X (Twitter)', color: 'text-[#1DA1F2]', bg: 'bg-[#1DA1F2]/10' },
};

export const PostPreview: React.FC < PostPreviewProps > = ({ content, platform, mediaUrl }) => {
  const config = platformConfig[platform as keyof typeof platformConfig] || platformConfig.linkedin;
  const Icon = config.icon;
  
  if (!content.trim() && !mediaUrl) {
    return (
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-6 text-center text-secondary-400">
        <p className="text-sm">Post preview will appear here</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-700/50 border-b border-secondary-200 dark:border-secondary-700 text-xs font-medium text-secondary-500">
        Live Preview
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-secondary-900 dark:text-white">AI Agent Platform</span>
              <span className="text-xs text-secondary-400">@{config.name.toLowerCase()}</span>
            </div>
            <p className="text-sm text-secondary-700 dark:text-secondary-300 mt-2 whitespace-pre-wrap">
              {content}
            </p>
            {mediaUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-secondary-200 dark:border-secondary-700">
                <img src={mediaUrl} alt="Preview" className="w-full h-auto max-h-64 object-cover" />
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-secondary-400">
              <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                <Heart className="h-4 w-4" />
                <span className="text-xs">Like</span>
              </button>
              <button className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">Comment</span>
              </button>
              <button className="flex items-center gap-1 hover:text-green-500 transition-colors">
                <Share2 className="h-4 w-4" />
                <span className="text-xs">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PostPreview;
