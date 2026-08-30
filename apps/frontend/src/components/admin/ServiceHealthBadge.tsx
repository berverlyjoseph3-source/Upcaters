// enterprise-ai-agent-platform/apps/frontend/src/components/admin/ServiceHealthBadge.tsx
import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Server } from 'lucide-react';

interface ServiceHealthBadgeProps {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency ? : number;
  className ? : string;
}

const statusConfig = {
  healthy: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30',
    label: 'Operational',
  },
  degraded: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Degraded',
  },
  down: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Down',
  },
};

export const ServiceHealthBadge: React.FC < ServiceHealthBadgeProps > = ({ name, status, latency, className = '' }) => {
  const config = statusConfig[status];
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${config.bg} ${className}`}>
      <div className="flex items-center gap-2">
        <Server className="h-4 w-4 text-secondary-500" />
        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        {latency !== undefined && (
          <span className="text-xs text-secondary-500">{latency}ms</span>
        )}
        <div className={`flex items-center gap-1 ${config.color}`}>
          {config.icon}
          <span className="text-xs font-medium">{config.label}</span>
        </div>
      </div>
    </div>
  );
};
export default ServiceHealthBadge;
