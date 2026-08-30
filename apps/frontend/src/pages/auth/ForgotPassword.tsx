// enterprise-ai-agent-platform/apps/frontend/src/pages/auth/ForgotPassword.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/common/Button';
import { Layout } from '../../components/common/Layout';

const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer < typeof forgotPasswordSchema > ;

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, isLoading } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState < string | null > (null);
  const [touchedFields, setTouchedFields] = useState < Set < string >> (new Set());
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setError: setFormError,
    clearErrors,
  } = useForm < ForgotPasswordFormData > ({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
    mode: 'onBlur',
  });
  
  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  };
  
  const getFieldError = (field: keyof ForgotPasswordFormData): string | undefined => {
    const isTouched = touchedFields.has(field);
    const error = errors[field];
    return isTouched && error?.message ? error.message : undefined;
  };
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);
    clearErrors();
    
    const result = await forgotPassword(data.email);
    
    if (result.success) {
      setSubmittedEmail(data.email);
      setSubmitted(true);
    } else {
      setError(result.error || 'Failed to send reset email. Please try again.');
    }
  };
  
  // Clear error when user starts typing
  const handleEmailChange = () => {
    if (error) setError(null);
    if (errors.email) clearErrors('email');
  };
  
  if (submitted) {
    return (
      <Layout showNavbar={false} showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white py-10 px-8 shadow-xl rounded-xl border border-secondary-200 text-center">
              <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center mb-6">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-secondary-900 mb-3">
                Check your email
              </h2>
              
              <p className="text-secondary-600 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-medium text-secondary-900">{submittedEmail}</span>
              </p>
              
              <div className="bg-secondary-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-secondary-600">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setError(null);
                    }}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    try again
                  </button>
                </p>
              </div>
              
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
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
              Reset password
            </h1>
            <p className="mt-2 text-sm text-secondary-600">
              Enter your email address and we'll send you a link to reset your password
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
                      block w-full pl-10 pr-3 py-2.5 rounded-lg border
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
                    onChange={handleEmailChange}
                    onBlur={() => handleFieldBlur('email')}
                  />
                </div>
                {getFieldError('email') && (
                  <p id="email-error" className="mt-1 text-sm text-error">
                    {getFieldError('email')}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
              >
                Send reset link
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
              Need help?{' '}
              <a href="/support" className="text-primary-500 hover:underline">
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default ForgotPassword;
