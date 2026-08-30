// enterprise-ai-agent-platform/apps/frontend/src/pages/auth/Login.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from '../../components/auth/LoginForm';
import { Layout } from '../../components/common/Layout';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error, validationErrors, isAuthenticated, clearError, clearValidationErrors, initiateOAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState < string | null > (null);
  
  // Check for query params (email verified, password reset, etc.)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailVerified = params.get('email_verified');
    const passwordReset = params.get('password_reset');
    const error = params.get('error');
    
    if (emailVerified === 'true') {
      setSuccessMessage('Email verified successfully! You can now log in.');
    } else if (passwordReset === 'true') {
      setSuccessMessage('Password reset successfully! Please log in with your new password.');
    } else if (error) {
      // Handle OAuth errors
      if (error === 'access_denied') {
        setSuccessMessage(null);
        // Don't show error for user-cancelled OAuth
      } else {
        // Clear any existing error
      }
    }
    
    // Clear success message after 5 seconds
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [location]);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);
  
  // Clear errors on unmount
  useEffect(() => {
    return () => {
      clearError();
      clearValidationErrors();
    };
  }, [clearError, clearValidationErrors]);
  
  const handleSubmit = async (data: any) => {
    const result = await login(data);
    if (result.success) {
      navigate('/dashboard');
    }
  };
  
  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h1 className="mt-6 text-3xl font-bold text-secondary-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-secondary-600">
              Sign in to your account to continue
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="rounded-lg bg-success/10 border border-success p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <p className="text-sm text-success">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Login Form Card */}
          <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-secondary-200">
            <LoginForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              error={error}
              validationErrors={validationErrors || undefined}
              onOAuthStart={initiateOAuth}
            />
          </div>

          {/* Footer Links */}
          <div className="text-center space-y-2">
            <p className="text-xs text-secondary-500">
              By continuing, you agree to our{' '}
              <a href="/terms" className="text-primary-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-primary-600 hover:underline">
                Privacy Policy
              </a>
            </p>
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
export default Login;
