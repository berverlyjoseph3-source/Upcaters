// enterprise-ai-agent-platform/apps/frontend/src/hooks/useAuth.ts
import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/auth.store';
import { LoginRequest, RegisterRequest, ValidationError } from '../types/auth.types';
import { apiClient } from '../api/client';

interface UseAuthReturn {
  // State
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;
  
  // Auth actions
  login: (data: LoginRequest) => Promise < { success: boolean;error ? : string;validationErrors ? : ValidationError[] } > ;
  register: (data: RegisterRequest) => Promise < { success: boolean;error ? : string;validationErrors ? : ValidationError[] } > ;
  logout: () => Promise < void > ;
  loadUser: () => Promise < void > ;
  clearError: () => void;
  clearValidationErrors: () => void;
  
  // Password actions
  forgotPassword: (email: string) => Promise < { success: boolean;error ? : string } > ;
  resetPassword: (token: string, newPassword: string) => Promise < { success: boolean;error ? : string } > ;
  changePassword: (currentPassword: string, newPassword: string) => Promise < { success: boolean;error ? : string } > ;
  
  // Email verification
  resendVerification: () => Promise < { success: boolean;error ? : string } > ;
  verifyEmail: (token: string) => Promise < { success: boolean;error ? : string } > ;
  
  // Profile
  updateProfile: (data: any) => Promise < { success: boolean;error ? : string } > ;
  
  // OAuth
  initiateOAuth: (provider: string) => void;
  
  // Helpers
  hasRole: (role: string | string[]) => boolean;
  hasPlan: (plan: string | string[]) => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    validationErrors,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    loadUser: storeLoadUser,
    clearError: storeClearError,
    clearValidationErrors: storeClearValidationErrors,
    forgotPassword: storeForgotPassword,
    resetPassword: storeResetPassword,
    changePassword: storeChangePassword,
    resendVerification: storeResendVerification,
    verifyEmail: storeVerifyEmail,
    updateProfile: storeUpdateProfile,
  } = useAuthStore();
  
  const loadUserCalled = useRef(false);
  
  // Auto-load user on mount if token exists
  useEffect(() => {
    if (!loadUserCalled.current && apiClient.getAccessToken() && !user) {
      loadUserCalled.current = true;
      storeLoadUser();
    }
  }, [storeLoadUser, user]);
  
  // Listen for session expired events
  useEffect(() => {
    const handleSessionExpired = () => {
      storeLogout();
    };
    
    window.addEventListener('session-expired', handleSessionExpired);
    
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [storeLogout]);
  
  // Listen for plan limit exceeded events
  useEffect(() => {
    const handlePlanLimitExceeded = (event: CustomEvent) => {
      // Could show a toast notification here
      console.warn('Plan limit exceeded:', event.detail);
    };
    
    window.addEventListener('plan-limit-exceeded', handlePlanLimitExceeded as EventListener);
    
    return () => {
      window.removeEventListener('plan-limit-exceeded', handlePlanLimitExceeded as EventListener);
    };
  }, []);
  
  const initiateOAuth = useCallback((provider: string) => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('oauth_state', state);
    
    window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/${provider}?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }, []);
  
  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [user]);
  
  const hasPlan = useCallback((plan: string | string[]): boolean => {
    if (!user) return false;
    
    const plans = Array.isArray(plan) ? plan : [plan];
    return plans.includes(user.planId);
  }, [user]);
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    validationErrors,
    
    // Auth actions
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    loadUser: storeLoadUser,
    clearError: storeClearError,
    clearValidationErrors: storeClearValidationErrors,
    
    // Password actions
    forgotPassword: storeForgotPassword,
    resetPassword: storeResetPassword,
    changePassword: storeChangePassword,
    
    // Email verification
    resendVerification: storeResendVerification,
    verifyEmail: storeVerifyEmail,
    
    // Profile
    updateProfile: storeUpdateProfile,
    
    // OAuth
    initiateOAuth,
    
    // Helpers
    hasRole,
    hasPlan,
  };
};