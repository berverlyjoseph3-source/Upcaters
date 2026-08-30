// enterprise-ai-agent-platform/apps/frontend/src/components/auth/RegisterForm.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { SocialAuthButtons } from './SocialAuthButtons';

// Password strength levels
type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

// Validation schema with comprehensive password rules
const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional()
    .or(z.literal('')),
  
  email: z.string()
    .min(1, 'Email is required')
    .max(255, 'Email must not exceed 255 characters')
    .email('Please enter a valid email address')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Invalid email format'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  
  acceptTerms: z.boolean()
    .refine(val => val === true, 'You must accept the Terms of Service and Privacy Policy'),
  
  acceptMarketing: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
  validationErrors?: Array<{ field: string; message: string }>;
  onOAuthStart?: (provider: string) => void;
}

// Password strength calculator
const calculatePasswordStrength = (password: string): { strength: PasswordStrength; score: number; feedback: string[] } => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  const feedback: string[] = [];
  if (!checks.length) feedback.push('At least 8 characters');
  if (!checks.uppercase) feedback.push('One uppercase letter');
  if (!checks.lowercase) feedback.push('One lowercase letter');
  if (!checks.number) feedback.push('One number');
  if (!checks.special) feedback.push('One special character');
  
  let strength: PasswordStrength = 'weak';
  if (score >= 5) strength = 'very-strong';
  else if (score >= 4) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  else strength = 'weak';
  
  return { strength, score, feedback };
};

