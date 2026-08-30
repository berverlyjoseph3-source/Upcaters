// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/InitiativeTracker.tsx
import React from 'react';
import { CheckCircle, Clock, AlertCircle, Target } from 'lucide-react';

interface Initiative {
  name: string;
  progress: number;
  status: string;
}

interface InitiativeTrackerProps {
  initiatives: Initiative[];
}

const statusConfig = {
  'Complete': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  'On Track': { icon: Target, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  'At Risk': { icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  'Delayed': { icon: Clock, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export const InitiativeTracker: React.FC < InitiativeTrackerProps > = ({ initiatives }) => {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Strategic Initiative Tracker</h3>
      <div className="space-y-4">
        {initiatives.map((initiative, idx) => {
          const status = initiative.status as keyof typeof statusConfig;
          const StatusIcon = statusConfig[status]?.icon || AlertCircle;
          const statusColor = statusConfig[status]?.color || 'text-secondary-600';
          const statusBg = statusConfig[status]?.bg || 'bg-secondary-100 dark:bg-secondary-700';

          return (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-secondary-900 dark:text-white">{initiative.name}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBg} ${statusColor}`}>
                    <StatusIcon className="h-3 w-3" />
                    {initiative.status}
                  </span>
                </div>
                <span className="text-sm text-secondary-600">{initiative.progress}%</span>
              </div>
              <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-500"
                  style={{ width: `${initiative.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default InitiativeTracker;
