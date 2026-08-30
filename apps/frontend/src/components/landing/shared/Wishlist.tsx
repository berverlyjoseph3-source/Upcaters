// ============================================
// apps/frontend/src/components/landing/shared/Waitlist.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
} from 'react';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  Users,
  Clock,
  Shield,
  Zap,
  X,
} from 'lucide-react';

// ============================================
// 1. TYPES
// ============================================

type WaitlistStatus = 'idle' | 'loading' | 'success' | 'error';
type WaitlistVariant = 'inline' | 'modal' | 'card' | 'hero' | 'banner';
type WaitlistSize = 'sm' | 'md' | 'lg';

interface WaitlistFormData {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  interests?: string[];
  source?: string;
  referrer?: string;
}

interface WaitlistResponse {
  success: boolean;
  message: string;
  position?: number;
  totalWaitlist?: number;
  referralCode?: string;
  error?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
  }>;
}

interface WaitlistProps {
  /** Visual variant of the waitlist component */
  variant?: WaitlistVariant;
  /** Size variant */
  size?: WaitlistSize;
  /** Whether to collect additional fields (name, company, role) */
  extended?: boolean;
  /** Whether to show interest checkboxes */
  showInterests?: boolean;
  /** Custom heading text */
  heading?: string;
  /** Custom subheading text */
  subheading?: string;
  /** Custom placeholder text */
  placeholder?: string;
  /** Custom button label */
  buttonLabel?: string;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
  /** Pre-fill email (e.g., from URL params) */
  initialEmail?: string;
  /** Source tracking (UTM or campaign) */
  source?: string;
  /** Referral code */
  referrer?: string;
  /** Called when waitlist submission succeeds */
  onSuccess?: (data: WaitlistResponse) => void;
  /** Called when waitlist submission fails */
  onError?: (error: string) => void;
  /** Called when the modal/dialog is closed */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Whether component is disabled */
  disabled?: boolean;
  /** API endpoint override (for testing) */
  endpoint?: string;
  /** Additional CSS styles */
  style?: React.CSSProperties;
}

interface InterestOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

// ============================================
// 2. CONSTANTS
// ============================================

const DEFAULT_INTERESTS: InterestOption[] = [
  {
    id: 'email-automation',
    label: 'Email Automation',
    icon: <Mail className="h-4 w-4" />,
    description: 'Auto-reply, classification & drafts',
  },
  {
    id: 'social-media',
    label: 'Social Media',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Multi-platform posting & scheduling',
  },
  {
    id: 'calendar-scheduling',
    label: 'Smart Scheduling',
    icon: <Clock className="h-4 w-4" />,
    description: 'AI-powered meeting coordination',
  },
  {
    id: 'task-management',
    label: 'Task Management',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Cross-platform task automation',
  },
  {
    id: 'content-generation',
    label: 'Content & AI',
    icon: <Zap className="h-4 w-4" />,
    description: 'Text, image & video generation',
  },
  {
    id: 'team-collaboration',
    label: 'Team Workflows',
    icon: <Users className="h-4 w-4" />,
    description: 'Multi-agent orchestration',
  },
];

const DEFAULT_PLACEHOLDER = 'Enter your email address';
const DEFAULT_BUTTON_LABEL = 'Join Waitlist';
const DEFAULT_HEADING = 'Get Early Access';
const DEFAULT_SUBHEADING = 'Join the waitlist to be first in line when we launch new features.';
const DEFAULT_SUCCESS_MESSAGE = "You're on the list! We'll notify you as soon as we launch.";
const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// ============================================
// 3. HELPER FUNCTIONS
// ============================================

