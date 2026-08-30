// enterprise-ai-agent-platform/apps/frontend/src/components/auth/LoginForm.tsx
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { SocialAuthButtons } from './SocialAuthButtons';

// Validation schema
const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer < typeof loginSchema > ;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => Promise < void > ;
  isLoading ? : boolean;
  error ? : string | null;
  validationErrors ? : Array < { field: string;message: string } > ;
  onOAuthStart ? : (provider: string) => void;
}

export const LoginForm: React.FC < LoginFormProps > = ({
  onSubmit,
  isLoading = false,
  error,
  validationErrors = [],
  onOAuthStart,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState < Set < string >> (new Set());
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm < LoginFormData > ({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });
  
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
  
  const handleFormSubmit = useCallback(async (data: LoginFormData) => {
    await onSubmit(data);
  }, [onSubmit]);
  
  const getFieldError = (field: keyof LoginFormData): string | undefined => {
    const isTouched = touchedFields.has(field);
    const error = errors[field];
    return isTouched && error?.message ? error.message : undefined;
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6" noValidate>
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

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-1">
          Email address
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

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-1">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-secondary-400" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className={`
              block w-full pl-10 pr-10 py-2 rounded-lg border
              ${getFieldError('password') ? 'border-error' : 'border-secondary-300'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
              disabled:bg-secondary-100 disabled:cursor-not-allowed
              transition-all duration-200
            `}
            placeholder="••••••••"
            aria-invalid={!!getFieldError('password')}
            aria-describedby={getFieldError('password') ? 'password-error' : undefined}
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
        {getFieldError('password') && (
          <p id="password-error" className="mt-1 text-sm text-error">
            {getFieldError('password')}
          </p>
        )}
      </div>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            {...register('rememberMe')}
            disabled={isLoading}
          />
          <span className="text-sm text-secondary-600">Remember me</span>
        </label>
        
        <Link
          to="/forgot-password"
          className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          tabIndex={isLoading ? -1 : 0}
        >
          Forgot password?
        </Link>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isLoading}
        disabled={isLoading}
      >
        Sign In
      </Button>

      {/* Social Auth */}
      <SocialAuthButtons isLoading={isLoading} onOAuthStart={onOAuthStart} />

      {/* Sign Up Link */}
      <p className="text-center text-sm text-secondary-600">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
          tabIndex={isLoading ? -1 : 0}
        >
          Sign up
        </Link>
      </p>
    </form>
  );
};
export default LoginForm;
