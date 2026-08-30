// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/SocialAgent.tsx
import React, { useState } from 'react';
import { Share2, Calendar, BarChart3, Settings, RefreshCw } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { PostComposer } from './PostComposer';
import { ScheduleManager } from './ScheduleManager';
import { AnalyticsPanel } from './AnalyticsPanel';

type SocialTab = 'compose' | 'schedule' | 'analytics';

export const SocialAgent: React.FC = () => {
  const [activeTab, setActiveTab] = useState < SocialTab > ('compose');
  const [isLoading, setIsLoading] = useState(false);
  
  const tabs = [
    { id: 'compose', label: 'Compose', icon: <Share2 className="h-4 w-4" />, description: 'Create and publish posts' },
    { id: 'schedule', label: 'Schedule', icon: <Calendar className="h-4 w-4" />, description: 'Plan future content' },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, description: 'Track engagement' },
  ];
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Social Agent"
        description="Post to LinkedIn, Instagram, Facebook, and X (Twitter) – schedule and analyze engagement"
        icon={<Share2 className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-pink-500 to-pink-600"
        actions={
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Settings className="h-5 w-5" />
          </button>
        }
      />

      {/* Tab navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700 mb-6">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SocialTab)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-pink-600 border-b-2 border-pink-600'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="text-xs text-secondary-400 hidden lg:inline">({tab.description})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1">
        {activeTab === 'compose' && <PostComposer isLoading={isLoading} setIsLoading={setIsLoading} />}
        {activeTab === 'schedule' && <ScheduleManager />}
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>
    </div>
  );
};
export default SocialAgent;
