// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/SearchPanel.tsx
import React, { useState } from 'react';
import { Search, Globe, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchPanelProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ isLoading, setIsLoading }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchProvider, setSearchProvider] = useState<'brave' | 'perplexity'>('brave');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call – replace with actual backend
      await new Promise(resolve => setTimeout(resolve, 1200));
      const mockResults: SearchResult[] = [
        {
          id: '1',
          title: `${query} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
          snippet: `This page provides comprehensive information about ${query}.`,
          source: 'Wikipedia',
        },
        {
          id: '2',
          title: `Latest news about ${query}`,
          url: `https://example.com/news/${encodeURIComponent(query)}`,
          snippet: `Breaking news and updates about ${query}.`,
          source: 'News Site',
        },
        {
          id: '3',
          title: `${query} - Official Site`,
          url: `https://example.com/${encodeURIComponent(query)}`,
          snippet: `Official website for ${query}.`,
          source: 'Official',
        },
      ];
      setResults(mockResults);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search the web..."
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={searchProvider}
          onChange={(e) => setSearchProvider(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
        >
          <option value="brave">Brave Search</option>
          <option value="perplexity">Perplexity AI</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-secondary-500">Found {results.length} results</p>
          {results.map(result => (
            <div key={result.id} className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 hover:shadow-md transition-shadow">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-secondary-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-base font-medium text-teal-600 dark:text-teal-400 hover:underline">
                      {result.title}
                    </h3>
                    <p className="text-sm text-secondary-500 mt-1">{result.url}</p>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300 mt-2">{result.snippet}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-secondary-400">
                      <span>{result.source}</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}

      {!isLoading && results.length === 0 && query && !error && (
        <div className="text-center py-12 text-secondary-400">
          <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No results found. Try a different search term.</p>
        </div>
      )}
    </div>
  );
};
export default SearchPanel;