const validateEmail = (email: string): boolean => {
  if (!email || email.trim().length === 0) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

const validateName = (name: string | undefined): boolean => {
  if (!name || name.trim().length === 0) return true; // Name is optional
  return name.trim().length >= 2;
};

const getInitialState = (initialEmail?: string): WaitlistFormData => ({
  email: initialEmail || '',
  name: '',
  company: '',
  role: '',
  interests: [],
  source: '',
  referrer: '',
});

// ============================================
// 4. MAIN COMPONENT
// ============================================

export const Waitlist: React.FC<WaitlistProps> = ({
  variant = 'inline',
  size = 'md',
  extended = false,
  showInterests = false,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  placeholder = DEFAULT_PLACEHOLDER,
  buttonLabel = DEFAULT_BUTTON_LABEL,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  initialEmail = '',
  source = 'landing_page',
  referrer = '',
  onSuccess,
  onError,
  onClose,
  className = '',
  disabled = false,
  endpoint,
  style,
}) => {
  // ============================================
  // State
  // ============================================
  const [formData, setFormData] = useState<WaitlistFormData>(
    getInitialState(initialEmail)
  );
  const [status, setStatus] = useState<WaitlistStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [response, setResponse] = useState<WaitlistResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // ============================================
  // Effects
  // ============================================

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current && variant !== 'card') {
      inputRef.current.focus();
    }
  }, [variant]);

  // Clear validation error when email changes
  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
  }, [formData.email]);

  // ============================================
  // Handlers
  // ============================================

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, email: e.target.value }));
    },
    []
  );

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, name: e.target.value }));
    },
    []
  );

  const handleCompanyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, company: e.target.value }));
    },
    []
  );

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, role: e.target.value }));
    },
    []
  );

  const handleInterestToggle = useCallback((interestId: string) => {
    setFormData((prev) => {
      const current = prev.interests || [];
      const updated = current.includes(interestId)
        ? current.filter((id) => id !== interestId)
        : [...current, interestId];
      return { ...prev, interests: updated };
    });
  }, []);

  const handleSubmit = useCallback(
    async (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault();

      // Validate email
      if (!validateEmail(formData.email)) {
        setValidationError('Please enter a valid email address.');
        inputRef.current?.focus();
        return;
      }

      // Validate name if provided
      if (formData.name && !validateName(formData.name)) {
        setValidationError('Name must be at least 2 characters.');
        return;
      }

      setStatus('loading');
      setError(null);
      setValidationError(null);

      try {
        const apiEndpoint =
          endpoint || '/api/waitlist/subscribe';

        const payload = {
          email: formData.email.trim(),
          ...(formData.name && { name: formData.name.trim() }),
          ...(formData.company && { company: formData.company.trim() }),
          ...(formData.role && { role: formData.role.trim() }),
          ...(formData.interests &&
            formData.interests.length > 0 && {
              interests: formData.interests,
            }),
          source: formData.source || source,
          ...(formData.referrer && { referrer: formData.referrer }),
        };

        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data: WaitlistResponse = await res.json();

        if (res.ok && data.success) {
          setStatus('success');
          setResponse(data);
          onSuccess?.(data);

          // Track conversion
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'waitlist_signup', {
              event_category: 'engagement',
              event_label: 'waitlist',
              value: data.position || 1,
            });
          }

          // Reset form after success
          setTimeout(() => {
            setFormData(getInitialState());
            setStatus('idle');
            setResponse(null);
          }, 5000);
        } else {
          setStatus('error');
          const errorMsg = data.error || data.message || errorMessage;
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        setStatus('error');
        const errorMsg =
          err instanceof Error ? err.message : errorMessage;
        setError(errorMsg);
        onError?.(errorMsg);
      }
    },
    [
      formData,
      source,
      endpoint,
      errorMessage,
      onSuccess,
      onError,
    ]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    },
    [handleSubmit, onClose]
  );

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setError(null);
    setValidationError(null);
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    onClose?.();
  }, [onClose]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // ============================================
  // Rendering: Size-dependent styles
  // ============================================

  const sizeStyles: Record<WaitlistSize, { input: string; button: string; gap: string }> = {
    sm: {
      input: 'h-10 px-3 text-sm',
      button: 'h-10 px-4 text-sm',
      gap: 'gap-2',
    },
    md: {
      input: 'h-12 px-4 text-base',
      button: 'h-12 px-6 text-base',
      gap: 'gap-3',
    },
    lg: {
      input: 'h-14 px-5 text-lg',
      button: 'h-14 px-8 text-lg',
      gap: 'gap-4',
    },
  };

  const sizeStyle = sizeStyles[size];

  // ============================================
  // Rendering: Status indicators
  // ============================================

  const renderStatusIndicator = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-brand-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Joining waitlist...</span>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center gap-2 py-4 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-1">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-green-500">
              {successMessage}
            </p>
            {response?.position && (
              <p className="text-xs text-text-muted mt-1">
                You're #{response.position.toLocaleString()} in line
                {response.totalWaitlist
                  ? ` of ${response.totalWaitlist.toLocaleString()}`
                  : ''}
              </p>
            )}
            {response?.referralCode && (
              <div className="mt-3 p-3 bg-brand-surface border border-brand-border rounded-lg w-full max-w-xs">
                <p className="text-xs text-text-muted mb-1">
                  Your referral code:
                </p>
                <code className="text-sm font-mono font-bold text-brand-primary">
                  {response.referralCode}
                </code>
                <p className="text-xs text-text-muted mt-1">
                  Share this to move up the list!
                </p>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center gap-2 py-3 px-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              className="text-xs text-brand-primary hover:text-brand-primary/80 transition-colors underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderValidationError = () => {
    if (!validationError) return null;
    return (
      <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{validationError}</span>
      </div>
    );
  };

  // ============================================
  // Rendering: Interest checkboxes
  // ============================================

  const renderInterests = () => {
    if (!showInterests) return null;

    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-text-muted mb-2">
          I'm interested in (optional):
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_INTERESTS.map((interest) => {
            const isSelected =
              formData.interests?.includes(interest.id) ?? false;
            return (
              <button
                key={interest.id}
                type="button"
                onClick={() => handleInterestToggle(interest.id)}
                disabled={disabled || status === 'loading'}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-xs
                  border transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    isSelected
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-brand-border text-text-muted hover:border-brand-primary/50 hover:text-text-secondary'
                  }
                `}
              >
                {interest.icon && (
                  <span
                    className={
                      isSelected
                        ? 'text-brand-primary'
                        : 'text-text-muted'
                    }
                  >
                    {interest.icon}
                  </span>
                )}
                <span className="text-left leading-tight">
                  {interest.label}
                </span>
                {isSelected && (
                  <CheckCircle className="h-3 w-3 ml-auto flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // Rendering: Extended fields
  // ============================================

  const renderExtendedFields = () => {
    if (!extended) return null;

    return (
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={formData.name || ''}
            onChange={handleNameChange}
            placeholder="Your name (optional)"
            disabled={disabled || status === 'loading'}
            className="
              w-full px-3 py-2 rounded-lg text-sm
              bg-brand-dark border border-brand-border
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-brand-primary
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          <input
            type="text"
            value={formData.company || ''}
            onChange={handleCompanyChange}
            placeholder="Company (optional)"
            disabled={disabled || status === 'loading'}
            className="
              w-full px-3 py-2 rounded-lg text-sm
              bg-brand-dark border border-brand-border
              text-text-primary placeholder:text-text-muted
              focus:outline-none focus:border-brand-primary
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
        </div>
        <input
          type="text"
          value={formData.role || ''}
          onChange={handleRoleChange}
          placeholder="Your role (optional)"
          disabled={disabled || status === 'loading'}
          className="
            w-full px-3 py-2 rounded-lg text-sm
            bg-brand-dark border border-brand-border
            text-text-primary placeholder:text-text-muted
            focus:outline-none focus:border-brand-primary
            transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        />
      </div>
    );
  };

  // ============================================
  // Rendering: Social proof row
  // ============================================

  const renderSocialProof = () => (
    <div className="flex items-center justify-center gap-4 mt-4 text-xs text-text-muted">
      <div className="flex items-center gap-1">
        <Shield className="h-3 w-3" />
        <span>No spam, ever</span>
      </div>
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        <span>Join 2,500+ on the list</span>
      </div>
    </div>
  );

  // ============================================
  // Rendering: Inline variant (default)
  // ============================================

  const renderInline = () => (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`w-full max-w-md ${className}`}
      style={style}
      noValidate
    >
      {status === 'success' ? (
        renderStatusIndicator()
      ) : (
        <>
          <div className={`flex ${sizeStyle.gap}`}>
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Mail className="h-4 w-4" />
              </div>
              <input
                ref={inputRef}
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || status === 'loading'}
                required
                autoComplete="email"
                aria-label="Email address"
                className={`
                  w-full pl-10 pr-4 rounded-lg
                  bg-brand-dark border border-brand-border
                  text-text-primary placeholder:text-text-muted
                  focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30
                  transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${sizeStyle.input}
                  ${validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30' : ''}
                `}
              />
            </div>
            <button
              type="submit"
              disabled={disabled || status === 'loading'}
              className={`
                relative inline-flex items-center justify-center
                font-medium text-white rounded-lg
                bg-gradient-to-r from-brand-primary to-brand-secondary
                hover:shadow-glow-secondary
                active:scale-95
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
                ${sizeStyle.button}
              `}
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{buttonLabel}</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
          {renderValidationError()}
          {status === 'error' && renderStatusIndicator()}
          {renderSocialProof()}
        </>
      )}
    </form>
  );

  // ============================================
  // Rendering: Card variant
  // ============================================

  const renderCard = () => (
    <div
      className={`
        w-full max-w-md bg-brand-surface border border-brand-border
        rounded-2xl p-6 shadow-lg
        ${className}
      `}
      style={style}
    >
      {/* Card Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary mb-3">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">
          {heading}
        </h3>
        <p className="text-sm text-text-muted mt-1">{subheading}</p>
      </div>

      {/* Card Body */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {status === 'success' ? (
          renderStatusIndicator()
        ) : (
          <>
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  ref={inputRef}
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled || status === 'loading'}
                  required
                  autoComplete="email"
                  aria-label="Email address"
                  className={`
                    w-full h-12 pl-10 pr-4 rounded-lg
                    bg-brand-dark border border-brand-border
                    text-text-primary placeholder:text-text-muted
                    focus:outline-none focus:border-brand-primary
                    transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${validationError ? 'border-red-500' : ''}
                  `}
                />
              </div>

              {renderExtendedFields()}

              <button
                type="submit"
                disabled={disabled || status === 'loading'}
                className="
                  w-full h-12 flex items-center justify-center gap-2
                  font-medium text-white rounded-lg
                  bg-gradient-to-r from-brand-primary to-brand-secondary
                  hover:shadow-glow-secondary
                  active:scale-[0.98]
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
                "
              >
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{buttonLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {renderValidationError()}
            {status === 'error' && renderStatusIndicator()}
            {renderInterests()}
          </>
        )}
      </form>
    </div>
  );

  // ============================================
  // Rendering: Hero variant (large, centered)
  // ============================================

  const renderHero = () => (
    <div
      className={`w-full max-w-lg mx-auto text-center ${className}`}
      style={style}
    >
      {/* Hero Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4">
          <Clock className="h-3.5 w-3.5 text-brand-primary" />
          <span className="text-xs font-medium text-brand-primary">
            Limited Early Access
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
          {heading}
        </h2>
        <p className="text-lg text-text-muted max-w-md mx-auto">
          {subheading}
        </p>
      </div>

      {/* Hero Form */}
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {status === 'success' ? (
          <div className="py-6">{renderStatusIndicator()}</div>
        ) : (
          <>
            <div className={`flex ${sizeStyle.gap} max-w-md mx-auto`}>
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  ref={inputRef}
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled || status === 'loading'}
                  required
                  autoComplete="email"
                  aria-label="Email address"
                  className={`
                    w-full pl-12 pr-4 rounded-xl
                    bg-brand-dark border border-brand-border
                    text-text-primary placeholder:text-text-muted
                    focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${sizeStyle.input}
                    text-lg
                    ${validationError ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                  `}
                />
              </div>
              <button
                type="submit"
                disabled={disabled || status === 'loading'}
                className={`
                  relative inline-flex items-center justify-center gap-2
                  font-semibold text-white rounded-xl
                  bg-gradient-to-r from-brand-primary to-brand-secondary
                  hover:shadow-xl hover:shadow-brand-secondary/25
                  active:scale-[0.97]
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
                  ${sizeStyle.button}
                  text-lg
                `}
              >
                {status === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>{buttonLabel}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>

            {renderValidationError()}
            {status === 'error' && renderStatusIndicator()}
            {renderSocialProof()}
          </>
        )}
      </form>
    </div>
  );

  // ============================================
  // Rendering: Banner variant (horizontal bar)
  // ============================================

  const renderBanner = () => (
    <div
      className={`
        w-full bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10
        border border-brand-border rounded-xl p-4
        ${className}
      `}
      style={style}
    >
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {status === 'success' ? (
          renderStatusIndicator()
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-brand-primary" />
              <span className="text-sm font-medium text-text-primary hidden sm:inline">
                {heading}
              </span>
            </div>
            <div className="flex flex-1 gap-2 w-full">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  ref={inputRef}
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={disabled || status === 'loading'}
                  required
                  autoComplete="email"
                  aria-label="Email address"
                  className={`
                    w-full h-10 pl-9 pr-3 rounded-lg text-sm
                    bg-brand-dark border border-brand-border
                    text-text-primary placeholder:text-text-muted
                    focus:outline-none focus:border-brand-primary
                    transition-colors duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${validationError ? 'border-red-500' : ''}
                  `}
                />
              </div>
              <button
                type="submit"
                disabled={disabled || status === 'loading'}
                className="
                  h-10 px-4 flex items-center gap-1.5
                  text-sm font-medium text-white rounded-lg
                  bg-gradient-to-r from-brand-primary to-brand-secondary
                  hover:opacity-90 active:scale-95
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                "
              >
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{buttonLabel}</span>
                )}
              </button>
            </div>
          </div>
        )}
        {validationError && (
          <div className="mt-2">
            {renderValidationError()}
          </div>
        )}
        {status === 'error' && renderStatusIndicator()}
      </form>
    </div>
  );

  // ============================================
  // Rendering: Modal variant
  // ============================================

  const renderModalTrigger = () => (
    <button
      onClick={handleOpenModal}
      disabled={disabled}
      className="
        inline-flex items-center gap-2 px-6 py-3
        font-medium text-white rounded-lg
        bg-gradient-to-r from-brand-primary to-brand-secondary
        hover:shadow-glow-secondary
        active:scale-95
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      <Sparkles className="h-4 w-4" />
      <span>{buttonLabel}</span>
    </button>
  );

  const renderModal = () => {
    if (!isModalOpen) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      >
        <div
          className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-brand-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {heading}
                </h3>
                <p className="text-xs text-text-muted">{subheading}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-brand-border/50 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
              {status === 'success' ? (
                renderStatusIndicator()
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      ref={inputRef}
                      type="email"
                      value={formData.email}
                      onChange={handleEmailChange}
                      onKeyDown={handleKeyDown}
                      placeholder={placeholder}
                      disabled={disabled || status === 'loading'}
                      required
                      autoComplete="email"
                      aria-label="Email address"
                      className={`
                        w-full h-12 pl-10 pr-4 rounded-lg
                        bg-brand-dark border border-brand-border
                        text-text-primary placeholder:text-text-muted
                        focus:outline-none focus:border-brand-primary
                        transition-colors duration-150
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${validationError ? 'border-red-500' : ''}
                      `}
                    />
                    {renderValidationError()}
                  </div>

                  {renderExtendedFields()}
                  {renderInterests()}

                  <button
                    type="submit"
                    disabled={disabled || status === 'loading'}
                    className="
                      w-full h-12 flex items-center justify-center gap-2
                      font-medium text-white rounded-lg
                      bg-gradient-to-r from-brand-primary to-brand-secondary
                      hover:shadow-glow-secondary
                      active:scale-[0.98]
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100
                    "
                  >
                    {status === 'loading' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>{buttonLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {renderSocialProof()}
                </div>
              )}

              {status === 'error' && !validationError && renderStatusIndicator()}
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // 5. RENDER: Variant Router
  // ============================================

  switch (variant) {
    case 'card':
      return renderCard();

    case 'hero':
      return renderHero();

    case 'banner':
      return renderBanner();

    case 'modal':
      return (
        <>
          {renderModalTrigger()}
          {renderModal()}
        </>
      );

    case 'inline':
    default:
      return renderInline();
  }
};

// ============================================
// 6. DISPLAY NAME (for React DevTools)
// ============================================

Waitlist.displayName = 'Waitlist';

// ============================================
// 7. DEFAULT EXPORT
// ============================================


export default Wishlist;
