// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/ContentAgent.tsx
import React, { useState } from 'react';
import { Sparkles, Type, Image, Video, Settings, RefreshCw } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { TextGenerator } from './TextGenerator';
import { ImageGenerator } from './ImageGenerator';
import { VideoGenerator } from './VideoGenerator';

type GenerationType = 'text' | 'image' | 'video';

export const ContentAgent: React.FC = () => {
  const [activeTab, setActiveTab] = useState < GenerationType > ('text');
  const [isLoading, setIsLoading] = useState(false);
  
  const tabs = [
    { id: 'text', label: 'Text Generation', icon: <Type className="h-4 w-4" />, description: 'Generate articles, emails, code, and more' },
    { id: 'image', label: 'Image Generation', icon: <Image className="h-4 w-4" />, description: 'Create images from text descriptions' },
    { id: 'video', label: 'Video Generation', icon: <Video className="h-4 w-4" />, description: 'Generate short videos (Enterprise plan)' },
  ];
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Content Agent"
        description="Generate text, images, and videos using state-of-the-art AI models"
        icon={<Sparkles className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-purple-500 to-purple-600"
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
              onClick={() => setActiveTab(tab.id as GenerationType)}
              className={`
                flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tab.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300'
                }
              `}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content area */}
      <div className="flex-1">
        {activeTab === 'text' && <TextGenerator isLoading={isLoading} setIsLoading={setIsLoading} />}
        {activeTab === 'image' && <ImageGenerator isLoading={isLoading} setIsLoading={setIsLoading} />}
        {activeTab === 'video' && <VideoGenerator isLoading={isLoading} setIsLoading={setIsLoading} />}
      </div>
    </div>
  );
};
export default ContentAgent;
