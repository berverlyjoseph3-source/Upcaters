// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/ResearchView.tsx
import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, ExternalLink, BookOpen } from 'lucide-react';

interface ResearchResult {
  answer: string;
  sources: Array < { title: string;url: string } > ;
  followUpQuestions: string[];
}

interface ResearchViewProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const ResearchView: React.FC < ResearchViewProps > = ({ isLoading, setIsLoading }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState < ResearchResult | null > (null);
  const [error, setError] = useState < string | null > (null);
  
  const handleResearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Simulate Perplexity API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: ResearchResult = {
        answer: `Based on comprehensive analysis, ${query} is a rapidly evolving field. Key findings include:

1. Significant growth in adoption across industries.
2. Emerging trends point toward increased automation and personalization.
3. Experts recommend focusing on ethical implementation and data quality.

Further research may uncover more specific insights depending on your use case.`,
        sources: [
          { title: 'Industry Report 2024', url: 'https://example.com/report' },
          { title: 'Academic Study on AI Trends', url: 'https://example.com/study' },
          { title: 'Expert Interview Summary', url: 'https://example.com/interview' },
        ],
        followUpQuestions: [
          `What are the main challenges in implementing ${query}?`,
          `How does ${query} compare to traditional methods?`,
          `What is the future outlook for ${query}?`,
        ],
      };
      setResult(mockResult);
    } catch (err) {
      setError('Research failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-teal-200">
        <div className="flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-teal-600" />
          <div>
            <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-300">Perplexity AI Research</h3>
            <p className="text-xs text-teal-600 dark:text-teal-400">Deep research with citations and follow-up questions</p>
          </div>
        </div>
      </div>

      {/* Query input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleResearch()}
            placeholder="Enter a research question... (e.g., 'What are the latest trends in renewable energy?')"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={handleResearch}
          disabled={isLoading || !query.trim()}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg self-start disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Research
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="text-secondary-500">Researching with AI...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {result && !isLoading && (
        <div className="space-y-6">
          {/* Answer */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-teal-600" />
              <h3 className="text-lg font-semibold">AI-Generated Answer</h3>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              {result.answer.split('\n').map((para, idx) => (
                <p key={idx} className="mb-3">{para}</p>
              ))}
            </div>
          </div>

          {/* Sources */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-sm font-semibold mb-3">Sources</h3>
            <ul className="space-y-2">
              {result.sources.map((source, idx) => (
                <li key={idx}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline flex items-center gap-1">
                    {source.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Follow-up questions */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-sm font-semibold mb-3">Suggested Follow-ups</h3>
            <div className="flex flex-wrap gap-2">
              {result.followUpQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(q)}
                  className="px-3 py-1.5 bg-secondary-100 hover:bg-secondary-200 rounded-full text-sm transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ResearchView;
