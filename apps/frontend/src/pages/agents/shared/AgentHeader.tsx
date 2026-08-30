// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/shared/AgentHeader.tsx
import React from 'react';
import { ArrowLeft, Sparkles, RefreshCw, Settings, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  actions ? : React.ReactNode;
  onRefresh ? : () => void;
  isLoading ? : boolean;
  backLink ? : string;
}

export const AgentHeader: React.FC < AgentHeaderProps > = ({
  title,
  description,
  icon,
  gradient,
  actions,
  onRefresh,
  isLoading = false,
  backLink = '/agents',
}) => {
  return (
    <div className="relative mb-8">
      {/* Gradient background */}
      <div className={`absolute inset-0 ${gradient} opacity-5 rounded-2xl`} />

      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 bg-white dark:bg-secondary-800 rounded-2xl border border-secondary-200 dark:border-secondary-700 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <Link
            to={backLink}
            className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            aria-label="Back to agents"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center text-white shadow-md`}>
            {icon}
          </div>

          {/* Title and description */}
          <div>
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
              {title}
              <Sparkles className="h-5 w-5 text-primary-500" />
            </h1>
            <p className="text-secondary-500 dark:text-secondary-400 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
            <HelpCircle className="h-5 w-5" />
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
};
export default AgentHeader;
