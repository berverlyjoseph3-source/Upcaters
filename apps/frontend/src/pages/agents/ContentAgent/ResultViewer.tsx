// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/ResultViewer.tsx
import React, { useState } from 'react';
import { Copy, Download, Check, Maximize2, Minimize2 } from 'lucide-react';

interface ResultViewerProps {
  content: string;
  type: 'text' | 'code';
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
}

export const ResultViewer: React.FC < ResultViewerProps > = ({
  content,
  type,
  onCopy,
  onDownload,
  copied,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  return (
    <div className={`relative bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden transition-all ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-secondary-50 dark:bg-secondary-700/50 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-secondary-500 uppercase tracking-wider">
            {type === 'code' ? 'Code Output' : 'Generated Content'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onCopy}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
            title="Download as file"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`p-4 overflow-auto ${isFullscreen ? 'h-[calc(100vh-60px)]' : 'max-h-96'}`}>
        {type === 'code' ? (
          <pre className="bg-secondary-900 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm">
            <code>{content}</code>
          </pre>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            {content.split('\n').map((line, i) => (
              <p key={i} className="mb-2">{line}</p>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-700/50 border-t border-secondary-200 dark:border-secondary-700 text-xs text-secondary-500 flex justify-between">
        <span>{content.length} characters</span>
        <span>{content.split(/\s+/).length} words</span>
        <span>~{Math.ceil(content.length / 4)} tokens</span>
      </div>
    </div>
  );
};
export default ResultViewer;
