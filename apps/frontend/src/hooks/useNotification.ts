// enterprise-ai-agent-platform/apps/frontend/src/hooks/useNotification.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from '../api/client';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, any>;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyOnLimit: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

interface UseNotificationReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  preferences: NotificationPreferences | null;
  fetchNotifications: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  showToast: (title: string, message: string, type?: Notification['type']) => void;
}

export const useNotification = (): UseNotificationReturn => {
  const { isAuthenticated } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Notification[]>('/api/user/notifications');
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const fetchPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiClient.get<NotificationPreferences>('/api/user/notifications/preferences');
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    }
  }, [isAuthenticated]);

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    if (!isAuthenticated) return;
    
    try {
      const response = await apiClient.put<NotificationPreferences>('/api/user/notifications/preferences', prefs);
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      throw err;
    }
  }, [isAuthenticated]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/api/user/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient.post('/api/user/notifications/read-all');
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/api/user/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await apiClient.delete('/api/user/notifications');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  }, []);

  const showToast = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    // Create a temporary toast notification
    const toast: Notification = {
      id: `toast_${Date.now()}`,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
    };
    
    setNotifications(prev => [toast, ...prev]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== toast.id));
    }, 5000);
  }, []);

  // Auto-fetch on authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isAuthenticated, fetchNotifications, fetchPreferences]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    preferences,
    fetchNotifications,
    fetchPreferences,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    showToast,
  };
};