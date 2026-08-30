// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/RealTimeIndicator.tsx
import React from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface RealTimeIndicatorProps {
  isConnected: boolean;
  lastUpdated: Date | null;
}

export const RealTimeIndicator: React.FC < RealTimeIndicatorProps > = ({ isConnected, lastUpdated }) => {
  const formatRelativeTime = (date: Date | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };
  
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-secondary-100 dark:bg-secondary-800 rounded-full text-sm">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-600 text-xs font-medium">LIVE</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-500 text-xs font-medium">OFFLINE</span>
          </>
        )}
      </div>
      <div className="w-px h-4 bg-secondary-300 dark:bg-secondary-600" />
      <div className="flex items-center gap-1.5 text-secondary-500 text-xs">
        <Clock className="h-3 w-3" />
        <span>Updated {formatRelativeTime(lastUpdated)}</span>
      </div>
    </div>
  );
};
export default RealTimeIndicator;
