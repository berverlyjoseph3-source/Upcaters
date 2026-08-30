// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/WebAgent.tsx
import React, { useState } from 'react';
import { Globe, Search, CloudRain, Newspaper, Sparkles, Settings } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { SearchPanel } from './SearchPanel';
import { WeatherWidget } from './WeatherWidget';
import { ResearchView } from './ResearchView';

type WebTab = 'search' | 'weather' | 'news' | 'research';

export const WebAgent: React.FC = () => {
  const [activeTab, setActiveTab] = useState < WebTab > ('search');
  const [isLoading, setIsLoading] = useState(false);
  
  const tabs = [
    { id: 'search', label: 'Web Search', icon: <Search className="h-4 w-4" />, description: 'Search the web with Brave/Perplexity' },
    { id: 'weather', label: 'Weather', icon: <CloudRain className="h-4 w-4" />, description: 'Current weather and forecast' },
    { id: 'news', label: 'News', icon: <Newspaper className="h-4 w-4" />, description: 'Latest headlines' },
    { id: 'research', label: 'Deep Research', icon: <Sparkles className="h-4 w-4" />, description: 'AI-powered research (Perplexity)' },
  ];
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Web Agent"
        description="Web search, research, weather, and data extraction"
        icon={<Globe className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-teal-500 to-teal-600"
        actions={
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <Settings className="h-5 w-5" />
          </button>
        }
      />

      {/* Tab navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700 mb-6">
        <nav className="flex gap-1 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WebTab)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-teal-600 border-b-2 border-teal-600'
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
        {activeTab === 'search' && <SearchPanel isLoading={isLoading} setIsLoading={setIsLoading} />}
        {activeTab === 'weather' && <WeatherWidget />}
        {activeTab === 'news' && <div className="text-center text-secondary-500 py-12">News feature coming soon</div>}
        {activeTab === 'research' && <ResearchView isLoading={isLoading} setIsLoading={setIsLoading} />}
      </div>
    </div>
  );
};
export default WebAgent;
