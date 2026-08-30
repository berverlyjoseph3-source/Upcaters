// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/shared/AgentCard.tsx
import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AgentCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  path: string;
  isComingSoon ? : boolean;
  metrics ? : {
    label: string;
    value: string | number;
    trend ? : 'up' | 'down';
  } [];
}

export const AgentCard: React.FC < AgentCardProps > = ({
  id,
  name,
  description,
  icon,
  color,
  gradient,
  path,
  isComingSoon = false,
  metrics,
}) => {
  return (
    <div
      className={`
        group relative bg-white dark:bg-secondary-800 rounded-2xl overflow-hidden
        border border-secondary-200 dark:border-secondary-700
        transition-all duration-300 hover:shadow-xl hover:-translate-y-1
        ${isComingSoon ? 'opacity-75' : ''}
      `}
    >
      {/* Gradient background on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${gradient}`}
      />

      {/* Content */}
      <div className="relative p-6">
        {/* Icon with animated ring */}
        <div className="relative mb-4">
          <div className={`w-14 h-14 rounded-2xl ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            {icon}
          </div>
          {!isComingSoon && (
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </div>

        {/* Title and badge */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-secondary-900 dark:text-white">{name}</h3>
          {isComingSoon && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-400">
              Coming Soon
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-secondary-500 dark:text-secondary-400 text-sm mb-4 line-clamp-2">
          {description}
        </p>

        {/* Metrics row */}
        {metrics && metrics.length > 0 && (
          <div className="flex gap-3 mb-4 pt-2 border-t border-secondary-100 dark:border-secondary-700">
            {metrics.map((metric, idx) => (
              <div key={idx} className="flex-1">
                <p className="text-xs text-secondary-400">{metric.label}</p>
                <p className="text-lg font-semibold text-secondary-900 dark:text-white">
                  {metric.value}
                  {metric.trend && (
                    <span className={`ml-1 text-xs ${metric.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {metric.trend === 'up' ? '↑' : '↓'}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action button */}
        {!isComingSoon && (
          <Link
            to={path}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 group-hover:gap-3 transition-all"
          >
            Launch Agent
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={`h-1 w-full ${gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </div>
  );
};
export default AgentCard;
