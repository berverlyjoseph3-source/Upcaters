// enterprise-ai-agent-platform/apps/frontend/src/types/auth.types.ts

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  planId: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  role: 'USER' | 'ADMIN' | 'SUPPORT';
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt ? : string;
  metadata ? : Record < string,
  any > ;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe ? : boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name ? : string;
  acceptTerms: boolean;
  acceptMarketing ? : boolean;
}

export interface AuthResponse {
  success: boolean;
  data ? : {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
  };
  error ? : string;
  code ? : string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  validationErrors: ValidationError[] | null;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileRequest {
  name ? : string;
  avatarUrl ? : string;
  metadata ? : Record < string, any > ;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OAuthProvider {
  name: 'google' | 'linkedin' | 'facebook' | 'twitter';
  url: string;
  icon: string;
  color: string;
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
{
  name: 'google',
  url: '/api/auth/google',
  icon: 'G',
  color: '#DB4437',
},
{
  name: 'linkedin',
  url: '/api/auth/linkedin',
  icon: 'in',
  color: '#0077B5',
},
{
  name: 'facebook',
  url: '/api/auth/facebook',
  icon: 'f',
  color: '#4267B2',
},
{
  name: 'twitter',
  url: '/api/auth/twitter',
  icon: '𝕏',
  color: '#1DA1F2',
}, ];

export interface Session {
  id: string;
  userId: string;
  deviceType: string;
  ipAddress: string;
  location: string | null;
  lastActivityAt: string;
  isCurrent: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  slackWebhookUrl ? : string;
  webhookUrl ? : string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyOnLimit: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  quietHoursStart ? : string;
  quietHoursEnd ? : string;
}