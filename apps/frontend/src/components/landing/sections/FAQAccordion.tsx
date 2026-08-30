// ============================================
// apps/frontend/src/components/landing/sections/FAQAccordion.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  CSSProperties,
  ReactNode,
  createContext,
  useContext,
} from 'react';

// ============================================
// 1. TYPES
// ============================================

type FAQVariant = 'default' | 'bordered' | 'minimal' | 'separated' | 'floating';

type FAQSize = 'sm' | 'md' | 'lg';

type FAQLayout = 'single' | 'double' | 'triple';

type FAQAnimation = 'slide' | 'fade' | 'scale' | 'none';

type ExpandIcon = 'plus' | 'chevron' | 'arrow' | 'circle' | 'custom';

type FAQCategory = 'general' | 'billing' | 'technical' | 'features' | 'security' | 'integrations' | 'custom';

interface FAQItem {
  /** Unique question ID */
  id: string;
  /** Question text */
  question: string;
  /** Answer content */
  answer: string | ReactNode;
  /** Category for grouping */
  category?: FAQCategory | string;
  /** Whether this item is featured */
  featured?: boolean;
  /** Whether this item is new */
  isNew?: boolean;
  /** Whether this item is popular */
  popular?: boolean;
  /** Custom tags */
  tags?: string[];
  /** Related FAQ IDs */
  relatedIds?: string[];
  /** Custom icon for this question */
  icon?: ReactNode;
  /** Whether this item is disabled */
  disabled?: boolean;
  /** Whether this item is initially expanded */
  defaultExpanded?: boolean;
}

interface FAQAccordionProps {
  /** Array of FAQ items */
  items: FAQItem[];
  /** Currently expanded item IDs (controlled) */
  expandedIds?: string[];
  /** Default expanded item IDs (uncontrolled) */
  defaultExpandedIds?: string[];
  /** Callback when items are toggled */
  onToggle?: (expandedIds: string[]) => void;
  /** Visual variant */
  variant?: FAQVariant;
  /** Size preset */
  size?: FAQSize;
  /** Layout columns */
  layout?: FAQLayout;
  /** Animation style */
  animation?: FAQAnimation;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether only one item can be expanded at a time */
  singleExpand?: boolean;
  /** Whether all items can be expanded/collapsed at once */
  expandAll?: boolean;
  /** Whether to show category headers */
  showCategories?: boolean;
  /** Categories to show (undefined = all) */
  categories?: string[];
  /** Default category filter */
  defaultCategory?: string;
  /** Whether to show search bar */
  showSearch?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Whether to show item tags */
  showTags?: boolean;
  /** Whether to show featured badge */
  showFeatured?: boolean;
  /** Whether to show new badge */
  showNew?: boolean;
  /** Whether to show popular badge */
  showPopular?: boolean;
  /** Whether to show related questions */
  showRelated?: boolean;
  /** Maximum related questions to show */
  maxRelated?: number;
  /** Custom expand icon */
  expandIcon?: ReactNode;
  /** Expand icon type */
  expandIconType?: ExpandIcon;
  /** Custom collapse icon */
  collapseIcon?: ReactNode;
  /** Whether to show item numbers */
  showNumbers?: boolean;
  /** Starting number for items */
  startNumber?: number;
  /** Whether to use keyboard navigation */
  keyboardNavigation?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** ID for the component */
  id?: string;
  /** Whether to respect reduced motion */
  respectReducedMotion?: boolean;
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Section badge */
  badge?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** Callback when search query changes */
  onSearch?: (query: string) => void;
  /** Custom filter function */
  filterFn?: (item: FAQItem, query: string) => boolean;
}

// ============================================
// 2. ACCORDION CONTEXT
// ============================================

interface AccordionContextType {
  expandedIds: Set<string>;
  toggleItem: (id: string) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  isExpanded: (id: string) => boolean;
  singleExpand: boolean;
  animation: FAQAnimation;
  animationDuration: number;
  variant: FAQVariant;
  size: FAQSize;
  expandIconType: ExpandIcon;
  expandIcon?: ReactNode;
  collapseIcon?: ReactNode;
  shouldReduceMotion: boolean;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

const useAccordionContext = (): AccordionContextType => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('FAQ components must be used within an FAQAccordion');
  }
  return context;
};

