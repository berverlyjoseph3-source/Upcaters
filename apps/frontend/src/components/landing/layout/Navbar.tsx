// ============================================
// apps/frontend/src/components/landing/layout/Navbar.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  createContext,
  useContext,
} from 'react';
import {
  ChevronDown,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { MobileMenu } from './MobileMenu';
import { Button } from '../../common/Button';
import type {
  NavItem,
  NavSubItem,
  NavbarConfig,
} from '../../../types/landing.types';

// ============================================
// 1. TYPES
// ============================================

type NavbarVariant = 'transparent' | 'solid' | 'blur';
type NavbarState = 'top' | 'scrolled' | 'hidden';
type DropdownAlignment = 'left' | 'right' | 'center';
type DropdownTrigger = 'hover' | 'click';

interface NavbarContextValue {
  /** Whether the navbar is in scrolled state */
  isScrolled: boolean;
  /** Whether the mobile menu is open */
  isMobileMenuOpen: boolean;
  /** Open the mobile menu */
  openMobileMenu: () => void;
  /** Close the mobile menu */
  closeMobileMenu: () => void;
  /** Toggle the mobile menu */
  toggleMobileMenu: () => void;
  /** Current navbar state */
  navbarState: NavbarState;
}

interface NavbarProps {
  /** Full navbar configuration (from landing.config.ts) */
  config?: NavbarConfig;
  /** Navigation items */
  items?: NavItem[];
  /** CTA buttons on the right */
  ctas?: NavItem[];
  /** Visual variant */
  variant?: NavbarVariant;
  /** Whether the navbar starts transparent (becomes solid on scroll) */
  transparentOnTop?: boolean;
  /** Whether the navbar hides on scroll down and shows on scroll up */
  hideOnScroll?: boolean;
  /** Height of the navbar */
  height?: number;
  /** Whether to show the mobile menu toggle */
  showMobileMenu?: boolean;
  /** Mobile breakpoint in pixels */
  mobileBreakpoint?: number;
  /** Called when a nav item is clicked */
  onItemClick?: (item: NavItem, subItem?: NavSubItem) => void;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Current active path for highlighting */
  activePath?: string;
  /** Whether to show the announcement banner above */
  showAnnouncement?: boolean;
  /** Announcement banner content */
  announcement?: {
    text: string;
    cta?: { label: string; href: string };
    variant?: 'info' | 'success' | 'warning';
  };
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

interface DropdownMenuProps {
  /** Parent nav item */
  item: NavItem;
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Called when the dropdown closes */
  onClose: () => void;
  /** Called when a sub-item is clicked */
  onSubItemClick: (subItem: NavSubItem) => void;
  /** Alignment of the dropdown */
  align?: DropdownAlignment;
}

// ============================================
// 2. CONTEXT
// ============================================

const NavbarContext = createContext<NavbarContextValue | null>(null);

export const useNavbar = (): NavbarContextValue => {
  const context = useContext(NavbarContext);
  if (!context) {
    throw new Error('useNavbar must be used within a NavbarProvider');
  }
  return context;
};

// ============================================
// 3. CONSTANTS
// ============================================

const DEFAULT_HEIGHT = 72;
const DEFAULT_MOBILE_BREAKPOINT = 1024;
const SCROLL_THRESHOLD = 50;
const SCROLL_HIDE_THRESHOLD = 100;

// ============================================
// 4. SUB-COMPONENT: Announcement Banner
// ============================================

interface AnnouncementBannerProps {
  text: string;
  cta?: { label: string; href: string };
  variant?: 'info' | 'success' | 'warning';
  onDismiss?: () => void;
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  text,
  cta,
  variant = 'info',
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  if (isDismissed) return null;

  const variantStyles = {
    info: 'bg-gradient-to-r from-brand-primary/20 to-brand-secondary/20 border-brand-primary/20 text-brand-primary',
    success: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/20 text-green-500',
    warning: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/20 text-yellow-500',
  };

  return (
    <div
      className={`
        w-full border-b px-4 py-2.5
        flex items-center justify-center gap-3
        text-sm font-medium text-center
        ${variantStyles[variant]}
      `}
      role="banner"
      aria-label="Announcement"
    >
      <span>{text}</span>
      {cta && (
        <a
          href={cta.href}
          className="
            inline-flex items-center gap-1
            px-2.5 py-0.5 rounded-full
            bg-white/10 hover:bg-white/20
            transition-colors duration-200
            underline underline-offset-2
          "
        >
          {cta.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
      <button
        onClick={handleDismiss}
        className="
          p-1 rounded-full hover:bg-white/10
          transition-colors duration-200
          flex-shrink-0
        "
        aria-label="Dismiss announcement"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Dropdown Menu
// ============================================

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  item,
  isOpen,
  onClose,
  onSubItemClick,
  align = 'left',
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !item.children) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!item.children) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < item.children!.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : item.children!.length - 1
        );
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const subItem = item.children[activeIndex];
        onSubItemClick(subItem);
        onClose();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, item.children, activeIndex, onSubItemClick, onClose]);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  if (!item.children || item.children.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className={`
        absolute top-full ${alignmentClasses[align]} mt-2
        w-72 bg-brand-surface
        border border-brand-border
        rounded-xl shadow-2xl shadow-black/30
        backdrop-blur-xl
        overflow-hidden
        transition-all duration-200 ease-out origin-top
        ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
      `}
      role="menu"
      aria-label={`${item.label} submenu`}
      aria-hidden={!isOpen}
    >
      {/* Dropdown header */}
      {item.label && (
        <div className="px-4 py-3 border-b border-brand-border/50">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {item.label}
          </p>
        </div>
      )}

      {/* Sub-items */}
      <div className="py-2">
        {item.children.map((subItem, index) => {
          const isActive = activeIndex === index;
          const isDisabled = subItem.disabled;

          return (
            <a
              key={`dropdown-${subItem.label}-${index}`}
              href={isDisabled ? undefined : subItem.href}
              target={subItem.external ? '_blank' : undefined}
              rel={subItem.external ? 'noopener noreferrer' : undefined}
              className={`
                flex items-start gap-3 px-4 py-3
                transition-colors duration-150
                ${isActive ? 'bg-brand-primary/10' : 'hover:bg-white/5'}
                ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                group
              `}
              onClick={(e) => {
                if (isDisabled) {
                  e.preventDefault();
                  return;
                }
                if (subItem.href.startsWith('#')) {
                  e.preventDefault();
                  const element = document.querySelector(subItem.href);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }
                onSubItemClick(subItem);
                onClose();
              }}
              role="menuitem"
              tabIndex={isOpen ? 0 : -1}
            >
              {/* Icon */}
              {subItem.icon && (
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-border/20 flex items-center justify-center text-text-muted group-hover:text-brand-primary transition-colors duration-200">
                  {subItem.icon}
                </span>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary group-hover:text-brand-primary transition-colors duration-200">
                    {subItem.label}
                  </span>
                  {subItem.badge && (
                    <span
                      className={`
                        inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0
                        ${
                          subItem.badgeVariant === 'success'
                            ? 'bg-green-500/10 text-green-500'
                            : subItem.badgeVariant === 'warning'
                              ? 'bg-yellow-500/10 text-yellow-500'
                              : 'bg-brand-primary/10 text-brand-primary'
                        }
                      `}
                    >
                      {subItem.badge}
                    </span>
                  )}
                  {subItem.external && (
                    <ExternalLink className="h-3 w-3 text-text-muted flex-shrink-0" />
                  )}
                </div>
                {subItem.description && (
                  <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                    {subItem.description}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>

      {/* Dropdown footer (optional CTA) */}
      {item.children.length > 5 && (
        <div className="px-4 py-3 border-t border-brand-border/50 bg-white/[0.02]">
          <a
            href={item.href || '#'}
            className="
              flex items-center justify-center gap-1.5
              text-xs font-medium text-brand-primary
              hover:text-brand-primary/80
              transition-colors duration-200
            "
          >
            View all {item.label.toLowerCase()}
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const Navbar: React.FC<NavbarProps> = ({
  config,
  items: propItems,
  ctas: propCtas,
  variant: propVariant,
  transparentOnTop = true,
  hideOnScroll = false,
  height = DEFAULT_HEIGHT,
  showMobileMenu = true,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  onItemClick,
  isAuthenticated = false,
  activePath,
  showAnnouncement = false,
  announcement,
  className = '',
  style,
  id = 'navbar',
}) => {
  // ============================================
  // Resolve props from config or direct props
  // ============================================
  const items = propItems || config?.items || [];
  const ctas = propCtas || config?.ctas || [];
  const resolvedTransparentOnTop = transparentOnTop ?? config?.transparentOnTop ?? true;
  const resolvedShowMobileMenu = showMobileMenu ?? config?.showMobileMenu ?? true;

  // ============================================
  // State
  // ============================================
  const [navbarState, setNavbarState] = useState<NavbarState>('top');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(
    showAnnouncement
  );

  const navbarRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const scrollDirectionRef = useRef<'up' | 'down'>('up');
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // Effects: Scroll Handling
  // ============================================

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine if scrolled past threshold
      setIsScrolled(currentScrollY > SCROLL_THRESHOLD);

      // Determine scroll direction
      if (currentScrollY > lastScrollY.current) {
        scrollDirectionRef.current = 'down';
      } else {
        scrollDirectionRef.current = 'up';
      }
      lastScrollY.current = currentScrollY;

      // Handle hide-on-scroll behavior
      if (hideOnScroll) {
        if (currentScrollY < SCROLL_HIDE_THRESHOLD) {
          setNavbarState('top');
        } else if (scrollDirectionRef.current === 'down' && currentScrollY > SCROLL_HIDE_THRESHOLD) {
          setNavbarState('hidden');
        } else if (scrollDirectionRef.current === 'up') {
          setNavbarState('scrolled');
        }
      } else {
        setNavbarState(currentScrollY > SCROLL_THRESHOLD ? 'scrolled' : 'top');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hideOnScroll]);

  // ============================================
  // Effects: Mobile Detection
  // ============================================

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  // ============================================
  // Effects: Announcement Dismiss
  // ============================================

  useEffect(() => {
    if (showAnnouncement) {
      setIsAnnouncementVisible(true);
    }
  }, [showAnnouncement]);

  // ============================================
  // Handlers
  // ============================================

  const handleDropdownToggle = useCallback(
    (itemLabel: string) => {
      setActiveDropdown((prev) => (prev === itemLabel ? null : itemLabel));
    },
    []
  );

  const handleDropdownClose = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  const handleItemClick = useCallback(
    (item: NavItem, subItem?: NavSubItem) => {
      setActiveDropdown(null);
      onItemClick?.(item, subItem);
    },
    [onItemClick]
  );

  const handleMouseEnter = useCallback((itemLabel: string) => {
    if (window.innerWidth >= mobileBreakpoint) {
      // Clear any pending close timer
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setActiveDropdown(itemLabel);
    }
  }, [mobileBreakpoint]);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth >= mobileBreakpoint) {
      // Small delay to allow moving mouse to dropdown
      hideTimerRef.current = setTimeout(() => {
        setActiveDropdown(null);
      }, 200);
    }
  }, [mobileBreakpoint]);

  const handleOpenMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // ============================================
  // Derived State
  // ============================================

  const variant: NavbarVariant = useMemo(() => {
    if (propVariant) return propVariant;
    if (resolvedTransparentOnTop && navbarState === 'top' && !isScrolled) {
      return 'transparent';
    }
    return 'blur';
  }, [propVariant, resolvedTransparentOnTop, navbarState, isScrolled]);

  const navbarClasses = useMemo(() => {
    const base = 'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out';

    const variants = {
      transparent: 'bg-transparent',
      solid: 'bg-brand-dark border-b border-brand-border shadow-sm',
      blur: 'bg-brand-dark/85 backdrop-blur-xl border-b border-brand-border/50 shadow-sm',
    };

    const stateClasses = {
      top: '',
      scrolled: '',
      hidden: '-translate-y-full',
    };

    return `${base} ${variants[variant]} ${stateClasses[navbarState]}`;
  }, [variant, navbarState]);

  // Filter CTAs based on auth state
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
  // Context Value
  // ============================================

  const contextValue = useMemo<NavbarContextValue>(
    () => ({
      isScrolled,
      isMobileMenuOpen,
      openMobileMenu: handleOpenMobileMenu,
      closeMobileMenu: handleCloseMobileMenu,
      toggleMobileMenu: handleToggleMobileMenu,
      navbarState,
    }),
    [
      isScrolled,
      isMobileMenuOpen,
      handleOpenMobileMenu,
      handleCloseMobileMenu,
      handleToggleMobileMenu,
      navbarState,
    ]
  );

  // ============================================
  // Render: Nav Item
  // ============================================

  const renderNavItem = useCallback(
    (item: NavItem, index: number) => {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = isItemActive(item);
      const isDropdownOpen = activeDropdown === item.label;

      if (hasChildren) {
        return (
          <div
            key={`nav-${item.id || item.label}-${index}`}
            className="relative"
            onMouseEnter={() => handleMouseEnter(item.label)}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className={`
                flex items-center gap-1.5
                px-3 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${
                  isActive
                    ? 'text-brand-primary bg-brand-primary/10'
                    : isDropdownOpen
                      ? 'text-text-primary bg-white/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }
              `}
              onClick={() => handleDropdownToggle(item.label)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
            >
              {item.label}
              <ChevronDown
                className={`
                  h-4 w-4 transition-transform duration-200
                  ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}
                `}
              />
              {item.badge && (
                <span
                  className={`
                    ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium
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
            </button>

            <DropdownMenu
              item={item}
              isOpen={isDropdownOpen}
              onClose={handleDropdownClose}
              onSubItemClick={(subItem) => handleItemClick(item, subItem)}
              align={
                index > items.length - 3 ? 'right' : 'left'
              }
            />
          </div>
        );
      }

      // Simple link (no children)
      return (
        <a
          key={`nav-${item.id || item.label}-${index}`}
          href={item.href}
          target={item.external ? '_blank' : undefined}
          rel={item.external ? 'noopener noreferrer' : undefined}
          className={`
            flex items-center gap-1.5
            px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              isActive
                ? 'text-brand-primary bg-brand-primary/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }
          `}
          onClick={(e) => {
            if (item.href.startsWith('#')) {
              e.preventDefault();
              const element = document.querySelector(item.href);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }
            handleItemClick(item);
          }}
        >
          {item.label}
          {item.external && <ExternalLink className="h-3 w-3" />}
          {item.badge && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/10 text-brand-primary">
              {item.badge}
            </span>
          )}
        </a>
      );
    },
    [
      items.length,
      activeDropdown,
      isItemActive,
      handleMouseEnter,
      handleMouseLeave,
      handleDropdownToggle,
      handleDropdownClose,
      handleItemClick,
    ]
  );

  // ============================================
  // Render: CTA Buttons
  // ============================================

  const renderCTAs = useCallback(() => {
    return filteredCtas.map((cta, index) => {
      const isPrimary = cta.isCTA || cta.ctaVariant === 'primary';

      if (isPrimary) {
        return (
          <a
            key={`cta-${index}`}
            href={cta.href}
            className="
              inline-flex items-center gap-2
              px-4 py-2 rounded-lg
              text-sm font-medium text-white
              bg-gradient-to-r from-brand-primary to-brand-secondary
              hover:shadow-glow-secondary
              active:scale-[0.97]
              transition-all duration-200
            "
            onClick={() => handleItemClick(cta)}
          >
            {cta.icon && <span>{cta.icon}</span>}
            {cta.label}
          </a>
        );
      }

      return (
        <a
          key={`cta-${index}`}
          href={cta.href}
          className="
            px-4 py-2 rounded-lg
            text-sm font-medium text-text-secondary
            hover:text-text-primary
            transition-colors duration-200
          "
          onClick={() => handleItemClick(cta)}
        >
          {cta.label}
        </a>
      );
    });
  }, [filteredCtas, handleItemClick]);

  // ============================================
  // Render
  // ============================================

  return (
    <NavbarContext.Provider value={contextValue}>
      <header
        ref={navbarRef}
        id={id}
        className={`${navbarClasses} ${className}`}
        style={{
          height: `${height}px`,
          ...style,
        }}
        role="banner"
      >
        {/* Announcement Banner */}
        {isAnnouncementVisible && announcement && (
          <AnnouncementBanner
            text={announcement.text}
            cta={announcement.cta}
            variant={announcement.variant || 'info'}
            onDismiss={() => setIsAnnouncementVisible(false)}
          />
        )}

        {/* Navbar Inner */}
        <nav
          className="
            h-full max-w-7xl mx-auto
            flex items-center justify-between
            px-4 sm:px-6 lg:px-8
          "
          role="navigation"
          aria-label="Main navigation"
        >
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Logo
              variant="full"
              size="md"
              theme="dark"
              linkToHome
            />
          </div>

          {/* Center: Desktop Navigation (hidden on mobile) */}
          <div className="hidden lg:flex items-center gap-1">
            {items.map((item, index) => renderNavItem(item, index))}

            {/* Empty state: no nav items */}
            {items.length === 0 && (
              <div className="text-sm text-text-muted px-3">
                {/* Intentionally empty — items will be populated from config */}
              </div>
            )}
          </div>

          {/* Right: CTAs + Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            {/* Desktop CTAs (hidden on mobile) */}
            <div className="hidden lg:flex items-center gap-2">
              {renderCTAs()}
            </div>

            {/* Mobile Menu Toggle */}
            {resolvedShowMobileMenu && (
              <div className="lg:hidden">
                <MobileMenu
                  items={items}
                  ctas={ctas}
                  isOpen={isMobileMenuOpen}
                  onOpen={handleOpenMobileMenu}
                  onClose={handleCloseMobileMenu}
                  onItemClick={handleItemClick}
                  isAuthenticated={isAuthenticated}
                  activePath={activePath}
                  showLogo={false}
                  showSocialLinks
                />
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Spacer div to prevent content from going under fixed navbar */}
      <div style={{ height: `${height}px` }} aria-hidden="true" />
    </NavbarContext.Provider>
  );
};

// ============================================
// 7. NAVBAR PROVIDER (for context usage)
// ============================================

interface NavbarProviderProps {
  children: React.ReactNode;
  config?: NavbarConfig;
}

export const NavbarProvider: React.FC<NavbarProviderProps> = ({
  children,
  config,
}) => {
  // This provider wraps the entire app and manages navbar state
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [navbarState, setNavbarState] = useState<NavbarState>('top');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > SCROLL_THRESHOLD);
      setNavbarState(currentScrollY > SCROLL_THRESHOLD ? 'scrolled' : 'top');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openMobileMenu = useCallback(() => setIsMobileMenuOpen(true), []);
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(
    () => setIsMobileMenuOpen((prev) => !prev),
    []
  );

  const value = useMemo<NavbarContextValue>(
    () => ({
      isScrolled,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      navbarState,
    }),
    [
      isScrolled,
      isMobileMenuOpen,
      openMobileMenu,
      closeMobileMenu,
      toggleMobileMenu,
      navbarState,
    ]
  );

  return (
    <NavbarContext.Provider value={value}>
      {children}
    </NavbarContext.Provider>
  );
};

// ============================================
// 8. DISPLAY NAME
// ============================================

Navbar.displayName = 'Navbar';
DropdownMenu.displayName = 'DropdownMenu';
AnnouncementBanner.displayName = 'AnnouncementBanner';

// ============================================
// 9. NAMED EXPORTS
// ============================================


// ============================================
// 10. TYPE EXPORTS
// ============================================

export type {
  NavbarVariant,
  NavbarState,
  DropdownAlignment,
  DropdownTrigger,
  NavbarContextValue,
  NavbarProps,
  DropdownMenuProps,
  AnnouncementBannerProps,
  NavbarProviderProps,
};

export default Navbar;
