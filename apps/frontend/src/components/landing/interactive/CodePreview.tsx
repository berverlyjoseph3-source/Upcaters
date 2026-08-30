// ============================================
// apps/frontend/src/components/landing/interactive/CodePreview.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  CheckCircle,
  Copy,
  Terminal,
  Sparkles,
  ArrowRight,
  Play,
  Eye,
  Code2,
  FileCode,
  ChevronRight,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type CodeLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'json'
  | 'bash'
  | 'yaml'
  | 'tsx'
  | 'jsx'
  | 'css'
  | 'html';

type CodeTheme = 'dark' | 'darker' | 'midnight';

type AnimationStyle = 'typewriter' | 'fade-in' | 'slide-up' | 'none';

type CodeBlock = {
  id: string;
  code: string;
  language: CodeLanguage;
  label?: string;
  highlight?: { startLine: number; endLine: number };
  comment?: string;
};

interface CodePreviewProps {
  /** Code blocks to display (supports tab switching) */
  blocks?: CodeBlock[];
  /** Single code string (for simple usage) */
  code?: string;
  /** Language for single code string */
  language?: CodeLanguage;
  /** File name shown in the header */
  fileName?: string;
  /** Whether to show the file header */
  showHeader?: boolean;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Animation style */
  animation?: AnimationStyle;
  /** Animation speed in ms per character (typewriter) */
  animationSpeed?: number;
  /** Whether to highlight specific lines */
  highlightedLines?: number[];
  /** Background theme */
  theme?: CodeTheme;
  /** Whether to show the copy button */
  showCopy?: boolean;
  /** Whether to show the terminal-style prompt */
  terminalStyle?: boolean;
  /** Maximum height before scrolling */
  maxHeight?: number | string;
  /** Action button (e.g., "Try it yourself") */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Gradient border effect */
  gradientBorder?: boolean;
  /** Whether to pulse the code (AI feel) */
  pulsingEffect?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. LANGUAGE SYNTAX HIGHLIGHTING (Map)
// ============================================

const LANGUAGE_CONFIG: Record<CodeLanguage, {
  label: string;
  icon: React.ReactNode;
  extension: string;
  prismClass: string;
}> = {
  typescript: {
    label: 'TypeScript',
    icon: <Code2 className="h-4 w-4" />,
    extension: '.ts',
    prismClass: 'language-typescript',
  },
  javascript: {
    label: 'JavaScript',
    icon: <Code2 className="h-4 w-4" />,
    extension: '.js',
    prismClass: 'language-javascript',
  },
  python: {
    label: 'Python',
    icon: <Terminal className="h-4 w-4" />,
    extension: '.py',
    prismClass: 'language-python',
  },
  json: {
    label: 'JSON',
    icon: <FileCode className="h-4 w-4" />,
    extension: '.json',
    prismClass: 'language-json',
  },
  bash: {
    label: 'Bash',
    icon: <Terminal className="h-4 w-4" />,
    extension: '.sh',
    prismClass: 'language-bash',
  },
  yaml: {
    label: 'YAML',
    icon: <FileCode className="h-4 w-4" />,
    extension: '.yaml',
    prismClass: 'language-yaml',
  },
  tsx: {
    label: 'TSX',
    icon: <Code2 className="h-4 w-4" />,
    extension: '.tsx',
    prismClass: 'language-tsx',
  },
  jsx: {
    label: 'JSX',
    icon: <Code2 className="h-4 w-4" />,
    extension: '.jsx',
    prismClass: 'language-jsx',
  },
  css: {
    label: 'CSS',
    icon: <FileCode className="h-4 w-4" />,
    extension: '.css',
    prismClass: 'language-css',
  },
  html: {
    label: 'HTML',
    icon: <FileCode className="h-4 w-4" />,
    extension: '.html',
    prismClass: 'language-html',
  },
};

// ============================================
// 3. KEYWORD TOKEN MAP (Simple Syntax Highlighting)
// ============================================

const KEYWORD_PATTERNS: Record<string, RegExp> = {
  keyword: /\b(import|export|from|const|let|var|function|return|if|else|for|while|class|interface|type|enum|extends|implements|async|await|try|catch|throw|new|this|super|default|case|switch|break|continue|typeof|instanceof|void|null|undefined|true|false)\b/g,
  string: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
  comment: /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm,
  number: /\b(\d+\.?\d*)\b/g,
  function: /\b([a-zA-Z_]\w*)(?=\s*\()/g,
  component: /\b([A-Z][a-zA-Z]*)\b/g,
  type: /\b(string|number|boolean|void|any|never|unknown|Promise|Array|Record|Map|Set|Date|RegExp)\b/g,
  operator: /(=>|===|!==|==|!=|>=|<=|&&|\|\||\+\+|--|\.{3}|\?\.|::)/g,
};

const KEYWORD_CLASSES: Record<string, string> = {
  keyword: 'text-pink-400 dark:text-pink-300',
  string: 'text-green-400 dark:text-green-300',
  comment: 'text-gray-500 dark:text-gray-600 italic',
  number: 'text-yellow-400 dark:text-yellow-300',
  function: 'text-blue-400 dark:text-blue-300',
  component: 'text-cyan-400 dark:text-cyan-300',
  type: 'text-orange-400 dark:text-orange-300',
  operator: 'text-purple-400 dark:text-purple-300',
};

// ============================================
// 4. THEME CONFIGURATION
// ============================================

const THEME_CONFIG: Record<CodeTheme, {
  background: string;
  surface: string;
  border: string;
  text: string;
  gutterText: string;
  hoverBg: string;
  glow: string;
}> = {
  dark: {
    background: 'bg-[#0d1117]',
    surface: 'bg-[#161b22]',
    border: 'border-[#30363d]',
    text: 'text-[#c9d1d9]',
    gutterText: 'text-[#484f58]',
    hoverBg: 'hover:bg-[#1c2129]',
    glow: 'shadow-[0_0_20px_rgba(124,58,237,0.15)]',
  },
  darker: {
    background: 'bg-[#0a0a0a]',
    surface: 'bg-[#111111]',
    border: 'border-[#222222]',
    text: 'text-[#e0e0e0]',
    gutterText: 'text-[#555555]',
    hoverBg: 'hover:bg-[#1a1a1a]',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.1)]',
  },
  midnight: {
    background: 'bg-[#0b0f1a]',
    surface: 'bg-[#111827]',
    border: 'border-[#1f2937]',
    text: 'text-[#e5e7eb]',
    gutterText: 'text-[#6b7280]',
    hoverBg: 'hover:bg-[#1f2937]',
    glow: 'shadow-[0_0_25px_rgba(59,130,246,0.12)]',
  },
};

