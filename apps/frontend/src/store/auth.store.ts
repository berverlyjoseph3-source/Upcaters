// enterprise-ai-agent-platform/apps/frontend/src/store/auth.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState, LoginRequest, RegisterRequest, ValidationError } from '../types/auth.types';
import { apiClient, ApiError } from '../api/client';

export interface AuthStore extends AuthState {
  // Actions
  login: (data: LoginRequest) => Promise<{ success: boolean; error?: string; validationErrors?: ValidationError[] }>;
  register: (data: RegisterRequest) => Promise<{ success: boolean; error?: string; validationErrors?: ValidationError[] }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  clearValidationErrors: () => void;
  setUser: (user: User | null) => void;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      validationErrors: null,

      // Login
      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null, validationErrors: null });
        
        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            user: User;
          }>('/api/auth/login', data);
          
          if (response.success && response.data) {
            const { accessToken, refreshToken, user } = response.data;
            apiClient.setTokens(accessToken, refreshToken);
            
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              validationErrors: null,
            });
            
            // Dispatch event for analytics
            window.dispatchEvent(new CustomEvent('auth-login', { detail: { userId: user.id, email: user.email } }));
            
            return { success: true };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Login failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({
            isLoading: false,
            error: apiError.message,
          });
          return { success: false, error: apiError.message };
        }
      },

      // Register
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null, validationErrors: null });
        
        try {
          const response = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            user: User;
          }>('/api/auth/register', data);
          
          if (response.success && response.data) {
            const { accessToken, refreshToken, user } = response.data;
            apiClient.setTokens(accessToken, refreshToken);
            
            set({
              user,
              accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              validationErrors: null,
            });
            
            // Dispatch event for analytics
            window.dispatchEvent(new CustomEvent('auth-register', { detail: { userId: user.id, email: user.email } }));
            
            return { success: true };
          } else {
            set({
              isLoading: false,
              error: response.error || 'Registration failed',
            });
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({
            isLoading: false,
            error: apiError.message,
          });
          return { success: false, error: apiError.message };
        }
      },

      // Logout
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.post('/api/auth/logout');
        } catch (error) {
          // Ignore logout errors
          console.error('Logout error:', error);
        }
        
        apiClient.clearTokens();
        
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          validationErrors: null,
        });
        
        // Dispatch event for analytics
        window.dispatchEvent(new CustomEvent('auth-logout'));
        
        // Clear any stored data
        sessionStorage.clear();
      },

      // Load user
      loadUser: async () => {
        const accessToken = apiClient.getAccessToken();
        if (!accessToken) {
          set({ isAuthenticated: false, user: null, isLoading: false });
          return;
        }
        
        set({ isLoading: true });
        
        try {
          const response = await apiClient.get<User>('/api/auth/me');
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            apiClient.clearTokens();
          }
        } catch (error) {
          console.error('Load user error:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          apiClient.clearTokens();
        }
      },

      // Forgot password
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/api/auth/forgot-password', { email });
          
          set({ isLoading: false });
          
          if (response.success) {
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Reset password
      resetPassword: async (token: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/api/auth/reset-password', { token, newPassword });
          
          set({ isLoading: false });
          
          if (response.success) {
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Resend verification email
      resendVerification: async () => {
        const { user } = get();
        if (!user) {
          return { success: false, error: 'No user logged in' };
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/api/auth/resend-verification', { email: user.email });
          
          set({ isLoading: false });
          
          if (response.success) {
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Verify email
      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/api/auth/verify-email', { token });
          
          set({ isLoading: false });
          
          if (response.success) {
            // Reload user to update verification status
            await get().loadUser();
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Update profile
      updateProfile: async (data: Partial<User>) => {
        const { user } = get();
        if (!user) {
          return { success: false, error: 'No user logged in' };
        }
        
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.put<User>('/api/user/profile', data);
          
          set({ isLoading: false });
          
          if (response.success && response.data) {
            set({ user: response.data });
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Change password
      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await apiClient.post('/api/auth/change-password', {
            currentPassword,
            newPassword,
          });
          
          set({ isLoading: false });
          
          if (response.success) {
            return { success: true };
          } else {
            return { success: false, error: response.error };
          }
        } catch (error) {
          const apiError = error as ApiError;
          set({ isLoading: false, error: apiError.message });
          return { success: false, error: apiError.message };
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Clear validation errors
      clearValidationErrors: () => {
        set({ validationErrors: null });
      },

      // Set user
      setUser: (user: User | null) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);