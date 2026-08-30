// ============================================
// apps/frontend/src/components/landing/layout/Footer.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useCallback,
  useMemo,
  FormEvent,
} from 'react';
import {
  ArrowRight,
  Mail,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Logo } from '../shared/Logo';
import { SocialProof } from '../shared/SocialProof';
import type { FooterConfig, FooterColumn } from '../../../types/landing.types';

// ============================================
// 1. TYPES
// ============================================

type NewsletterStatus = 'idle' | 'loading' | 'success' | 'error';

interface FooterProps {
  /** Full footer configuration (from landing.config.ts) */
  config?: FooterConfig;
  /** Logo configuration */
  logo?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    href?: string;
  };
  /** Company description */
  description?: string;
  /** Navigation columns */
  columns?: FooterColumn[];
  /** Social media links */
  socialLinks?: Array<{
    platform: string;
    href: string;
    icon: React.ReactNode;
  }>;
  /** Copyright text */
  copyright?: string;
  /** Bottom links (Privacy, Terms, etc.) */
  bottomLinks?: Array<{
    label: string;
    href: string;
  }>;
  /** Newsletter signup configuration */
  newsletter?: {
    heading: string;
    placeholder: string;
    buttonLabel: string;
    onSubmit: (email: string) => void;
  };
  /** Whether to show the newsletter section */
  showNewsletter?: boolean;
  /** Whether to show trust badges */
  showTrustBadges?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** ID for the component */
  id?: string;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Integrations', href: '/integrations' },
      { label: 'Changelog', href: '/changelog' },
      { label: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Blog', href: '/blog' },
      { label: 'Guides', href: '/guides' },
      { label: 'Community', href: '/community' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
      { label: 'Partners', href: '/partners' },
      { label: 'Press', href: '/press' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security', href: '/security' },
      { label: 'GDPR', href: '/gdpr' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

const DEFAULT_SOCIAL_LINKS = [
  {
    platform: 'X (Twitter)',
    href: 'https://x.com/upcaters',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    platform: 'LinkedIn',
    href: 'https://linkedin.com/company/upcaters',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    platform: 'GitHub',
    href: 'https://github.com/upcaters',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    platform: 'Discord',
    href: 'https://discord.gg/upcaters',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
      </svg>
    ),
  },
  {
    platform: 'YouTube',
    href: 'https://youtube.com/@upcaters',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 01-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 01-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 011.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418zM15.194 12l-5.196-3v6l5.196-3z" clipRule="evenodd" />
      </svg>
    ),
  },
];

const TRUST_BADGES = [
  'SOC 2 Type II Compliant',
  'GDPR Ready',
  '99.99% Uptime SLA',
  'AES-256 Encryption',
];

// ============================================
// 3. SUB-COMPONENT: Newsletter Form
// ============================================

interface NewsletterFormProps {
  heading?: string;
  placeholder?: string;
  buttonLabel?: string;
  onSubmit: (email: string) => void;
  className?: string;
}

const NewsletterForm: React.FC<NewsletterFormProps> = ({
  heading = 'Stay in the loop',
  placeholder = 'Enter your email',
  buttonLabel = 'Subscribe',
  onSubmit,
  className = '',
}) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<NewsletterStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value.trim());
  };

  const handleSubmit = useCallback(
    async (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault();

      if (!validateEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }

      setStatus('loading');
      setErrorMessage(null);

      try {
        await onSubmit(email.trim());
        setStatus('success');
        setEmail('');

        // Reset success state after 4 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 4000);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        );
        setTimeout(() => {
          setStatus('idle');
          setErrorMessage(null);
        }, 4000);
      }
    },
    [email, onSubmit]
  );

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
  }, []);

  return (
    <div className={`w-full max-w-sm ${className}`}>
      {/* Heading */}
      {heading && (
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          {heading}
        </h3>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <Mail className="h-4 w-4" />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={placeholder}
            disabled={status === 'loading'}
            required
            autoComplete="email"
            aria-label="Email address"
            className={`
              w-full h-10 pl-10 pr-4 rounded-lg text-sm
              bg-brand-dark border border-brand-border
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${errorMessage ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
            `}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`
            w-full h-10 flex items-center justify-center gap-2
            rounded-lg text-sm font-medium
            transition-all duration-200
            ${
              status === 'success'
                ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                : 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:shadow-glow-secondary active:scale-[0.98]'
            }
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
          `}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Subscribing...</span>
            </>
          ) : status === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Subscribed!</span>
            </>
          ) : (
            <>
              <span>{buttonLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={handleRetry}
            className="ml-auto text-xs text-brand-primary hover:text-brand-primary/80 transition-colors underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Privacy note */}
      <p className="mt-2 text-xs text-text-muted">
        No spam, ever. Unsubscribe anytime.
      </p>
    </div>
  );
};

