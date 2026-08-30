// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/ContentAgent/PromptInput.tsx
import React, { useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  placeholder ? : string;
}

export const PromptInput: React.FC < PromptInputProps > = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  placeholder = "Describe what you want to generate...",
}) => {
  const textareaRef = useRef < HTMLTextAreaElement > (null);
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSubmit();
      }
    }
  };
  
  return (
    <div className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 pr-24 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          disabled={isLoading}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <div className="text-xs text-secondary-400 hidden sm:block">
            {isLoading ? 'Generating...' : 'Ctrl+Enter to send'}
          </div>
          <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            className={`
              flex items-center justify-center w-8 h-8 rounded-lg transition-colors
              ${isLoading || !value.trim()
                ? 'bg-secondary-200 text-secondary-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
              }
            `}
            aria-label="Generate"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2 text-xs text-secondary-400">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          <span>AI-powered generation</span>
        </div>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
};
export default PromptInput;
