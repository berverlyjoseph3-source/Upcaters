// ============================================
// apps/frontend/src/components/landing/layout/MobileMenu.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
} from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { Button } from '../../common/Button';
import type { NavItem, NavSubItem } from '../../../types/landing.types';

// ============================================
// 1. TYPES
// ============================================

type MobileMenuState = 'closed' | 'opening' | 'open' | 'closing';

interface MobileMenuContextValue {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Open the menu */
  open: () => void;
  /** Close the menu */
  close: () => void;
  /** Toggle the menu */
  toggle: () => void;
  /** Current menu state (for animations) */
  menuState: MobileMenuState;
}

interface MobileMenuProps {
  /** Navigation items to display */
  items: NavItem[];
  /** CTA buttons (e.g., Login, Sign Up) shown at bottom */
  ctas?: NavItem[];
  /** Whether the menu is open (controlled mode) */
  isOpen?: boolean;
  /** Called when the menu opens */
  onOpen?: () => void;
  /** Called when the menu closes */
  onClose?: () => void;
  /** Called when a nav item is clicked */
  onItemClick?: (item: NavItem, subItem?: NavSubItem) => void;
  /** Custom trigger button render function */
  renderTrigger?: (props: { onClick: () => void; isOpen: boolean }) => React.ReactNode;
  /** Whether to show the logo at the top */
  showLogo?: boolean;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Whether to show social links at bottom */
  showSocialLinks?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
  /** z-index override */
  zIndex?: number;
  /** Whether to lock body scroll when open */
  lockScroll?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Whether the user is authenticated (affects CTA display) */
  isAuthenticated?: boolean;
  /** Current active path for highlighting */
  activePath?: string;
}

interface MobileMenuSubmenuProps {
  /** Parent nav item */
  item: NavItem;
  /** Whether the submenu is expanded */
  isExpanded: boolean;
  /** Toggle expand callback */
  onToggle: () => void;
  /** Called when a sub-item is clicked */
  onSubItemClick: (subItem: NavSubItem) => void;
  /** Animation delay index */
  index: number;
  /** Whether the menu is open (for staggered animations) */
  isMenuOpen: boolean;
}

interface MobileMenuProviderProps {
  children: React.ReactNode;
}

// ============================================
// 2. CONTEXT
// ============================================

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export const useMobileMenu = (): MobileMenuContextValue => {
  const context = useContext(MobileMenuContext);
  if (!context) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider');
  }
  return context;
};

// ============================================
// 3. CONSTANTS
// ============================================

const STAGGER_DELAY_MS = 50;
const DEFAULT_ANIMATION_DURATION = 300;
const DEFAULT_Z_INDEX = 100;

// ============================================
// 4. SUB-COMPONENT: MobileMenuSubmenu
// ============================================

