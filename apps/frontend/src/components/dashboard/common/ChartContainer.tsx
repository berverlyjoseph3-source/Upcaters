// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/ChartContainer.tsx
import React, { ReactNode } from 'react';
import { Maximize2, Minimize2, Download, RefreshCw } from 'lucide-react';

interface ChartContainerProps {
  title: string;
  description ? : string;
  children: ReactNode;
  onRefresh ? : () => void;
  onExport ? : () => void;
  isLoading ? : boolean;
}

export const ChartContainer: React.FC < ChartContainerProps > = ({
  title,
  description,
  children,
  onRefresh,
  onExport,
  isLoading = false,
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const containerRef = React.useRef < HTMLDivElement > (null);
  
  React.useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);
  
  return (
    <div
      ref={containerRef}
      className={`
        bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5 shadow-sm
        transition-all duration-300
        ${isFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''}
      `}
    >
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white">{title}</h3>
          {description && (
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
              aria-label="Refresh chart"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onExport && (
            <button
              onClick={onExport}
              className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              aria-label="Export chart data"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className={isFullscreen ? 'min-h-[calc(100vh-180px)]' : ''}>
        {children}
      </div>
    </div>
  );
};
export default ChartContainer;
