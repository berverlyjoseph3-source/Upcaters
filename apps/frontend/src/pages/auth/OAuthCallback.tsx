// enterprise-ai-agent-platform/apps/frontend/src/pages/auth/OAuthCallback.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Layout } from '../../components/common/Layout';
import { AlertCircle, CheckCircle, Shield, AlertTriangle } from 'lucide-react';

// OAuth provider configurations
const OAUTH_PROVIDERS: Record < string, { name: string;icon: string;color: string } > = {
  google: { name: 'Google', icon: 'G', color: 'bg-[#DB4437]' },
  linkedin: { name: 'LinkedIn', icon: 'in', color: 'bg-[#0077B5]' },
  facebook: { name: 'Facebook', icon: 'f', color: 'bg-[#4267B2]' },
  twitter: { name: 'X (Twitter)', icon: '𝕏', color: 'bg-[#1DA1F2]' },
};

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { handleOAuthCallback, loadUser } = useAuth();
  
  const [status, setStatus] = useState < 'loading' | 'success' | 'error' > ('loading');
  const [error, setError] = useState < string | null > (null);
  const [provider, setProvider] = useState < string > ('google');
  const [isNewUser, setIsNewUser] = useState(false);
  const processedRef = useRef(false);
  
  // Extract provider from URL or state
  useEffect(() => {
    const urlProvider = searchParams.get('provider');
    const stateProvider = location.state?.provider;
    setProvider(urlProvider || stateProvider || 'google');
  }, [searchParams, location]);
  
  useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;
    processedRef.current = true;
    
    const processOAuth = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');
      const storedState = sessionStorage.getItem('oauth_state');
      
      // Validate state parameter to prevent CSRF
      if (state && storedState && state !== storedState) {
        setStatus('error');
        setError('Security validation failed. Please try again.');
        sessionStorage.removeItem('oauth_state');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      
      // Handle OAuth errors
      if (errorParam) {
        setStatus('error');
        
        if (errorParam === 'access_denied') {
          setError('You denied access to your account. Please try again or use email login.');
        } else if (errorParam === 'invalid_scope') {
          setError('The application requested permissions that are not available. Please contact support.');
        } else {
          setError(errorDescription || `Authentication failed: ${errorParam}`);
        }
        
        sessionStorage.removeItem('oauth_state');
        setTimeout(() => navigate('/login'), 4000);
        return;
      }
      
      // Validate code
      if (!code) {
        setStatus('error');
        setError('No authorization code received. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }
      
      try {
        const result = await handleOAuthCallback(code, provider);
        
        if (result.success) {
          setIsNewUser(result.isNewUser || false);
          await loadUser();
          setStatus('success');
          
          // Redirect after successful authentication
          setTimeout(() => {
            if (result.isNewUser) {
              navigate('/dashboard?welcome=true');
            } else {
              const returnTo = sessionStorage.getItem('return_to') || '/dashboard';
              sessionStorage.removeItem('return_to');
              navigate(returnTo);
            }
          }, 1500);
        } else {
          setStatus('error');
          setError(result.error || 'Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 4000);
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setTimeout(() => navigate('/login'), 4000);
      } finally {
        sessionStorage.removeItem('oauth_state');
      }
    };
    
    processOAuth();
  }, [searchParams, handleOAuthCallback, loadUser, navigate, provider]);
  
  const providerInfo = OAUTH_PROVIDERS[provider] || OAUTH_PROVIDERS.google;
  
  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white py-10 px-8 shadow-xl rounded-xl border border-secondary-200 text-center">
            {/* Logo */}
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg mb-6">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>

            {/* Status Icon */}
            <div className="mb-6">
              {status === 'loading' && (
                <div className="mx-auto w-16 h-16">
                  <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {status === 'success' && (
                <div className="mx-auto w-16 h-16 bg-success rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              )}
              {status === 'error' && (
                <div className="mx-auto w-16 h-16 bg-error rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
              )}
            </div>

            {/* Provider Badge */}
            <div className="mb-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 ${providerInfo.color} rounded-full text-white text-sm`}>
                <span className="font-bold">{providerInfo.icon}</span>
                <span>{providerInfo.name}</span>
              </div>
            </div>

            {/* Status Messages */}
            {status === 'loading' && (
              <>
                <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                  Completing authentication...
                </h2>
                <p className="text-secondary-600">
                  Please wait while we verify your account with {providerInfo.name}.
                </p>
                <div className="mt-6 bg-secondary-50 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-secondary-500">
                    <Shield className="h-4 w-4" />
                    <span>Secure connection established</span>
                  </div>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                  Authentication successful!
                </h2>
                <p className="text-secondary-600">
                  {isNewUser 
                    ? 'Welcome! Your account has been created.' 
                    : 'Welcome back! Redirecting you to your dashboard.'}
                </p>
                <div className="mt-6 bg-success/10 rounded-lg p-4">
                  <p className="text-sm text-success">
                    Redirecting to dashboard...
                  </p>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <h2 className="text-xl font-semibold text-secondary-900 mb-2">
                  Authentication failed
                </h2>
                <div className="bg-error/10 border border-error rounded-lg p-3 mb-4">
                  <p className="text-error text-sm">{error}</p>
                </div>
                <p className="text-secondary-500 text-sm">
                  Redirecting to login page...
                </p>
              </>
            )}

            {/* Loading Progress Bar */}
            {status === 'loading' && (
              <div className="mt-8">
                <div className="h-1 w-full bg-secondary-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-600 rounded-full animate-progress"></div>
                </div>
                <p className="text-xs text-secondary-400 mt-2">
                  This may take a few seconds
                </p>
              </div>
            )}

            {/* Help Link */}
            <div className="mt-8 pt-6 border-t border-secondary-200">
              <p className="text-xs text-secondary-400">
                Having trouble?{' '}
                <a href="/support" className="text-primary-500 hover:underline">
                  Contact support
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add custom animation for progress bar */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
};
export default OAuthCallback;
