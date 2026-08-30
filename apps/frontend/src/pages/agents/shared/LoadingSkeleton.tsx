// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/shared/LoadingSkeleton.tsx
import React from 'react';

interface LoadingSkeletonProps {
  type ? : 'card' | 'list' | 'detail' | 'table' | 'chart';
  count ? : number;
  className ? : string;
}

const CardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-secondary-200 dark:bg-secondary-700 rounded-lg"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4"></div>
        <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-full"></div>
        <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-2/3"></div>
      </div>
    </div>
  </div>
);

const ListSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 p-3 border-b border-secondary-200 dark:border-secondary-700 animate-pulse">
    <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-700 rounded-full"></div>
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2"></div>
      <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4"></div>
    </div>
  </div>
);

const DetailSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3"></div>
    <div className="space-y-3">
      <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-full"></div>
      <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-5/6"></div>
      <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-4/6"></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="h-24 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
      <div className="h-24 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
    </div>
  </div>
);

const TableSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="flex gap-4 mb-3">
      <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
      <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
      <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
      <div className="h-6 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
    </div>
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="flex gap-4 mb-2">
        <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
        <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
        <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
        <div className="h-10 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4"></div>
      </div>
    ))}
  </div>
);

const ChartSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 animate-pulse">
    <div className="h-5 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-secondary-200 dark:bg-secondary-700 rounded"></div>
  </div>
);

export const LoadingSkeleton: React.FC < LoadingSkeletonProps > = ({ type = 'card', count = 3, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return <CardSkeleton />;
      case 'list':
        return <ListSkeleton />;
      case 'detail':
        return <DetailSkeleton />;
      case 'table':
        return <TableSkeleton />;
      case 'chart':
        return <ChartSkeleton />;
      default:
        return <CardSkeleton />;
    }
  };
  
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="mb-3 last:mb-0">
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};
export default LoadingSkeleton;
