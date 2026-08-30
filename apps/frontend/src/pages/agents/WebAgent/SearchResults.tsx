// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/SearchResults.tsx
import React from 'react';
import { Globe, ExternalLink, Calendar, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt ? : Date;
  author ? : string;
  thumbnail ? : string;
}

interface SearchResultsProps {
  results: SearchResultItem[];
  isLoading ? : boolean;
  onResultClick ? : (result: SearchResultItem) => void;
  className ? : string;
}

export const SearchResults: React.FC < SearchResultsProps > = ({
  results,
  isLoading = false,
  onResultClick,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-secondary-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-secondary-200 rounded w-full mb-1"></div>
            <div className="h-3 bg-secondary-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }
  
  if (results.length === 0) {
    return (
      <div className={`text-center py-8 text-secondary-400 ${className}`}>
        <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No results found</p>
        <p className="text-sm">Try a different search term</p>
      </div>
    );
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-secondary-500">About {results.length} results</p>
      {results.map(result => (
        <div
          key={result.id}
          className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onResultClick?.(result)}
        >
          <div className="flex items-start gap-3">
            {result.thumbnail && (
              <img src={result.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-secondary-500">{result.source}</span>
                {result.publishedAt && (
                  <span className="text-xs text-secondary-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDistanceToNow(result.publishedAt, { addSuffix: true })}
                  </span>
                )}
                {result.author && (
                  <span className="text-xs text-secondary-400 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {result.author}
                  </span>
                )}
              </div>
              <h3 className="text-base font-medium text-primary-600 dark:text-primary-400 hover:underline mt-1">
                {result.title}
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-300 mt-1 line-clamp-2">
                {result.snippet}
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-secondary-400">
                <Globe className="h-3 w-3" />
                <span className="truncate">{result.url}</span>
                <ExternalLink className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default SearchResults;