// ============================================
// 3. SIZE & VARIANT PRESETS
// ============================================

const SIZE_CONFIG: Record<
  FAQSize,
  {
    question: string;
    answer: string;
    padding: string;
    icon: string;
    gap: string;
    badge: string;
    number: string;
  }
> = {
  sm: {
    question: 'text-sm',
    answer: 'text-xs',
    padding: 'p-3',
    icon: 'w-4 h-4',
    gap: 'gap-2',
    badge: 'text-[10px]',
    number: 'text-xs',
  },
  md: {
    question: 'text-base',
    answer: 'text-sm',
    padding: 'p-4',
    icon: 'w-5 h-5',
    gap: 'gap-3',
    badge: 'text-xs',
    number: 'text-sm',
  },
  lg: {
    question: 'text-lg',
    answer: 'text-base',
    padding: 'p-5',
    icon: 'w-6 h-6',
    gap: 'gap-4',
    badge: 'text-xs',
    number: 'text-base',
  },
};

const VARIANT_CONFIG: Record<
  FAQVariant,
  {
    container: string;
    item: string;
    itemExpanded: string;
    itemHover: string;
    divider: string;
    bg: string;
    bgExpanded: string;
  }
> = {
  default: {
    container: 'bg-white dark:bg-brand-surface rounded-2xl border border-brand-border',
    item: 'border-b border-brand-border/50 last:border-b-0',
    itemExpanded: 'bg-brand-primary/[0.02]',
    itemHover: 'hover:bg-brand-primary/[0.03]',
    divider: 'border-brand-border/50',
    bg: 'bg-white dark:bg-brand-surface',
    bgExpanded: 'bg-brand-primary/[0.03]',
  },
  bordered: {
    container: 'bg-transparent',
    item: 'border-2 border-brand-border rounded-xl mb-3',
    itemExpanded: 'border-brand-primary/30 bg-brand-primary/[0.02]',
    itemHover: 'hover:border-brand-primary/20',
    divider: 'border-brand-border',
    bg: 'bg-white dark:bg-brand-surface',
    bgExpanded: 'bg-brand-primary/[0.04]',
  },
  minimal: {
    container: 'bg-transparent border-0',
    item: 'border-b border-brand-border/30 last:border-b-0',
    itemExpanded: 'bg-transparent',
    itemHover: 'hover:bg-brand-border/10',
    divider: 'border-brand-border/30',
    bg: 'bg-transparent',
    bgExpanded: 'bg-transparent',
  },
  separated: {
    container: 'bg-transparent',
    item: 'bg-white dark:bg-brand-surface rounded-xl border border-brand-border mb-3 shadow-sm',
    itemExpanded: 'border-brand-primary/30 shadow-lg shadow-brand-primary/5',
    itemHover: 'hover:shadow-md hover:border-brand-primary/20',
    divider: 'border-brand-border',
    bg: 'bg-white dark:bg-brand-surface',
    bgExpanded: 'bg-brand-primary/[0.02]',
  },
  floating: {
    container: 'bg-transparent',
    item: 'bg-white/80 dark:bg-brand-surface/80 backdrop-blur-sm rounded-2xl border border-brand-border/50 mb-3 shadow-lg',
    itemExpanded: 'border-brand-primary/40 shadow-xl shadow-brand-primary/10 bg-white/95 dark:bg-brand-surface/95',
    itemHover: 'hover:shadow-xl hover:-translate-y-0.5 hover:border-brand-primary/30',
    divider: 'border-brand-border/50',
    bg: 'bg-white/80 dark:bg-brand-surface/80 backdrop-blur-sm',
    bgExpanded: 'bg-white/95 dark:bg-brand-surface/95',
  },
};