const MobileMenuSubmenu: React.FC<MobileMenuSubmenuProps> = ({
  item,
  isExpanded,
  onToggle,
  onSubItemClick,
  index,
  isMenuOpen,
}) => {
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      onToggle();
    } else {
      // Navigate or scroll to section
      if (item.href && item.href.startsWith('#')) {
        const element = document.querySelector(item.href);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (item.href) {
        window.location.href = item.href;
      }
    }
  }, [hasChildren, item.href, onToggle]);

  const handleSubItemClick = useCallback(
    (subItem: NavSubItem) => {
      onSubItemClick(subItem);
    },
    [onSubItemClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
      if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
        e.preventDefault();
        onToggle();
      }
      if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
        e.preventDefault();
        onToggle();
      }
    },
    [handleClick, hasChildren, isExpanded, onToggle]
  );

  return (
    <div
      className="mobile-menu-item-wrapper"
      style={{
        opacity: isMenuOpen ? 1 : 0,
        transform: isMenuOpen ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity ${DEFAULT_ANIMATION_DURATION}ms var(--ease-out), transform ${DEFAULT_ANIMATION_DURATION}ms var(--ease-out)`,
        transitionDelay: `${index * STAGGER_DELAY_MS}ms`,
      }}
    >
      {/* Parent item */}
      <button
        className={`
          w-full flex items-center justify-between
          px-4 py-3.5 rounded-xl text-left
          text-text-primary
          hover:bg-white/5
          focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
          transition-colors duration-150
        `}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-haspopup={hasChildren ? 'true' : undefined}
        role="menuitem"
        tabIndex={0}
      >
        <div className="flex items-center gap-3">
          {item.icon && (
            <span className="text-text-muted flex-shrink-0">{item.icon}</span>
          )}
          <div>
            <span className="text-base font-medium">{item.label}</span>
            {item.badge && (
              <span
                className={`
                  ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${
                    item.badgeVariant === 'success'
                      ? 'bg-green-500/10 text-green-500'
                      : item.badgeVariant === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-brand-primary/10 text-brand-primary'
                  }
                `}
              >
                {item.badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {item.external && !hasChildren && (
            <ExternalLink className="h-4 w-4 text-text-muted" />
          )}
          {hasChildren && (
            <ChevronDown
              className={`
                h-5 w-5 text-text-muted transition-transform duration-200
                ${isExpanded ? 'rotate-180' : 'rotate-0'}
              `}
            />
          )}
          {!hasChildren && !item.external && (
            <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </button>

      {/* Children (submenu) */}
      {hasChildren && (
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-out
            ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="ml-6 mt-1 mb-2 space-y-1 border-l border-brand-border/50 pl-3">
            {item.children!.map((subItem, subIndex) => (
              <button
                key={`sub-${subItem.label}-${subIndex}`}
                className="
                  w-full flex items-center justify-between
                  px-3 py-2.5 rounded-lg text-left
                  text-text-secondary hover:text-text-primary
                  hover:bg-white/5
                  focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary
                  transition-all duration-150
                "
                onClick={() => handleSubItemClick(subItem)}
                role="menuitem"
                tabIndex={isExpanded ? 0 : -1}
              >
                <div>
                  <span className="text-sm font-medium">{subItem.label}</span>
                  {subItem.description && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                      {subItem.description}
                    </p>
                  )}
                </div>
                {subItem.badge && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/10 text-brand-primary flex-shrink-0">
                    {subItem.badge}
                  </span>
                )}
                {subItem.external && (
                  <ExternalLink className="h-3.5 w-3.5 text-text-muted ml-2 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Hamburger Trigger
// ============================================

interface HamburgerTriggerProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

const HamburgerTrigger: React.FC<HamburgerTriggerProps> = ({
  isOpen,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative w-10 h-10 flex items-center justify-center
        rounded-lg text-text-secondary hover:text-text-primary
        hover:bg-white/5
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
        transition-colors duration-150
        ${className}
      `}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      aria-controls="mobile-menu-panel"
    >
      {/* Animated hamburger icon */}
      <div className="w-5 h-4 relative">
        <span
          className={`
            absolute left-0 h-0.5 w-5 bg-current rounded-full
            transition-all duration-300 ease-out
            ${isOpen ? 'top-2 rotate-45' : 'top-0 rotate-0'}
          `}
        />
        <span
          className={`
            absolute left-0 top-2 h-0.5 bg-current rounded-full
            transition-all duration-300 ease-out
            ${isOpen ? 'w-0 opacity-0' : 'w-4 opacity-100'}
          `}
        />
        <span
          className={`
            absolute left-0 h-0.5 w-5 bg-current rounded-full
            transition-all duration-300 ease-out
            ${isOpen ? 'top-2 -rotate-45' : 'top-4 rotate-0'}
          `}
        />
      </div>
    </button>
  );
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const MobileMenu: React.FC<MobileMenuProps> = ({
  items = [],
  ctas = [],
  isOpen: controlledIsOpen,
  onOpen,
  onClose,
  onItemClick,
  renderTrigger,
  showLogo = true,
  showCloseButton = true,
  showSocialLinks = false,
  className = '',
  style,
  id = 'mobile-menu',
  zIndex = DEFAULT_Z_INDEX,
  lockScroll = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  isAuthenticated = false,
  activePath,
}) => {
  // ============================================
  // State
  // ============================================
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [menuState, setMenuState] = useState<MobileMenuState>('closed');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Resolved open state
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  // ============================================
  // Effects
  // ============================================

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!lockScroll) return;

    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, lockScroll]);

  // Focus trap inside the menu when open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the first element
    firstFocusable.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable.focus();
          }
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle Escape key globally
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Cleanup animation timeouts
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleOpen = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setMenuState('opening');
    animationTimeoutRef.current = setTimeout(() => {
      setMenuState('open');
    }, 50); // Small delay for CSS to catch the opening state

    if (!isControlled) {
      setInternalIsOpen(true);
    }
    onOpen?.();
  }, [isControlled, onOpen]);

  const handleClose = useCallback(() => {
    setMenuState('closing');
    animationTimeoutRef.current = setTimeout(() => {
      setMenuState('closed');
      if (!isControlled) {
        setInternalIsOpen(false);
      }
    }, animationDuration);

    // Return focus to the trigger element
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }

    // Close all expanded submenus
    setExpandedItems(new Set());
    setActiveSubmenu(null);

    onClose?.();
  }, [isControlled, animationDuration, onClose]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [isOpen, handleOpen, handleClose]);

  const handleItemClick = useCallback(
    (item: NavItem, subItem?: NavSubItem) => {
      onItemClick?.(item, subItem);

      // Close menu after navigation (unless item has children)
      if (!item.children || subItem) {
        // Small delay to allow the user to see what they clicked
        setTimeout(() => {
          handleClose();
        }, 150);
      }
    },
    [onItemClick, handleClose]
  );

  const handleSubmenuToggle = useCallback((itemLabel: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemLabel)) {
        newSet.delete(itemLabel);
        setActiveSubmenu(null);
      } else {
        newSet.clear();
        newSet.add(itemLabel);
        setActiveSubmenu(itemLabel);
      }
      return newSet;
    });
  }, []);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent backdrop click from firing
  }, []);

  // ============================================
  // Derived State
  // ============================================

  const isVisible = menuState !== 'closed';
  const isAnimating = menuState === 'opening' || menuState === 'closing';
  const isOpenState = menuState === 'open' || menuState === 'opening';

  // ============================================
  // Context Value
  // ============================================

  const contextValue = useMemo<MobileMenuContextValue>(
    () => ({
      isOpen: isOpenState,
      open: handleOpen,
      close: handleClose,
      toggle: handleToggle,
      menuState,
    }),
    [isOpenState, handleOpen, handleClose, handleToggle, menuState]
  );

  // Filter CTA items based on auth state
  const filteredCtas = useMemo(() => {
    return ctas.filter((cta) => {
      if (cta.requiresAuth && !isAuthenticated) return false;
      return true;
    });
  }, [ctas, isAuthenticated]);

  // Determine if an item is active
  const isItemActive = useCallback(
    (item: NavItem): boolean => {
      if (!activePath) return false;
      if (item.href === activePath) return true;
      if (item.children?.some((sub) => sub.href === activePath)) return true;
      return false;
    },
    [activePath]
  );

  // ============================================
  // Render: Default Trigger
  // ============================================

  const defaultTrigger = (
    <HamburgerTrigger isOpen={isOpenState} onClick={handleToggle} />
  );

  const triggerElement = renderTrigger
    ? renderTrigger({ onClick: handleToggle, isOpen: isOpenState })
    : defaultTrigger;

  // ============================================
  // Render: Menu Panel
  // ============================================

  return (
    <MobileMenuContext.Provider value={contextValue}>
      {/* Trigger */}
      {triggerElement}

      {/* Backdrop + Panel */}
      {isVisible && (
        <div
          id={`${id}-backdrop`}
          className={`
            fixed inset-0 z-[var(--z-menu)]
            transition-opacity duration-300 ease-out
            ${isOpenState ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            ['--z-menu' as string]: String(zIndex),
            pointerEvents: isOpenState ? 'auto' : 'none',
          }}
          onClick={handleBackdropClick}
          aria-hidden={!isOpenState}
        >
          {/* Backdrop */}
          <div
            className={`
              absolute inset-0 bg-black/60 backdrop-blur-sm
              transition-opacity duration-300 ease-out
              ${isOpenState ? 'opacity-100' : 'opacity-0'}
            `}
          />

          {/* Panel */}
          <div
            ref={panelRef}
            id={`${id}-panel`}
            className={`
              absolute top-0 right-0 h-full w-full max-w-sm
              bg-brand-dark border-l border-brand-border
              flex flex-col
              shadow-2xl shadow-black/50
              transition-transform duration-300 ease-out
              ${isOpenState ? 'translate-x-0' : 'translate-x-full'}
            `}
            style={{
              transitionDuration: `${animationDuration}ms`,
            }}
            onClick={handlePanelClick}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border/50 flex-shrink-0">
              {showLogo && (
                <Logo
                  variant="full"
                  size="sm"
                  theme="dark"
                  linkToHome
                  onClick={handleClose}
                />
              )}

              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="
                    w-10 h-10 flex items-center justify-center
                    rounded-lg text-text-muted hover:text-text-primary
                    hover:bg-white/5
                    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
                    transition-colors duration-150
                  "
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Navigation Items */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              role="menu"
              aria-label="Mobile navigation"
            >
              {items.map((item, index) => (
                <MobileMenuSubmenu
                  key={`mobile-${item.id || item.label}-${index}`}
                  item={item}
                  isExpanded={expandedItems.has(item.label)}
                  onToggle={() => handleSubmenuToggle(item.label)}
                  onSubItemClick={(subItem) => handleItemClick(item, subItem)}
                  index={index}
                  isMenuOpen={isOpenState}
                />
              ))}

              {/* Empty state: no items */}
              {items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-brand-border/30 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-text-muted" />
                  </div>
                  <p className="text-sm text-text-muted">No navigation items</p>
                </div>
              )}
            </nav>

            {/* Footer: CTAs */}
            {filteredCtas.length > 0 && (
              <div className="px-5 py-4 border-t border-brand-border/50 space-y-3 flex-shrink-0">
                {filteredCtas.map((cta, index) => {
                  const isCtaButton = cta.isCTA || cta.ctaVariant === 'primary';

                  if (isCtaButton) {
                    return (
                      <a
                        key={`mobile-cta-${index}`}
                        href={cta.href}
                        className="
                          w-full flex items-center justify-center gap-2
                          px-6 py-3 rounded-xl
                          font-medium text-white
                          bg-gradient-to-r from-brand-primary to-brand-secondary
                          hover:shadow-glow-secondary
                          active:scale-[0.98]
                          transition-all duration-200
                        "
                        onClick={handleClose}
                      >
                        {cta.icon && <span>{cta.icon}</span>}
                        {cta.label}
                      </a>
                    );
                  }

                  return (
                    <a
                      key={`mobile-cta-${index}`}
                      href={cta.href}
                      className="
                        w-full flex items-center justify-center
                        px-6 py-3 rounded-xl
                        font-medium text-text-secondary
                        border border-brand-border
                        hover:text-text-primary hover:border-brand-primary/50
                        hover:bg-white/5
                        transition-all duration-200
                      "
                      onClick={handleClose}
                    >
                      {cta.label}
                    </a>
                  );
                })}
              </div>
            )}

            {/* Footer: Social Links (optional) */}
            {showSocialLinks && (
              <div className="px-5 py-3 border-t border-brand-border/50 flex items-center justify-center gap-4 flex-shrink-0">
                {/* Social links would go here */}
                <span className="text-xs text-text-muted">
                  © {new Date().getFullYear()} UPCATERS
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </MobileMenuContext.Provider>
  );
};

// ============================================
// 7. MOBILE MENU PROVIDER (for context usage)
// ============================================

export const MobileMenuProvider: React.FC<MobileMenuProviderProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuState, setMenuState] = useState<MobileMenuState>('closed');

  const open = useCallback(() => {
    setMenuState('opening');
    setTimeout(() => setMenuState('open'), 50);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setMenuState('closing');
    setTimeout(() => {
      setMenuState('closed');
      setIsOpen(false);
    }, DEFAULT_ANIMATION_DURATION);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const value = useMemo<MobileMenuContextValue>(
    () => ({ isOpen, open, close, toggle, menuState }),
    [isOpen, open, close, toggle, menuState]
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
};

// ============================================
// 8. DISPLAY NAME
// ============================================

MobileMenu.displayName = 'MobileMenu';
HamburgerTrigger.displayName = 'HamburgerTrigger';
MobileMenuSubmenu.displayName = 'MobileMenuSubmenu';
MobileMenuProvider.displayName = 'MobileMenuProvider';

// ============================================
// 9. NAMED EXPORTS
// ============================================

export {
  HamburgerTrigger,
  MobileMenuSubmenu,
  MobileMenuContext,
};

// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  MobileMenuState,
  MobileMenuContextValue,
  MobileMenuProps,
  MobileMenuSubmenuProps,
  HamburgerTriggerProps,
  MobileMenuProviderProps,
};

export default MobileMenu;
