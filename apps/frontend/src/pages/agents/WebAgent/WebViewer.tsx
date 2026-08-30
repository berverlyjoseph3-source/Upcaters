// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/WebViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';

interface WebViewerProps {
  url: string;
  title ? : string;
  onClose: () => void;
  onNavigate ? : (url: string) => void;
}

export const WebViewer: React.FC < WebViewerProps > = ({ url, title, onClose, onNavigate }) => {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState < string | null > (null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef < HTMLIFrameElement > (null);
  
  useEffect(() => {
    setCurrentUrl(url);
    setIsLoading(true);
    setError(null);
  }, [url]);
  
  const handleReload = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
      setIsLoading(true);
      setError(null);
    }
  };
  
  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank');
  };
  
  const handleIframeLoad = () => {
    setIsLoading(false);
  };
  
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load the webpage. Some sites block embedding.');
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const extractDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };
  
  return (
    <div
      className={`
        fixed inset-0 z-50 bg-white dark:bg-secondary-900 shadow-xl flex flex-col
        transition-all duration-300
        ${isFullscreen ? '' : 'top-10 left-10 right-10 bottom-10 rounded-xl'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-6 h-6 bg-teal-100 dark:bg-teal-900/30 rounded flex items-center justify-center">
            <Globe className="h-3 w-3 text-teal-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
              {title || extractDomain(currentUrl)}
            </p>
            <p className="text-xs text-secondary-500 truncate">{currentUrl}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            title="Reload"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            title="Open in browser"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-secondary-900/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-3"></div>
              <p className="text-sm text-secondary-500">Loading webpage...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-secondary-900 z-10">
            <div className="text-center max-w-md p-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <p className="text-secondary-900 dark:text-white font-medium mb-1">Unable to load page</p>
              <p className="text-sm text-secondary-500 mb-4">{error}</p>
              <button
                onClick={handleOpenExternal}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm"
              >
                Open in browser
              </button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentUrl}
          title={title || 'Web viewer'}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      </div>
    </div>
  );
};
export default WebViewer;
