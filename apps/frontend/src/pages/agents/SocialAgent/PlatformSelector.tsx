// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/SocialAgent/PlatformSelector.tsx
import React from 'react';
import { Linkedin, Instagram, Facebook, Twitter } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  connected ? : boolean;
}

const platforms: Platform[] = [
  { id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" />, color: 'bg-[#0077B5]', connected: true },
  { id: 'instagram', name: 'Instagram', icon: <Instagram className="h-5 w-5" />, color: 'bg-[#E4405F]', connected: false },
  { id: 'facebook', name: 'Facebook', icon: <Facebook className="h-5 w-5" />, color: 'bg-[#4267B2]', connected: true },
  { id: 'x_twitter', name: 'X (Twitter)', icon: <Twitter className="h-5 w-5" />, color: 'bg-[#1DA1F2]', connected: true },
];

interface PlatformSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const PlatformSelector: React.FC < PlatformSelectorProps > = ({ selected, onChange }) => {
  const togglePlatform = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Post to</label>
      <div className="flex flex-wrap gap-3">
        {platforms.map(platform => (
          <button
            key={platform.id}
            onClick={() => togglePlatform(platform.id)}
            disabled={!platform.connected}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all
              ${selected.includes(platform.id)
                ? `${platform.color} text-white shadow-md scale-105`
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200'
              }
              ${!platform.connected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={!platform.connected ? 'Connect account in Settings' : ''}
          >
            {platform.icon}
            <span className="text-sm font-medium">{platform.name}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-secondary-400 mt-2">
        {platforms.filter(p => !p.connected).map(p => p.name).join(', ')} require connection in Settings.
      </p>
    </div>
  );
};
export default PlatformSelector;