// ============================================
// 5. HELPER: Apply Simple Syntax Highlighting
// ============================================

const applySyntaxHighlighting = (
  code: string,
  language: CodeLanguage
): string => {
  // Escape HTML entities first
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Apply patterns in order (careful with overlaps)
  const patterns = Object.entries(KEYWORD_PATTERNS);

  // Use a single pass approach: mark positions, then rebuild
  interface Token {
    start: number;
    end: number;
    type: string;
  }

  const tokens: Token[] = [];

  patterns.forEach(([type, regex]) => {
    // Clone the regex to avoid lastIndex issues
    const clone = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;
    while ((match = clone.exec(code)) !== null) {
      // Avoid overlapping with existing tokens
      const overlaps = tokens.some(
        (t) => match!.index < t.end && match!.index + match![0].length > t.start
      );
      if (!overlaps) {
        tokens.push({
          start: match.index,
          end: match.index + match[0].length,
          type,
        });
      }
    }
  });

  // Sort tokens by position
  tokens.sort((a, b) => a.start - b.start);

  // Build highlighted HTML
  let result = '';
  let lastIndex = 0;

  tokens.forEach((token) => {
    // Add text before token
    if (token.start > lastIndex) {
      result += html.slice(lastIndex, token.start);
    }
    // Add wrapped token
    const cssClass = KEYWORD_CLASSES[token.type] || '';
    result += `<span class="${cssClass}">${html.slice(token.start, token.end)}</span>`;
    lastIndex = token.end;
  });

  // Add remaining text
  if (lastIndex < html.length) {
    result += html.slice(lastIndex);
  }

  return result;
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const CodePreview: React.FC<CodePreviewProps> = ({
  blocks,
  code,
  language = 'typescript',
  fileName,
  showHeader = true,
  showLineNumbers = true,
  animation = 'none',
  animationSpeed = 30,
  highlightedLines = [],
  theme = 'dark',
  showCopy = true,
  terminalStyle = false,
  maxHeight = 400,
  action,
  gradientBorder = true,
  pulsingEffect = false,
  className = '',
  style,
  id = 'code-preview',
}) => {
  // ============================================
  // State
  // ============================================
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [displayedCode, setDisplayedCode] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasCompletedAnimation, setHasCompletedAnimation] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Derived Data
  // ============================================

  const codeBlocks = useMemo((): CodeBlock[] => {
    if (blocks && blocks.length > 0) return blocks;
    if (code) {
      return [
        {
          id: 'single-block',
          code,
          language,
          label: fileName || 'code',
        },
      ];
    }
    return [];
  }, [blocks, code, language, fileName]);

  const activeBlock = useMemo(
    () => codeBlocks[activeBlockIndex] || codeBlocks[0],
    [codeBlocks, activeBlockIndex]
  );

  const themeConfig = useMemo(() => THEME_CONFIG[theme], [theme]);
  const languageConfig = useMemo(
    () => LANGUAGE_CONFIG[activeBlock?.language || 'typescript'],
    [activeBlock?.language]
  );

  const rawCode = activeBlock?.code || '';

  // ============================================
  // Effects: Intersection Observer (Animate on scroll)
  // ============================================

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ============================================
  // Effects: Typewriter Animation
  // ============================================

  useEffect(() => {
    if (animation === 'none' || animation === 'fade-in' || animation === 'slide-up') {
      setDisplayedCode(rawCode);
      setHasCompletedAnimation(true);
      return;
    }

    if (animation === 'typewriter' && isInView && !hasCompletedAnimation) {
      setIsAnimating(true);
      setDisplayedCode('');

      let charIndex = 0;
      const totalChars = rawCode.length;

      const typeNextChar = () => {
        if (charIndex <= totalChars) {
          setDisplayedCode(rawCode.slice(0, charIndex));
          charIndex++;
          animationTimerRef.current = setTimeout(
            typeNextChar,
            animationSpeed
          );
        } else {
          setIsAnimating(false);
          setHasCompletedAnimation(true);
        }
      };

      typeNextChar();
    }

    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, [isInView, animation, rawCode, animationSpeed, hasCompletedAnimation]);

  // ============================================
  // Handlers
  // ============================================

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  }, [rawCode]);

  const handleTabSwitch = useCallback(
    (index: number) => {
      setActiveBlockIndex(index);
      setHasCompletedAnimation(false);
      setDisplayedCode('');
    },
    []
  );

  // ============================================
  // Line calculations
  // ============================================

  const lines = useMemo(
    () => (displayedCode || rawCode).split('\n'),
    [displayedCode, rawCode]
  );

  const highlightedHtml = useMemo(
    () => applySyntaxHighlighting(displayedCode || rawCode, activeBlock?.language || language),
    [displayedCode, rawCode, activeBlock?.language, language]
  );

  // ============================================
  // Animation classes
  // ============================================

  const animationContainerClass = useMemo(() => {
    if (animation === 'none') return '';
    if (!isInView) return 'opacity-0';
    if (animation === 'fade-in')
      return 'opacity-0 animate-in fade-in duration-700 fill-mode-forwards';
    if (animation === 'slide-up')
      return 'opacity-0 translate-y-4 animate-in slide-in-from-bottom-8 duration-500 fill-mode-forwards';
    return '';
  }, [animation, isInView]);

  // ============================================
  // Render: File Header
  // ============================================

  const renderHeader = () => {
    if (!showHeader) return null;

    return (
      <div
        className={`
          flex items-center justify-between
          px-4 py-3
          ${themeConfig.surface}
          border-b ${themeConfig.border}
          rounded-t-xl
        `}
      >
        <div className="flex items-center gap-3">
          {/* Window dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>

          {/* Tabs (if multiple blocks) */}
          {codeBlocks.length > 1 && (
            <div className="flex items-center gap-1 ml-4">
              {codeBlocks.map((block, index) => {
                const isActive = index === activeBlockIndex;
                const langConfig = LANGUAGE_CONFIG[block.language] || LANGUAGE_CONFIG.typescript;

                return (
                  <button
                    key={block.id}
                    onClick={() => handleTabSwitch(index)}
                    className={`
                      flex items-center gap-1.5
                      px-3 py-1.5 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${
                        isActive
                          ? `${themeConfig.surface} ${themeConfig.text}`
                          : `${themeConfig.gutterText} ${themeConfig.hoverBg}`
                      }
                    `}
                  >
                    {langConfig.icon}
                    <span className="hidden sm:inline">
                      {block.label || langConfig.label}
                    </span>
                    <span className="text-xs opacity-60">
                      {langConfig.extension}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Single file name */}
          {codeBlocks.length === 1 && (
            <div className="flex items-center gap-2 ml-4">
              {languageConfig.icon}
              <span className={`text-sm font-medium ${themeConfig.text}`}>
                {fileName || `index${languageConfig.extension}`}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showCopy && (
            <button
              onClick={handleCopy}
              className={`
                flex items-center gap-1.5
                px-3 py-1.5 rounded-lg text-sm
                transition-all duration-200
                ${themeConfig.gutterText}
                ${themeConfig.hoverBg}
              `}
              title="Copy code"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          )}

          {action && (
            <a
              href={action.href || '#'}
              onClick={action.onClick}
              className={`
                flex items-center gap-1.5
                px-3 py-1.5 rounded-lg text-sm font-medium
                bg-gradient-to-r from-brand-primary to-brand-secondary
                text-white
                hover:shadow-glow-secondary
                active:scale-[0.97]
                transition-all duration-200
              `}
            >
              <span>{action.label}</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Line Numbers Gutter
  // ============================================

  const renderGutter = () => {
    if (!showLineNumbers) return null;

    return (
      <div
        className={`
          flex-shrink-0 select-none
          py-4 pl-4 pr-2
          text-right font-mono text-sm leading-6
          ${themeConfig.gutterText}
          border-r ${themeConfig.border}
        `}
      >
        {lines.map((_, index) => {
          const lineNumber = index + 1;
          const isHighlighted = highlightedLines.includes(lineNumber);
          return (
            <div
              key={`gutter-${lineNumber}`}
              className={`
                transition-colors duration-200
                ${isHighlighted ? 'text-blue-400 font-semibold' : ''}
              `}
            >
              {lineNumber}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // Render: Code Content
  // ============================================

  const renderCodeContent = () => {
    if (animation === 'typewriter' && isAnimating) {
      // During typewriter animation, render lines to preserve line structure
      return (
        <code className="block">
          {lines.map((line, index) => {
            const lineNumber = index + 1;
            const isHighlighted = highlightedLines.includes(lineNumber);
            const isLastLine = index === lines.length - 1;
            const isEmptyLine = line.trim() === '';

            return (
              <span
                key={`line-${lineNumber}`}
                className={`
                  block leading-6
                  ${isHighlighted ? `${themeConfig.surface}` : ''}
                  transition-colors duration-200
                `}
              >
                <span
                  dangerouslySetInnerHTML={{
                    __html: applySyntaxHighlighting(line, activeBlock?.language || language),
                  }}
                />
                {isLastLine && isAnimating && (
                  <span className="inline-block w-2 h-5 ml-0.5 bg-brand-primary animate-pulse" />
                )}
              </span>
            );
          })}
        </code>
      );
    }

    // Static display with syntax highlighting
    return (
      <code>
        {lines.map((line, index) => {
          const lineNumber = index + 1;
          const isHighlighted = highlightedLines.includes(lineNumber);

          return (
            <span
              key={`line-${lineNumber}`}
              className={`
                block leading-6
                ${isHighlighted ? `${themeConfig.surface}` : ''}
                transition-colors duration-200
              `}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: applySyntaxHighlighting(line, activeBlock?.language || language),
                }}
              />
            </span>
          );
        })}
      </code>
    );
  };

  // ============================================
  // Render: Terminal Cursor (if terminal style)
  // ============================================

  const renderTerminalPrompt = () => {
    if (!terminalStyle) return null;

    return (
      <div className="flex items-center gap-2 mb-2 text-green-400">
        <ChevronRight className="h-4 w-4" />
        <span className="text-sm font-mono">$</span>
        <span className={`text-sm ${themeConfig.text}`}>
          {isAnimating ? 'Generating code...' : 'Code ready'}
        </span>
        {isAnimating && (
          <span className="inline-block w-2 h-5 bg-brand-primary animate-pulse rounded-sm" />
        )}
      </div>
    );
  };

  // ============================================
  // Render: Comment / Annotation
  // ============================================

  const renderComment = () => {
    if (!activeBlock?.comment) return null;

    return (
      <div className="px-4 py-2 border-t border-brand-primary/20 bg-brand-primary/5">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-brand-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm text-brand-primary/80">{activeBlock.comment}</p>
        </div>
      </div>
    );
  };

  // ============================================
  // Render: Action Footer
  // ============================================

  const renderFooter = () => {
    if (!action || showHeader) return null;

    return (
      <div
        className={`
          flex items-center justify-between
          px-4 py-3
          ${themeConfig.surface}
          border-t ${themeConfig.border}
          rounded-b-xl
        `}
      >
        <span className={`text-xs ${themeConfig.gutterText}`}>
          {codeBlocks.length > 1
            ? `${codeBlocks.length} files`
            : `${lines.length} lines • ${languageConfig.label}`}
        </span>
        <a
          href={action.href || '#'}
          onClick={action.onClick}
          className={`
            flex items-center gap-1.5
            px-4 py-2 rounded-lg text-sm font-medium
            bg-gradient-to-r from-brand-primary to-brand-secondary
            text-white
            hover:shadow-glow-secondary
            active:scale-[0.97]
            transition-all duration-200
          `}
        >
          <Sparkles className="h-4 w-4" />
          <span>{action.label}</span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  };

  // ============================================
  // 7. MAIN RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      id={id}
      className={`
        relative w-full
        rounded-xl overflow-hidden
        ${themeConfig.background}
        border ${themeConfig.border}
        ${gradientBorder ? 'before:absolute before:inset-0 before:rounded-xl before:p-[1px] before:bg-gradient-to-r before:from-brand-primary/30 before:via-brand-secondary/30 before:to-brand-accent/30 before:-z-10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500' : ''}
        ${pulsingEffect ? themeConfig.glow : ''}
        ${animationContainerClass}
        ${className}
      `}
      style={{
        maxHeight: maxHeight ? (typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight) : undefined,
        ...style,
      }}
    >
      {/* Gradient border overlay */}
      {gradientBorder && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(124,58,237,0.15), rgba(236,72,153,0.1))',
            padding: '1px',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}

      {/* Header */}
      {renderHeader()}

      {/* Terminal Prompt */}
      <div className="px-4 pt-3">
        {renderTerminalPrompt()}
      </div>

      {/* Code Area */}
      <div
        className="overflow-auto"
        style={{
          maxHeight: maxHeight
            ? typeof maxHeight === 'number'
              ? `${maxHeight - (showHeader ? 52 : 0)}px`
              : `calc(${maxHeight} - ${showHeader ? '52px' : '0px'})`
            : undefined,
        }}
      >
        <div className="flex">
          {/* Gutter */}
          {renderGutter()}

          {/* Code Content */}
          <div
            className={`
              flex-1 overflow-x-auto
              p-4 font-mono text-sm
              ${themeConfig.text}
              ${terminalStyle ? 'pt-0' : ''}
            `}
          >
            <pre className="m-0 leading-6">{renderCodeContent()}</pre>
          </div>
        </div>
      </div>

      {/* Comment / Annotation */}
      {renderComment()}

      {/* Footer (if no header) */}
      {renderFooter()}
    </div>
  );
};

// ============================================
// 8. DISPLAY NAME (React DevTools)
// ============================================

CodePreview.displayName = 'CodePreview';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  LANGUAGE_CONFIG,
  THEME_CONFIG,
  KEYWORD_PATTERNS,
  KEYWORD_CLASSES,
  applySyntaxHighlighting,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  CodeLanguage,
  CodeTheme,
  AnimationStyle,
  CodeBlock,
  CodePreviewProps,
};

// ============================================
// 11. DEFAULT EXPORT
// ============================================

export default CodePreview;