const LAYOUT_CONFIG: Record<FAQLayout, string> = {
  single: 'grid-cols-1',
  double: 'grid-cols-1 lg:grid-cols-2',
  triple: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

const CATEGORY_CONFIG: Record<FAQCategory, { label: string; icon: ReactNode; color: string }> = {
  general: { label: 'General', icon: null, color: '#3B82F6' },
  billing: { label: 'Billing & Plans', icon: null, color: '#22C55E' },
  technical: { label: 'Technical', icon: null, color: '#7C3AED' },
  features: { label: 'Features', icon: null, color: '#F59E0B' },
  security: { label: 'Security', icon: null, color: '#EF4444' },
  integrations: { label: 'Integrations', icon: null, color: '#EC4899' },
  custom: { label: 'Other', icon: null, color: '#6B7280' },
};

// ============================================
// 4. CSS ANIMATIONS
// ============================================

const ANIMATION_STYLES = `
  @keyframes faq-accordion-slide-down {
    0% {
      max-height: 0;
      opacity: 0;
      transform: translateY(-8px);
    }
    100% {
      max-height: var(--faq-content-height, 1000px);
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes faq-accordion-slide-up {
    0% {
      max-height: var(--faq-content-height, 1000px);
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      max-height: 0;
      opacity: 0;
      transform: translateY(-8px);
    }
  }

  @keyframes faq-accordion-fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes faq-accordion-fade-out {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  @keyframes faq-accordion-scale-in {
    0% {
      opacity: 0;
      transform: scaleY(0.95);
      transform-origin: top;
    }
    100% {
      opacity: 1;
      transform: scaleY(1);
      transform-origin: top;
    }
  }

  @keyframes faq-accordion-scale-out {
    0% {
      opacity: 1;
      transform: scaleY(1);
      transform-origin: top;
    }
    100% {
      opacity: 0;
      transform: scaleY(0.95);
      transform-origin: top;
    }
  }

  @keyframes faq-icon-rotate-open {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(180deg);
    }
  }

  @keyframes faq-icon-rotate-close {
    0% {
      transform: rotate(180deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  @keyframes faq-pulse-new {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes faq-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @keyframes faq-search-highlight {
    0%, 100% {
      background-color: transparent;
    }
    50% {
      background-color: rgba(59, 130, 246, 0.1);
    }
  }
`;

// ============================================
// 5. ICON COMPONENTS
// ============================================

const PlusIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <svg
    className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'} ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ChevronIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <svg
    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'} ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ArrowIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <svg
    className={`transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'} ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="9" y1="18" x2="15" y2="12" />
    <line x1="9" y1="6" x2="15" y2="12" />
  </svg>
);

const CircleIcon: React.FC<{ isOpen: boolean; className?: string }> = ({ isOpen, className = '' }) => (
  <svg
    className={`transition-all duration-300 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    {isOpen ? (
      <line x1="8" y1="12" x2="16" y2="12" />
    ) : (
      <>
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </>
    )}
  </svg>
);

const DEFAULT_ICONS: Record<ExpandIcon, React.FC<{ isOpen: boolean; className?: string }>> = {
  plus: PlusIcon,
  chevron: ChevronIcon,
  arrow: ArrowIcon,
  circle: CircleIcon,
  custom: PlusIcon,
};

// ============================================
// 6. SUB-COMPONENT: FAQ Item
// ============================================

interface FAQItemComponentProps {
  item: FAQItem;
  index: number;
  showNumbers: boolean;
  startNumber: number;
  showTags: boolean;
  showFeatured: boolean;
  showNew: boolean;
  showPopular: boolean;
  showRelated: boolean;
  maxRelated: number;
  allItems: FAQItem[];
  searchQuery: string;
}

const FAQItemComponent: React.FC<FAQItemComponentProps> = ({
  item,
  index,
  showNumbers,
  startNumber,
  showTags,
  showFeatured,
  showNew,
  showPopular,
  showRelated,
  maxRelated,
  allItems,
  searchQuery,
}) => {
  const {
    expandedIds,
    toggleItem,
    isExpanded,
    singleExpand,
    animation,
    animationDuration,
    variant,
    size,
    expandIconType,
    expandIcon,
    collapseIcon,
    shouldReduceMotion,
  } = useAccordionContext();

  const isOpen = isExpanded(item.id);
  const sizeConfig = SIZE_CONFIG[size];
  const variantConfig = VARIANT_CONFIG[variant];
  const contentRef = useRef<HTMLDivElement>(null);
  const IconComponent = DEFAULT_ICONS[expandIconType];

  // Related items
  const relatedItems = useMemo(() => {
    if (!showRelated || !item.relatedIds || item.relatedIds.length === 0) return [];
    return item.relatedIds
      .map((id) => allItems.find((i) => i.id === id))
      .filter(Boolean)
      .slice(0, maxRelated) as FAQItem[];
  }, [item, allItems, showRelated, maxRelated]);

  // Highlight search query in text
  const highlightText = useCallback(
    (text: string): ReactNode => {
      if (!searchQuery || searchQuery.length < 2) return text;

      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);

      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/30 text-inherit rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    },
    [searchQuery]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleItem(item.id);
      }
    },
    [toggleItem, item.id]
  );

  const animationStyle = useMemo((): CSSProperties => {
    if (shouldReduceMotion || animation === 'none') return {};

    const animName = isOpen
      ? animation === 'slide'
        ? 'faq-accordion-slide-down'
        : animation === 'fade'
          ? 'faq-accordion-fade-in'
          : 'faq-accordion-scale-in'
      : animation === 'slide'
        ? 'faq-accordion-slide-up'
        : animation === 'fade'
          ? 'faq-accordion-fade-out'
          : 'faq-accordion-scale-out';

    return {
      animation: `${animName} ${animationDuration}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
    };
  }, [isOpen, animation, animationDuration, shouldReduceMotion]);

  return (
    <div
      className={`
        faq-item
        ${variantConfig.item}
        ${variantConfig.itemHover}
        ${isOpen ? variantConfig.itemExpanded : ''}
        ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        transition-all duration-300
      `}
      role="button"
      tabIndex={item.disabled ? -1 : 0}
      aria-expanded={isOpen}
      aria-controls={`faq-content-${item.id}`}
      onClick={() => !item.disabled && toggleItem(item.id)}
      onKeyDown={handleKeyDown}
    >
      {/* Question Header */}
      <div
        className={`
          flex items-center justify-between
          ${sizeConfig.padding}
          ${sizeConfig.gap}
          select-none
        `}
      >
        {/* Left: Number + Icon + Question */}
        <div className={`flex items-center ${sizeConfig.gap} min-w-0 flex-1`}>
          {/* Item Number */}
          {showNumbers && (
            <span
              className={`
                flex-shrink-0
                ${sizeConfig.number}
                font-semibold
                text-brand-primary/50
                w-6 text-right
              `}
            >
              {startNumber + index}.
            </span>
          )}

          {/* Custom Icon */}
          {item.icon && (
            <span className="flex-shrink-0 text-brand-primary">{item.icon}</span>
          )}

          {/* Question Text */}
          <span
            className={`
              ${sizeConfig.question}
              font-medium
              text-text-primary
              ${isOpen ? 'text-brand-primary' : ''}
              transition-colors duration-200
            `}
          >
            {typeof item.question === 'string'
              ? highlightText(item.question)
              : item.question}
          </span>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {showFeatured && item.featured && (
              <span
                className={`
                  inline-flex items-center gap-1
                  px-2 py-0.5 rounded-full
                  ${sizeConfig.badge}
                  font-medium
                  bg-brand-primary/10 text-brand-primary
                  border border-brand-primary/20
                `}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Featured
              </span>
            )}

            {showNew && item.isNew && (
              <span
                className={`
                  inline-flex items-center gap-1
                  px-2 py-0.5 rounded-full
                  ${sizeConfig.badge}
                  font-medium
                  bg-green-500/10 text-green-500
                  border border-green-500/20
                  animate-pulse
                `}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
                </svg>
                New
              </span>
            )}

            {showPopular && item.popular && (
              <span
                className={`
                  inline-flex items-center gap-1
                  px-2 py-0.5 rounded-full
                  ${sizeConfig.badge}
                  font-medium
                  bg-yellow-500/10 text-yellow-600
                  border border-yellow-500/20
                `}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Popular
              </span>
            )}
          </div>
        </div>

        {/* Right: Tags + Expand Icon */}
        <div className={`flex items-center ${sizeConfig.gap} flex-shrink-0`}>
          {/* Tags */}
          {showTags && item.tags && item.tags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {item.tags.slice(0, 2).map((tag, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-brand-border/20 text-text-muted rounded text-[10px]"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 2 && (
                <span className="text-[10px] text-text-muted">+{item.tags.length - 2}</span>
              )}
            </div>
          )}

          {/* Expand/Collapse Icon */}
          <span
            className={`
              flex-shrink-0
              ${sizeConfig.icon}
              text-text-muted
              transition-colors duration-200
              ${isOpen ? 'text-brand-primary' : ''}
            `}
          >
            {isOpen && collapseIcon ? (
              collapseIcon
            ) : !isOpen && expandIcon ? (
              expandIcon
            ) : (
              <IconComponent isOpen={isOpen} className={sizeConfig.icon} />
            )}
          </span>
        </div>
      </div>

      {/* Answer Content */}
      <div
        id={`faq-content-${item.id}`}
        ref={contentRef}
        className={`
          overflow-hidden
          transition-all duration-300
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        style={animationStyle}
        aria-hidden={!isOpen}
        role="region"
        aria-labelledby={`faq-question-${item.id}`}
      >
        <div
          className={`
            ${sizeConfig.padding}
            pt-0
            ${sizeConfig.answer}
            text-text-secondary
            leading-relaxed
          `}
        >
          {/* Divider */}
          <div className={`border-t ${variantConfig.divider} mb-4`} />

          {/* Answer Content */}
          <div className="prose dark:prose-invert max-w-none prose-sm">
            {typeof item.answer === 'string'
              ? highlightText(item.answer)
              : item.answer}
          </div>

          {/* Related Questions */}
          {relatedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-border/20">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Related Questions
              </p>
              <div className="space-y-1">
                {relatedItems.map((related) => (
                  <button
                    key={related.id}
                    className={`
                      w-full text-left
                      text-sm text-brand-primary
                      hover:text-brand-primary/80
                      transition-colors
                      flex items-center gap-1.5
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(related.id);
                    }}
                  >
                    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                    {related.question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 7. SUB-COMPONENT: Search Bar
// ============================================

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount: number;
  totalCount: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder,
  resultCount,
  totalCount,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onChange('');
      inputRef.current?.blur();
    }
  }, [onChange]);

  return (
    <div className="relative max-w-2xl mx-auto mb-8">
      {/* Search Icon */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`
          w-full
          pl-12 pr-20 py-3
          bg-white dark:bg-brand-surface
          border border-brand-border
          rounded-xl
          text-text-primary
          placeholder-text-muted
          focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary/30
          transition-all duration-200
          text-sm
        `}
        aria-label="Search frequently asked questions"
      />

      {/* Results count + Clear */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && (
          <>
            <span className="text-xs text-text-muted">
              {resultCount} of {totalCount}
            </span>
            <button
              onClick={() => onChange('')}
              className="p-1 rounded-md hover:bg-brand-border/20 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Keyboard shortcut hint */}
      {!value && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-text-muted">
          <kbd className="px-1.5 py-0.5 bg-brand-border/30 rounded text-[10px] font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-brand-border/30 rounded text-[10px] font-mono">K</kbd>
        </div>
      )}
    </div>
  );
};

// ============================================
// 8. SUB-COMPONENT: Category Filter
// ============================================

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
  counts: Record<string, number>;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  activeCategory,
  onSelect,
  counts,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex justify-center mb-8">
      <div
        ref={scrollRef}
        className="inline-flex flex-wrap gap-2 p-1.5 bg-brand-border/10 rounded-xl"
      >
        {categories.map((category) => {
          const isActive = activeCategory === category;
          const config = CATEGORY_CONFIG[category as FAQCategory] || CATEGORY_CONFIG.custom;

          return (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                flex items-center gap-2
                whitespace-nowrap
                ${
                  isActive
                    ? 'bg-white dark:bg-brand-surface text-brand-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/50 dark:hover:bg-white/5'
                }
              `}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: config.color }}
              />
              {config.label || category}
              {counts[category] !== undefined && (
                <span
                  className={`
                    px-1.5 py-0.5 rounded-full text-xs
                    ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-border/20 text-text-muted'}
                  `}
                >
                  {counts[category]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// 9. SUB-COMPONENT: Empty State
// ============================================

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  onClearSearch?: () => void;
  searchQuery: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  onClearSearch,
  searchQuery,
}) => (
  <div className="text-center py-12">
    {icon || (
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-brand-border/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
    )}
    <p className="text-text-muted text-sm">{message}</p>
    {searchQuery && onClearSearch && (
      <button
        onClick={onClearSearch}
        className="mt-3 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
      >
        Clear search
      </button>
    )}
  </div>
);

// ============================================
// 10. MAIN COMPONENT
// ============================================

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  items,
  expandedIds: controlledExpandedIds,
  defaultExpandedIds = [],
  onToggle,
  variant = 'default',
  size = 'md',
  layout = 'single',
  animation = 'slide',
  animationDuration = 300,
  singleExpand = false,
  expandAll = false,
  showCategories = true,
  categories,
  defaultCategory = 'all',
  showSearch = true,
  searchPlaceholder = 'Search frequently asked questions...',
  showTags = true,
  showFeatured = true,
  showNew = true,
  showPopular = true,
  showRelated = true,
  maxRelated = 3,
  expandIcon,
  expandIconType = 'plus',
  collapseIcon,
  showNumbers = false,
  startNumber = 1,
  keyboardNavigation = true,
  className = '',
  style,
  id = 'faq-accordion',
  respectReducedMotion = true,
  title,
  subtitle,
  badge,
  emptyMessage = 'No matching questions found.',
  emptyIcon,
  onSearch,
  filterFn,
}) => {
  // ============================================
  // State
  // ============================================

  const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(
    new Set(defaultExpandedIds)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(defaultCategory);
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const [isStyleInjected, setIsStyleInjected] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // ============================================
  // Derived Values
  // ============================================

  const isControlled = controlledExpandedIds !== undefined;
  const expandedIds = isControlled ? new Set(controlledExpandedIds) : internalExpandedIds;

  // Extract categories from items
  const availableCategories = useMemo(() => {
    if (categories) return ['all', ...categories];
    const cats = new Set<string>();
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    if (cats.size === 0) return ['all'];
    return ['all', ...Array.from(cats)];
  }, [items, categories]);

  // Filter items by search and category
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Category filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter((item) => item.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      if (filterFn) {
        filtered = filtered.filter((item) => filterFn(item, query));
      } else {
        filtered = filtered.filter(
          (item) =>
            (typeof item.question === 'string' && item.question.toLowerCase().includes(query)) ||
            (typeof item.answer === 'string' && item.answer.toLowerCase().includes(query)) ||
            item.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query))
        );
      }
    }

    return filtered;
  }, [items, activeCategory, searchQuery, filterFn]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    items.forEach((item) => {
      const cat = item.category || 'custom';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!showCategories || activeCategory !== 'all') return null;

    const groups: Record<string, FAQItem[]> = {};
    const uncategorized: FAQItem[] = [];

    filteredItems.forEach((item) => {
      if (item.category) {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      } else {
        uncategorized.push(item);
      }
    });

    return { groups, uncategorized };
  }, [filteredItems, showCategories, activeCategory]);

  // ============================================
  // Effects: Reduced Motion
  // ============================================

  useEffect(() => {
    if (!respectReducedMotion) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setShouldReduceMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [respectReducedMotion]);

  // ============================================
  // Effects: Inject Animations
  // ============================================

  useEffect(() => {
    if (isStyleInjected) return;

    const styleId = 'faq-accordion-animations';
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      setIsStyleInjected(true);
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = ANIMATION_STYLES;
    document.head.appendChild(styleElement);

    styleRef.current = styleElement;
    setIsStyleInjected(true);

    return () => {
      if (styleRef.current && document.head.contains(styleRef.current)) {
        document.head.removeChild(styleRef.current);
      }
    };
  }, [isStyleInjected]);

  // ============================================
  // Effects: Keyboard Shortcuts
  // ============================================

  useEffect(() => {
    if (!keyboardNavigation || !showSearch) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = containerRef.current?.querySelector('input');
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardNavigation, showSearch]);

  // ============================================
  // Handlers
  // ============================================

  const updateExpanded = useCallback(
    (newExpanded: Set<string>) => {
      if (!isControlled) {
        setInternalExpandedIds(newExpanded);
      }
      onToggle?.(Array.from(newExpanded));
    },
    [isControlled, onToggle]
  );

  const toggleItem = useCallback(
    (id: string) => {
      const newExpanded = new Set(expandedIds);

      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        if (singleExpand) {
          newExpanded.clear();
        }
        newExpanded.add(id);
      }

      updateExpanded(newExpanded);
    },
    [expandedIds, singleExpand, updateExpanded]
  );

  const expandItem = useCallback(
    (id: string) => {
      const newExpanded = new Set(expandedIds);
      if (singleExpand) newExpanded.clear();
      newExpanded.add(id);
      updateExpanded(newExpanded);
    },
    [expandedIds, singleExpand, updateExpanded]
  );

  const collapseItem = useCallback(
    (id: string) => {
      const newExpanded = new Set(expandedIds);
      newExpanded.delete(id);
      updateExpanded(newExpanded);
    },
    [expandedIds, updateExpanded]
  );

  const expandAllItems = useCallback(() => {
    const newExpanded = new Set(filteredItems.map((item) => item.id));
    updateExpanded(newExpanded);
  }, [filteredItems, updateExpanded]);

  const collapseAllItems = useCallback(() => {
    updateExpanded(new Set());
  }, [updateExpanded]);

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const handleCategorySelect = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    onSearch?.('');
  }, [onSearch]);

  // ============================================
  // Context Value
  // ============================================

  const contextValue = useMemo(
    (): AccordionContextType => ({
      expandedIds,
      toggleItem,
      expandItem,
      collapseItem,
      expandAll: expandAllItems,
      collapseAll: collapseAllItems,
      isExpanded,
      singleExpand,
      animation: shouldReduceMotion ? 'none' : animation,
      animationDuration,
      variant,
      size,
      expandIconType,
      expandIcon,
      collapseIcon,
      shouldReduceMotion,
    }),
    [
      expandedIds,
      toggleItem,
      expandItem,
      collapseItem,
      expandAllItems,
      collapseAllItems,
      isExpanded,
      singleExpand,
      animation,
      animationDuration,
      variant,
      size,
      expandIconType,
      expandIcon,
      collapseIcon,
      shouldReduceMotion,
    ]
  );

  // ============================================
  // 11. RENDER
  // ============================================

  const renderItems = (faqItems: FAQItem[], baseIndex: number = 0) => (
    <div className={`grid ${LAYOUT_CONFIG[layout]} gap-0`}>
      {faqItems.map((item, index) => (
        <FAQItemComponent
          key={item.id}
          item={item}
          index={baseIndex + index}
          showNumbers={showNumbers}
          startNumber={startNumber + baseIndex}
          showTags={showTags}
          showFeatured={showFeatured}
          showNew={showNew}
          showPopular={showPopular}
          showRelated={showRelated}
          maxRelated={maxRelated}
          allItems={items}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        id={id}
        className={`faq-accordion ${className}`}
        style={style}
      >
        {/* Section Header */}
        {(title || subtitle || badge) && (
          <div className="text-center mb-8">
            {badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-4">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-text-muted max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Search Bar */}
        {showSearch && (
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            resultCount={filteredItems.length}
            totalCount={items.length}
          />
        )}

        {/* Category Filter */}
        {showCategories && availableCategories.length > 1 && (
          <CategoryFilter
            categories={availableCategories}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
            counts={categoryCounts}
          />
        )}

        {/* Expand/Collapse All */}
        {expandAll && filteredItems.length > 0 && (
          <div className="flex justify-end mb-4">
            <button
              onClick={
                expandedIds.size === filteredItems.length
                  ? collapseAllItems
                  : expandAllItems
              }
              className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
            >
              {expandedIds.size === filteredItems.length
                ? 'Collapse All'
                : 'Expand All'}
            </button>
          </div>
        )}

        {/* Items */}
        <div className={VARIANT_CONFIG[variant].container}>
          {/* Grouped by Category */}
          {groupedItems && activeCategory === 'all' ? (
            <div className="space-y-8">
              {Object.entries(groupedItems.groups).map(([category, catItems]) => {
                const config = CATEGORY_CONFIG[category as FAQCategory] || CATEGORY_CONFIG.custom;
                return (
                  <div key={category}>
                    <h3
                      className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2"
                      style={{ color: config.color }}
                    >
                      {config.label || category}
                      <span className="text-sm font-normal text-text-muted">
                        ({catItems.length})
                      </span>
                    </h3>
                    {renderItems(catItems)}
                  </div>
                );
              })}

              {/* Uncategorized */}
              {groupedItems.uncategorized.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-3">
                    Other Questions
                  </h3>
                  {renderItems(groupedItems.uncategorized)}
                </div>
              )}
            </div>
          ) : filteredItems.length > 0 ? (
            /* Flat list */
            renderItems(filteredItems)
          ) : (
            /* Empty state */
            <EmptyState
              message={emptyMessage}
              icon={emptyIcon}
              onClearSearch={handleClearSearch}
              searchQuery={searchQuery}
            />
          )}
        </div>

        {/* Still have questions CTA */}
        {filteredItems.length > 0 && (
          <div className="text-center mt-8 pt-6 border-t border-brand-border/30">
            <p className="text-text-muted text-sm">
              Still have questions?{' '}
              <a
                href="/support"
                className="text-brand-primary hover:text-brand-primary/80 transition-colors font-medium"
              >
                Contact our support team
              </a>
            </p>
          </div>
        )}
      </div>
    </AccordionContext.Provider>
  );
};

// ============================================
// 12. FAQ SECTION WRAPPER
// ============================================

interface FAQSectionProps extends FAQAccordionProps {
  sectionId?: string;
  background?: 'default' | 'surface' | 'elevated';
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  sectionId = 'faq',
  background = 'default',
  ...props
}) => {
  const bgConfig: Record<string, string> = {
    default: 'bg-[#0B0F1A]',
    surface: 'bg-[#111827]',
    elevated: 'bg-[#1F2937]',
  };

  return (
    <section
      id={sectionId}
      className={`py-16 md:py-24 ${bgConfig[background]}`}
    >
      <div className="max-w-[1280px] mx-auto px-6 lg:px-12">
        <FAQAccordion {...props} />
      </div>
    </section>
  );
};

// ============================================
// 13. DISPLAY NAMES
// ============================================

FAQAccordion.displayName = 'FAQAccordion';
FAQSection.displayName = 'FAQSection';
FAQItemComponent.displayName = 'FAQItem';
SearchBar.displayName = 'SearchBar';
CategoryFilter.displayName = 'CategoryFilter';
EmptyState.displayName = 'EmptyState';

// ============================================
// 14. NAMED EXPORTS
// ============================================

export {
  FAQItemComponent,
  SearchBar,
  CategoryFilter,
  EmptyState,
  AccordionContext,
  useAccordionContext,
  SIZE_CONFIG,
  VARIANT_CONFIG,
  LAYOUT_CONFIG,
  CATEGORY_CONFIG,
  ANIMATION_STYLES,
  DEFAULT_ICONS,
  PlusIcon,
  ChevronIcon,
  ArrowIcon,
  CircleIcon,
};

// ============================================
// 15. TYPE EXPORTS
// ============================================

export type {
  FAQVariant,
  FAQSize,
  FAQLayout,
  FAQAnimation,
  ExpandIcon,
  FAQCategory,
  FAQItem,
  FAQAccordionProps,
  FAQSectionProps,
  AccordionContextType,
  SearchBarProps,
  CategoryFilterProps,
  EmptyStateProps,
};

// ============================================
// 16. DEFAULT EXPORT
// ============================================

export default FAQAccordion;