const strengthColors: Record<PasswordStrength, { bg: string; text: string; label: string }> = {
  weak: { bg: 'bg-error', text: 'text-error', label: 'Weak' },
  medium: { bg: 'bg-warning', text: 'text-warning', label: 'Medium' },
  strong: { bg: 'bg-primary-500', text: 'text-primary-600', label: 'Strong' },
  'very-strong': { bg: 'bg-success', text: 'text-success', label: 'Very Strong' },
};

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  isLoading = false,
  error,
  validationErrors = [],
  onOAuthStart,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptMarketing: false,
    },
    mode: 'onBlur',
  });

  const password = watch('password');

  // Update password strength when password changes
  React.useEffect(() => {
    if (password) {
      const { strength, score, feedback } = calculatePasswordStrength(password);
      setPasswordStrength(strength);
      setPasswordScore(score);
      setPasswordFeedback(feedback);
    } else {
      setPasswordStrength('weak');
      setPasswordScore(0);
      setPasswordFeedback([]);
    }
  }, [password]);

  // Sync external validation errors
  React.useEffect(() => {
    if (validationErrors && validationErrors.length > 0) {
      validationErrors.forEach(({ field, message }) => {
        setError(field as any, { type: 'manual', message });
      });
    }
  }, [validationErrors, setError]);

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const handleClearError = () => {
    clearErrors();
  };

  const handleFormSubmit = useCallback(async (data: RegisterFormData) => {
    await onSubmit(data);
  }, [onSubmit]);

  const getFieldError = (field: keyof RegisterFormData): string | undefined => {
    const isTouched = touchedFields.has(field);
    const error = errors[field];
    return isTouched && error?.message ? error.message : undefined;
  };

  const strengthInfo = strengthColors[passwordStrength];
  const strengthWidth = (passwordScore / 5) * 100;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5" noValidate>
      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error/10 border border-error p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleClearError}
              className="text-error hover:text-error/80"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-1">
          Full name <span className="text-secondary-400">(optional)</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={`
              block w-full pl-10 pr-3 py-2 rounded-lg border
              ${getFieldError('name') ? 'border-error' : 'border-secondary-300'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-secondary-100 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder="John Doe"
            aria-invalid={!!getFieldError('name')}
            aria-describedby={getFieldError('name') ? 'name-error' : undefined}
            disabled={isLoading}
            {...register('name')}
            onBlur={() => handleFieldBlur('name')}
          />
        </div>
        {getFieldError('name') && (
          <p id="name-error" className="mt-1 text-sm text-error">
            {getFieldError('name')}
          </p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
          Email address <span className="text-error">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            className={`
              block w-full pl-10 pr-3 py-2 rounded-lg border
              ${getFieldError('email') ? 'border-error' : 'border-secondary-300'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-secondary-100 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder="you@example.com"
            aria-invalid={!!getFieldError('email')}
            aria-describedby={getFieldError('email') ? 'email-error' : undefined}
            disabled={isLoading}
            {...register('email')}
            onBlur={() => handleFieldBlur('email')}
          />
        </div>
        {getFieldError('email') && (
          <p id="email-error" className="mt-1 text-sm text-error">
            {getFieldError('email')}
          </p>
        )}
      </div>

      {/* Password Field with Strength Meter */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
          Password <span className="text-error">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`
              block w-full pl-10 pr-10 py-2 rounded-lg border
              ${getFieldError('password') ? 'border-error' : 'border-secondary-300'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-secondary-100 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder="Create a strong password"
            aria-invalid={!!getFieldError('password')}
            aria-describedby={getFieldError('password') ? 'password-error' : 'password-strength'}
            disabled={isLoading}
            {...register('password')}
            onBlur={() => handleFieldBlur('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            ) : (
              <Eye className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            )}
          </button>
        </div>
        
        {/* Password Strength Meter */}
        {password && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary-500">Password strength:</span>
              <span className={`font-medium ${strengthInfo.text}`}>{strengthInfo.label}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${strengthInfo.bg} rounded-full transition-all duration-300`}
                style={{ width: `${strengthWidth}%` }}
              />
            </div>
            {passwordFeedback.length > 0 && passwordStrength === 'weak' && (
              <p className="text-xs text-secondary-500 mt-1">
                Add: {passwordFeedback.join(', ')}
              </p>
            )}
          </div>
        )}
        
        {getFieldError('password') && (
          <p id="password-error" className="mt-1 text-sm text-error">
            {getFieldError('password')}
          </p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 mb-1">
          Confirm password <span className="text-error">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className={`
              block w-full pl-10 pr-10 py-2 rounded-lg border
              ${getFieldError('confirmPassword') ? 'border-error' : 'border-secondary-300'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-secondary-100 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder="Confirm your password"
            aria-invalid={!!getFieldError('confirmPassword')}
            aria-describedby={getFieldError('confirmPassword') ? 'confirm-password-error' : undefined}
            disabled={isLoading}
            {...register('confirmPassword')}
            onBlur={() => handleFieldBlur('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            ) : (
              <Eye className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
            )}
          </button>
        </div>
        {getFieldError('confirmPassword') && (
          <p id="confirm-password-error" className="mt-1 text-sm text-error">
            {getFieldError('confirmPassword')}
          </p>
        )}
        {password && watch('confirmPassword') && password === watch('confirmPassword') && !getFieldError('confirmPassword') && (
          <p className="mt-1 text-xs text-success flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Passwords match
          </p>
        )}
      </div>

      {/* Terms Checkbox */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            {...register('acceptTerms')}
            disabled={isLoading}
            aria-invalid={!!errors.acceptTerms}
            aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
          />
          <span className="text-sm text-secondary-600">
            I agree to the{' '}
            <a href="/terms" className="text-primary-600 hover:text-primary-700 hover:underline" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary-600 hover:text-primary-700 hover:underline" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="terms-error" className="text-sm text-error">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      {/* Marketing Checkbox (Optional) */}
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
          {...register('acceptMarketing')}
          disabled={isLoading}
        />
        <span className="text-sm text-secondary-500">
          I'd like to receive product updates and marketing emails (optional)
        </span>
      </label>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        Create Account
      </Button>

      {/* Social Auth */}
      <SocialAuthButtons isLoading={isLoading} onOAuthStart={onOAuthStart} />

      {/* Sign In Link */}
      <p className="text-center text-sm text-secondary-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
          tabIndex={isLoading ? -1 : 0}
        >
          Sign in
        </Link>
      </p>

      {/* Password Requirements Summary */}
      <div className="text-xs text-secondary-400 text-center border-t border-secondary-100 pt-4 mt-2">
        By creating an account, you agree to receive essential account notifications.
        You can unsubscribe from marketing emails at any time.
      </div>
    </form>
  );
};
export default RegisterForm;