// ============================================
// 4. SUB-COMPONENT: Social Icons
// ============================================

interface SocialIconsProps {
  links: Array<{
    platform: string;
    href: string;
    icon: React.ReactNode;
  }>;
  className?: string;
}

const SocialIcons: React.FC<SocialIconsProps> = ({ links, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {links.map((link, index) => (
        <a
          key={`social-${link.platform}-${index}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="
            w-9 h-9 flex items-center justify-center
            rounded-lg text-text-muted
            hover:text-text-primary hover:bg-white/5
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
            transition-all duration-200
          "
          aria-label={`Follow us on ${link.platform}`}
          title={link.platform}
        >
          {link.icon}
        </a>
      ))}
    </div>
  );
};

// ============================================
// 5. SUB-COMPONENT: Footer Column
// ============================================

interface FooterColumnComponentProps {
  column: FooterColumn;
  className?: string;
}

const FooterColumnComponent: React.FC<FooterColumnComponentProps> = ({
  column,
  className = '',
}) => {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-text-primary mb-4">
        {column.heading}
      </h3>
      <ul className="space-y-3">
        {column.links.map((link, index) => (
          <li key={`footer-link-${link.label}-${index}`}>
            <a
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="
                inline-flex items-center gap-1.5
                text-sm text-text-muted
                hover:text-text-primary
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
                transition-colors duration-200
                group
              "
            >
              <span>{link.label}</span>
              {link.badge && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-primary/10 text-brand-primary">
                  {link.badge}
                </span>
              )}
              {link.external && (
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================
// 6. MAIN COMPONENT
// ============================================

export const Footer: React.FC<FooterProps> = ({
  config,
  logo: propLogo,
  description: propDescription,
  columns: propColumns,
  socialLinks: propSocialLinks,
  copyright: propCopyright,
  bottomLinks: propBottomLinks,
  newsletter: propNewsletter,
  showNewsletter = true,
  showTrustBadges = true,
  className = '',
  style,
  id = 'footer',
}) => {
  // ============================================
  // Resolve props from config or direct props
  // ============================================
  const resolvedLogo = propLogo || (config?.logo ? {
    src: config.logo.light,
    alt: config.logo.alt,
    width: config.logo.width,
    height: config.logo.height,
    href: config.logo.href || '/',
  } : undefined);

  const resolvedDescription = propDescription || config?.description || '';
  const resolvedColumns = propColumns || config?.columns || DEFAULT_COLUMNS;
  const resolvedSocialLinks = propSocialLinks || config?.socialLinks || DEFAULT_SOCIAL_LINKS;
  const resolvedCopyright =
    propCopyright ||
    config?.copyright ||
    `© ${new Date().getFullYear()} UPCATERS. All rights reserved.`;
  const resolvedBottomLinks =
    propBottomLinks ||
    config?.bottomLinks ||
    [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Settings', href: '#cookie-settings' },
    ];
  const resolvedNewsletter =
    propNewsletter ||
    (config?.newsletter
      ? {
          heading: config.newsletter.heading,
          placeholder: config.newsletter.placeholder,
          buttonLabel: config.newsletter.buttonLabel,
          onSubmit: config.newsletter.onSubmit,
        }
      : undefined);

  // ============================================
  // Render
  // ============================================

  return (
    <footer
      id={id}
      className={`
        bg-brand-dark border-t border-brand-border
        pt-12 pb-6 md:pt-16 md:pb-8
        ${className}
      `}
      style={style}
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ============================================ */}
        {/* Top Section: Grid */}
        {/* ============================================ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand Column (spans 2 on large screens) */}
          <div className="col-span-2 flex flex-col gap-4">
            {/* Logo */}
            {resolvedLogo && (
              <a
                href={resolvedLogo.href || '/'}
                className="inline-flex items-center flex-shrink-0"
                aria-label="Go to homepage"
              >
                <img
                  src={resolvedLogo.src}
                  alt={resolvedLogo.alt}
                  width={resolvedLogo.width}
                  height={resolvedLogo.height}
                  className="h-8 w-auto object-contain"
                  loading="lazy"
                />
              </a>
            )}

            {/* Description */}
            {resolvedDescription && (
              <p className="text-sm text-text-muted leading-relaxed max-w-xs">
                {resolvedDescription}
              </p>
            )}

            {/* Social Links */}
            {resolvedSocialLinks.length > 0 && (
              <SocialIcons links={resolvedSocialLinks} />
            )}

            {/* Trust Badges */}
            {showTrustBadges && (
              <div className="flex flex-wrap gap-2 mt-2">
                {TRUST_BADGES.map((badge, index) => (
                  <span
                    key={`trust-${index}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-brand-surface border border-brand-border text-text-muted"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Columns */}
          {resolvedColumns.map((column, index) => (
            <FooterColumnComponent
              key={`footer-col-${index}`}
              column={column}
            />
          ))}

          {/* Newsletter Column */}
          {showNewsletter && resolvedNewsletter && (
            <div className="col-span-2 md:col-span-1">
              <NewsletterForm
                heading={resolvedNewsletter.heading}
                placeholder={resolvedNewsletter.placeholder}
                buttonLabel={resolvedNewsletter.buttonLabel}
                onSubmit={resolvedNewsletter.onSubmit}
              />
            </div>
          )}
        </div>

        {/* ============================================ */}
        {/* Bottom Section */}
        {/* ============================================ */}
        <div
          className="
            flex flex-col sm:flex-row
            items-center justify-between
            gap-4 pt-6
            border-t border-brand-border/50
          "
        >
          {/* Copyright */}
          <p className="text-sm text-text-muted text-center sm:text-left">
            {resolvedCopyright}
          </p>

          {/* Bottom Links */}
          {resolvedBottomLinks.length > 0 && (
            <nav aria-label="Legal links">
              <ul className="flex flex-wrap items-center justify-center gap-4">
                {resolvedBottomLinks.map((link, index) => (
                  <li key={`bottom-link-${index}`}>
                    <a
                      href={link.href}
                      className="
                        text-sm text-text-muted
                        hover:text-text-primary
                        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary
                        transition-colors duration-200
                      "
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
};

// ============================================
// 7. DISPLAY NAME
// ============================================

Footer.displayName = 'Footer';
NewsletterForm.displayName = 'NewsletterForm';
SocialIcons.displayName = 'SocialIcons';
FooterColumnComponent.displayName = 'FooterColumnComponent';

// ============================================
// 8. NAMED EXPORTS
// ============================================


// ============================================
// 9. TYPE EXPORTS
// ============================================

export type {
  NewsletterStatus,
  NewsletterFormProps,
  SocialIconsProps,
  FooterColumnComponentProps,
  FooterProps,
};

// ============================================
// 10. DEFAULT EXPORT
// ============================================


export default Footer;
