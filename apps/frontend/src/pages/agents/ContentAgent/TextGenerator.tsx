// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/TextGenerator.tsx
import React, { useState } from 'react';
import { Copy, Download, RefreshCw, Sparkles, FileText, Code, Mail, MessageSquare } from 'lucide-react';
import { PromptInput } from './PromptInput';
import { ResultViewer } from './ResultViewer';

interface TextGeneratorProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

type TemplateType = 'general' | 'email' | 'code' | 'social';

const templates = [
  { id: 'general', label: 'General', icon: <FileText className="h-4 w-4" />, prompt: 'Write about...' },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, prompt: 'Write an email about...' },
  { id: 'code', label: 'Code', icon: <Code className="h-4 w-4" />, prompt: 'Write a function that...' },
  { id: 'social', label: 'Social Post', icon: <MessageSquare className="h-4 w-4" />, prompt: 'Write a social media post about...' },
];

export const TextGenerator: React.FC < TextGeneratorProps > = ({ isLoading, setIsLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState < TemplateType > ('general');
  const [result, setResult] = useState < string | null > (null);
  const [error, setError] = useState < string | null > (null);
  const [copied, setCopied] = useState(false);
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    model: 'gpt-4',
  });
  
  const handleTemplateClick = (templateId: TemplateType) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setPrompt(template.prompt);
    }
  };
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      // Simulate API call – replace with actual backend call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Mock response
      const mockResult = `# Generated Content\n\nBased on your prompt: "${prompt}"\n\nHere is the AI-generated content. This is a demonstration of the text generation capability. In production, this would be a real response from GPT-4 or Claude.\n\n## Key Points\n- First point about your topic\n- Second important insight\n- Third actionable recommendation\n\nThank you for using the Content Agent!`;
      setResult(mockResult);
    } catch (err) {
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => handleTemplateClick(template.id as TemplateType)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
              selectedTemplate === template.id
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-300'
            }`}
          >
            {template.icon}
            {template.label}
          </button>
        ))}
      </div>

      {/* Parameters */}
      <div className="bg-secondary-50 dark:bg-secondary-800/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Generation Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Temperature ({parameters.temperature})</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={parameters.temperature}
              onChange={(e) => setParameters({ ...parameters, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-secondary-400 mt-1">Higher = more creative</p>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Max Tokens</label>
            <select
              value={parameters.maxTokens}
              onChange={(e) => setParameters({ ...parameters, maxTokens: parseInt(e.target.value) })}
              className="w-full px-2 py-1 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value={500}>500 tokens</option>
              <option value={1000}>1000 tokens</option>
              <option value={2000}>2000 tokens</option>
              <option value={4000}>4000 tokens</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-secondary-500 mb-1">Model</label>
            <select
              value={parameters.model}
              onChange={(e) => setParameters({ ...parameters, model: e.target.value })}
              className="w-full px-2 py-1 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="gpt-4">GPT-4 (Best quality)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
              <option value="claude-3">Claude 3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompt input */}
      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleGenerate}
        isLoading={isLoading}
        placeholder="Describe what you want to generate..."
      />

      {/* Error display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Result viewer */}
      {result && (
        <ResultViewer
          content={result}
          type="text"
          onCopy={handleCopy}
          onDownload={handleDownload}
          copied={copied}
        />
      )}

      {/* Info note */}
      <div className="text-center text-xs text-secondary-400">
        Powered by GPT-4, Claude, and Gemini. Content may be moderated for safety.
      </div>
    </div>
  );
};
export default TextGenerator;
