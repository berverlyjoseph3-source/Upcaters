// enterprise-ai-agent-platform/apps/frontend/src/services/notification.service.ts
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
  slackWebhookUrl?: string;
  webhookUrl?: string;
}

class NotificationService {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];
  private preferences: NotificationPreferences | null = null;

  /**
   * Fetch all notifications for current user
   */
  async fetchNotifications(): Promise<Notification[]> {
    try {
      const response = await apiClient.get<Notification[]>('/api/user/notifications');
      if (response.success && response.data) {
        this.notifications = response.data;
        this.notifyListeners();
        return this.notifications;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Fetch notification preferences
   */
  async fetchPreferences(): Promise<NotificationPreferences | null> {
    try {
      const response = await apiClient.get<NotificationPreferences>('/api/user/notifications/preferences');
      if (response.success && response.data) {
        this.preferences = response.data;
        return this.preferences;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences | null> {
    try {
      const response = await apiClient.put<NotificationPreferences>('/api/user/notifications/preferences', prefs);
      if (response.success && response.data) {
        this.preferences = response.data;
        this.notifyListeners();
        return this.preferences;
      }
      return null;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/user/notifications/${id}/read`);
      const notification = this.notifications.find(n => n.id === id);
      if (notification) {
        notification.read = true;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.post('/api/user/notifications/read-all');
      this.notifications.forEach(n => n.read = true);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/user/notifications/${id}`);
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    try {
      await apiClient.delete('/api/user/notifications');
      this.notifications = [];
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  /**
   * Add a new notification (for real-time updates)
   */
  addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): void {
    const newNotification: Notification = {
      ...notification,
      id: `temp_${Date.now()}_${Math.random()}`,
      createdAt: new Date(),
    };
    this.notifications = [newNotification, ...this.notifications];
    this.notifyListeners();
    
    // Auto-hide after 5 seconds for toast notifications
    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== newNotification.id);
      this.notifyListeners();
    }, 5000);
  }

  /**
   * Show a toast notification
   */
  showToast(title: string, message: string, type: Notification['type'] = 'info'): void {
    this.addNotification({ type, title, message, read: false });
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences;
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.notifications);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to real-time notifications via WebSocket
   */
  subscribeToRealtime(webSocketManager: any): void {
    webSocketManager.onMessage('notification', (data: any) => {
      this.addNotification({
        type: data.payload.type || 'info',
        title: data.payload.title,
        message: data.payload.message,
        read: false,
      });
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.notifications));
  }
}

// Singleton instance
export const notificationService = new NotificationService();