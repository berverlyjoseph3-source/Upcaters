// enterprise-ai-agent-platform/apps/frontend/src/components/auth/SocialAuthButtons.tsx
import React, { useState } from 'react';
import { Chrome, Linkedin, Facebook, Twitter } from 'lucide-react';

interface SocialProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  enabled: boolean;
}

interface SocialAuthButtonsProps {
  isLoading?: boolean;
  onOAuthStart?: (provider: string) => void;
  redirectUri?: string;
}

const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: 'google',
    name: 'Google',
    icon: <Chrome className="h-5 w-5" />,
    color: 'bg-[#DB4437]',
    hoverColor: 'hover:bg-[#c23321]',
    enabled: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: <Linkedin className="h-5 w-5" />,
    color: 'bg-[#0077B5]',
    hoverColor: 'hover:bg-[#005e8c]',
    enabled: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook className="h-5 w-5" />,
    color: 'bg-[#4267B2]',
    hoverColor: 'hover:bg-[#365899]',
    enabled: true,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: <Twitter className="h-5 w-5" />,
    color: 'bg-[#1DA1F2]',
    hoverColor: 'hover:bg-[#1a8cd8]',
    enabled: true,
  },
];

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({ 
  isLoading = false, 
  onOAuthStart,
  redirectUri 
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = async (provider: SocialProvider) => {
    if (isLoading || loadingProvider) return;
    
    setLoadingProvider(provider.id);
    
    try {
      if (onOAuthStart) {
        onOAuthStart(provider.id);
      } else {
        // Build OAuth URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const callbackUrl = redirectUri || `${window.location.origin}/auth/callback`;
        const state = Math.random().toString(36).substring(2, 15);
        
        // Store state for CSRF protection
        sessionStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_provider', provider.id);
        
        // Redirect to OAuth endpoint
        window.location.href = `${apiUrl}/api/auth/${provider.id}?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
      }
    } catch (error) {
      console.error(`OAuth error for ${provider.name}:`, error);
      setLoadingProvider(null);
    }
  };

  const enabledProviders = SOCIAL_PROVIDERS.filter(p => p.enabled);

  if (enabledProviders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-secondary-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-secondary-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {enabledProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleOAuth(provider)}
            disabled={isLoading || loadingProvider !== null}
            className={`
              ${provider.color} ${provider.hoverColor}
              text-white font-medium py-2.5 px-4 rounded-lg
              flex items-center justify-center gap-2
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
              shadow-sm hover:shadow-md
            `}
            aria-label={`Continue with ${provider.name}`}
          >
            {loadingProvider === provider.id ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              provider.icon
            )}
            <span className="text-sm font-medium">{provider.name}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-secondary-400">
        By continuing with a social provider, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
};
export default SocialAuthButtons;
