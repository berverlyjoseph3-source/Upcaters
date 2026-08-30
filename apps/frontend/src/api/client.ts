// enterprise-ai-agent-platform/apps/frontend/src/api/client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
  details?: Record<string, any>;
}

// Queue for failed requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(promise => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage(): void {
    try {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
    }
  }

  private saveTokensToStorage(): void {
    try {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
    } catch (error) {
      console.error('Failed to save tokens to storage:', error);
    }
  }

  private clearTokensFromStorage(): void {
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch (error) {
      console.error('Failed to clear tokens from storage:', error);
    }
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      this.handleRequest.bind(this),
      this.handleRequestError.bind(this)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      this.handleResponse.bind(this),
      this.handleResponseError.bind(this)
    );
  }

  private handleRequest(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = this.generateRequestId();
    
    return config;
  }

  private handleRequestError(error: any): Promise<any> {
    console.error('Request error:', error);
    return Promise.reject(this.normalizeError(error));
  }

  private handleResponse(response: AxiosResponse): AxiosResponse {
    return response;
  }

  private async handleResponseError(error: AxiosError): Promise<any> {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    
    // Handle network errors with retry
    if (!error.response && originalRequest && !originalRequest._retry) {
      return this.handleNetworkError(originalRequest, error);
    }
    
    // Handle 401 Unauthorized - try token refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      return this.handleUnauthorizedError(originalRequest, error);
    }
    
    // Handle 429 Rate Limit
    if (error.response?.status === 429) {
      return this.handleRateLimitError(originalRequest, error);
    }
    
    // Handle 402 Payment Required (Plan limit)
    if (error.response?.status === 402) {
      window.dispatchEvent(new CustomEvent('plan-limit-exceeded', { detail: error.response.data }));
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('permission-denied', { detail: error.response.data }));
    }
    
    return Promise.reject(this.normalizeError(error));
  }

  private async handleNetworkError(
    originalRequest: InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number },
    error: AxiosError
  ): Promise<any> {
    originalRequest._retry = true;
    originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
    
    if (originalRequest._retryCount <= MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * Math.pow(2, originalRequest._retryCount - 1);
      await this.delay(delay);
      return this.client(originalRequest);
    }
    
    return Promise.reject(this.normalizeError(error));
  }

  private async handleUnauthorizedError(
    originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
    error: AxiosError
  ): Promise<any> {
    originalRequest._retry = true;
    
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => this.client(originalRequest))
        .catch(err => Promise.reject(err));
    }
    
    isRefreshing = true;
    
    try {
      const refreshed = await this.refreshAccessToken();
      
      if (refreshed) {
        processQueue(null, this.accessToken);
        return this.client(originalRequest);
      } else {
        processQueue(new Error('Failed to refresh token'), null);
        this.clearAuth();
        window.dispatchEvent(new CustomEvent('session-expired'));
        return Promise.reject(this.createAuthError('Session expired. Please login again.', 'SESSION_EXPIRED'));
      }
    } catch (refreshError) {
      processQueue(refreshError instanceof Error ? refreshError : new Error('Unknown error'), null);
      this.clearAuth();
      window.dispatchEvent(new CustomEvent('session-expired'));
      return Promise.reject(this.normalizeError(refreshError));
    } finally {
      isRefreshing = false;
    }
  }

  private async handleRateLimitError(
    originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
    error: AxiosError
  ): Promise<any> {
    const retryAfter = error.response?.headers['retry-after'] || error.response?.headers['x-ratelimit-reset'];
    
    if (retryAfter) {
      const delayMs = typeof retryAfter === 'string' ? parseInt(retryAfter) * 1000 : 60000;
      await this.delay(delayMs);
      
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        return this.client(originalRequest);
      }
    }
    
    return Promise.reject(this.normalizeError(error));
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }
    
    try {
      const response = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
        `${API_BASE_URL}/api/auth/refresh`,
        { refreshToken: this.refreshToken },
        { timeout: 10000 }
      );
      
      if (response.data.success && response.data.data) {
        this.setTokens(response.data.data.accessToken, response.data.data.refreshToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  private clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.clearTokensFromStorage();
  }

  private normalizeError(error: any): ApiError {
    if (error.response?.data) {
      return {
        message: error.response.data.error || error.response.data.message || 'An error occurred',
        code: error.response.data.code || 'UNKNOWN_ERROR',
        status: error.response.status,
        details: error.response.data.details,
      };
    }
    
    if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }
    
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      status: 500,
    };
  }

  private createAuthError(message: string, code: string): ApiError {
    return {
      message,
      code,
      status: 401,
    };
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.saveTokensToStorage();
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.clearTokensFromStorage();
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();