// enterprise-ai-agent-platform/apps/frontend/src/pages/auth/ResetPassword.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Layout } from '../../components/common/Layout';

// Password strength levels
type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

// Validation schema with comprehensive password rules
const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmNewPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Passwords do not match",
  path: ['confirmNewPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Password strength calculator
const calculatePasswordStrength = (password: string): { strength: PasswordStrength; score: number; feedback: string[] } => {
  if (!password) return { strength: 'weak', score: 0, feedback: [] };
  
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

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>('weak');
  const [passwordScore, setPasswordScore] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError: setFormError,
    clearErrors,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmNewPassword: '',
    },
    mode: 'onBlur',
  });

  const newPassword = watch('newPassword');
  const confirmNewPassword = watch('confirmNewPassword');

  // Update password strength when password changes
  useEffect(() => {
    if (newPassword) {
      const { strength, score, feedback } = calculatePasswordStrength(newPassword);
      setPasswordStrength(strength);
      setPasswordScore(score);
      setPasswordFeedback(feedback);
    } else {
      setPasswordStrength('weak');
      setPasswordScore(0);
      setPasswordFeedback([]);
    }
  }, [newPassword]);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };

  const getFieldError = (field: keyof ResetPasswordFormData): string | undefined => {
    const isTouched = touchedFields.has(field);
    const error = errors[field];
    return isTouched && error?.message ? error.message : undefined;
  };

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    setError(null);
    clearErrors();
    
    const result = await resetPassword(token, data.newPassword);
    
    if (result.success) {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login?password_reset=true');
      }, 3000);
    } else {
      setError(result.error || 'Failed to reset password. Please try again.');
    }
  };

  const strengthInfo = strengthColors[passwordStrength];
  const strengthWidth = (passwordScore / 5) * 100;
  const doPasswordsMatch = newPassword && confirmNewPassword && newPassword === confirmNewPassword && !errors.confirmNewPassword;

  if (success) {
    return (
      <Layout showNavbar={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white py-10 px-8 shadow-xl rounded-xl border border-secondary-200 text-center">
              <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-secondary-900 mb-3">
                Password reset successful!
              </h2>
              
              <p className="text-secondary-600 mb-6">
                Your password has been reset successfully. You will be redirected to the login page.
              </p>
              
              <div className="bg-secondary-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-secondary-600">
                  Redirecting to login page in a few seconds...
                </p>
              </div>
              
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Go to login now
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-secondary-900">
              Create new password
            </h1>
            <p className="mt-2 text-sm text-secondary-600">
              Please enter your new password below
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-secondary-200">
            {error && (
              <div className="mb-6 rounded-lg bg-error/10 border border-error p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-error hover:text-error/80"
                    aria-label="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* New Password Field */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                  New password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`
                      block w-full pl-10 pr-10 py-2.5 rounded-lg border
                      ${getFieldError('newPassword') ? 'border-error' : 'border-secondary-300'}
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                      disabled:bg-secondary-100 disabled:cursor-not-allowed
                      transition-all duration-200
                    `}
                    placeholder="Enter your new password"
                    aria-invalid={!!getFieldError('newPassword')}
                    aria-describedby={getFieldError('newPassword') ? 'new-password-error' : 'password-strength'}
                    disabled={isLoading || !token}
                    {...register('newPassword')}
                    onBlur={() => handleFieldBlur('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                    )}
                  </button>
                </div>
                
                {/* Password Strength Meter */}
                {newPassword && (
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
                
                {getFieldError('newPassword') && (
                  <p id="new-password-error" className="mt-1 text-sm text-error">
                    {getFieldError('newPassword')}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-secondary-700 mb-1">
                  Confirm new password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`
                      block w-full pl-10 pr-10 py-2.5 rounded-lg border
                      ${getFieldError('confirmNewPassword') ? 'border-error' : 'border-secondary-300'}
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                      disabled:bg-secondary-100 disabled:cursor-not-allowed
                      transition-all duration-200
                    `}
                    placeholder="Confirm your new password"
                    aria-invalid={!!getFieldError('confirmNewPassword')}
                    aria-describedby={getFieldError('confirmNewPassword') ? 'confirm-password-error' : undefined}
                    disabled={isLoading || !token}
                    {...register('confirmNewPassword')}
                    onBlur={() => handleFieldBlur('confirmNewPassword')}
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
                {getFieldError('confirmNewPassword') && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-error">
                    {getFieldError('confirmNewPassword')}
                  </p>
                )}
                {doPasswordsMatch && (
                  <p className="mt-1 text-xs text-success flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Passwords match
                  </p>
                )}
              </div>

              {/* Password Requirements Summary */}
              <div className="bg-secondary-50 rounded-lg p-3 text-xs text-secondary-500 space-y-1">
                <p className="font-medium text-secondary-700 mb-1">Password requirements:</p>
                <ul className="space-y-0.5 pl-4 list-disc">
                  <li className={newPassword.length >= 8 ? 'text-success' : ''}>At least 8 characters</li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-success' : ''}>At least one uppercase letter</li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-success' : ''}>At least one lowercase letter</li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-success' : ''}>At least one number</li>
                  <li className={/[^A-Za-z0-9]/.test(newPassword) ? 'text-success' : ''}>At least one special character</li>
                </ul>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading || !token}
              >
                Reset password
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </form>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-secondary-400">
              Didn't request a password reset?{' '}
              <Link to="/login" className="text-primary-500 hover:underline">
                Return to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default ResetPassword;
