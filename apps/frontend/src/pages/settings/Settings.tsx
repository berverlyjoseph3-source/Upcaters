// enterprise-ai-agent-platform/apps/frontend/src/pages/settings/Settings.tsx
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Key, 
  Globe, 
  Palette,
  Mail,
  Lock,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Trash2,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../api/client';

interface ProfileData {
  name: string;
  email: string;
  avatarUrl?: string;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyOnLimit: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  sessions: Array<{
    id: string;
    deviceType: string;
    ipAddress: string;
    location: string;
    lastActivityAt: string;
    isCurrent: boolean;
  }>;
}

interface ApiKeyInfo {
  hasApiKey: boolean;
  prefix?: string;
  createdAt?: string;
  lastUsedAt?: string;
}

interface SessionData {
  id: string;
  deviceType: string;
  ipAddress: string;
  location: string;
  lastActivityAt: string;
  isCurrent: boolean;
}

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, changePassword, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security' | 'api'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Profile form state
  const [profileData, setProfileData] = useState<ProfileData>({
    name: user?.name || '',
    email: user?.email || '',
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Notification preferences
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notifyOnLimit: true,
    dailyDigest: true,
    weeklyReport: true,
  });
  
  // Security settings
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    lastPasswordChange: new Date().toISOString(),
    sessions: [],
  });
  
  // API Key state
  const [apiKey, setApiKey] = useState<ApiKeyInfo | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch notification preferences
      const notifResponse = await apiClient.get('/api/user/notifications');
      if (notifResponse.success && notifResponse.data) {
        setNotifications(notifResponse.data as unknown as NotificationPreferences);
      }
      
      // Fetch API key info
      const apiKeyResponse = await apiClient.get('/api/user/api-keys');
      if (apiKeyResponse.success && apiKeyResponse.data) {
        setApiKey(apiKeyResponse.data as unknown as ApiKeyInfo);
      }
      
      // Fetch sessions
      const sessionsResponse = await apiClient.get('/api/auth/sessions');
      if (sessionsResponse.success && sessionsResponse.data) {
        const sessionsData = sessionsResponse.data as unknown as SessionData[];
        setSecurity(prev => ({ ...prev, sessions: sessionsData }));
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await updateProfile({ name: profileData.name });
      if (result.success) {
        setSuccess('Profile updated successfully');
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setSuccess('Password changed successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await apiClient.put('/api/user/notifications', notifications);
      if (response.success) {
        setSuccess('Notification preferences updated');
      } else {
        setError(response.error || 'Failed to update preferences');
      }
    } catch (err) {
      setError('Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    setError(null);
    setGeneratedKey(null);
    
    try {
      const response = await apiClient.post('/api/user/api-keys', {
        name: 'Default API Key',
        permissions: ['*'],
      });
      
      if (response.success && response.data) {
        const responseData = response.data as unknown as { apiKey: string; prefix: string };
        setGeneratedKey(responseData.apiKey);
        setApiKey({ hasApiKey: true, prefix: responseData.prefix });
        setSuccess('API key generated successfully. Copy it now - it will not be shown again.');
      } else {
        setError(response.error || 'Failed to generate API key');
      }
    } catch (err) {
      setError('Failed to generate API key');
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!confirm('Are you sure you want to revoke your API key? This action cannot be undone.')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.delete('/api/user/api-keys');
      if (response.success) {
        setApiKey({ hasApiKey: false });
        setSuccess('API key revoked successfully');
      } else {
        setError(response.error || 'Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to revoke API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await apiClient.delete(`/api/auth/sessions/${sessionId}`);
      if (response.success) {
        setSecurity(prev => ({
          ...prev,
          sessions: prev.sessions.filter(s => s.id !== sessionId),
        }));
        setSuccess('Session revoked successfully');
      }
    } catch (err) {
      setError('Failed to revoke session');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'api', label: 'API Keys', icon: <Key className="h-4 w-4" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-700 dark:text-green-400">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-600">×</button>
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-600">×</button>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-secondary-50 dark:bg-secondary-800 text-secondary-500 cursor-not-allowed"
              />
              <p className="text-xs text-secondary-500 mt-1">Email cannot be changed. Contact support for assistance.</p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-secondary-900 dark:text-white">Email Notifications</h3>
                  <p className="text-sm text-secondary-500">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.emailNotifications}
                    onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="pl-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Notify on successful executions</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.notifyOnSuccess}
                      onChange={(e) => setNotifications({ ...notifications, notifyOnSuccess: e.target.checked })}
                      className="sr-only peer"
                      disabled={!notifications.emailNotifications}
                    />
                    <div className="w-9 h-5 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Notify on failed executions</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.notifyOnFailure}
                      onChange={(e) => setNotifications({ ...notifications, notifyOnFailure: e.target.checked })}
                      className="sr-only peer"
                      disabled={!notifications.emailNotifications}
                    />
                    <div className="w-9 h-5 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-600">Notify when approaching usage limits</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.notifyOnLimit}
                      onChange={(e) => setNotifications({ ...notifications, notifyOnLimit: e.target.checked })}
                      className="sr-only peer"
                      disabled={!notifications.emailNotifications}
                    />
                    <div className="w-9 h-5 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-secondary-900 dark:text-white">Daily Digest</h3>
                  <p className="text-sm text-secondary-500">Receive a daily summary of your activities</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.dailyDigest}
                    onChange={(e) => setNotifications({ ...notifications, dailyDigest: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
            
            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-secondary-900 dark:text-white">Weekly Report</h3>
                  <p className="text-sm text-secondary-500">Receive a weekly report of your usage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.weeklyReport}
                    onChange={(e) => setNotifications({ ...notifications, weeklyReport: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                onClick={handleNotificationUpdate}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-8">
            {/* Change Password */}
            <div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 pr-10 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-500"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-secondary-500 mt-1">Minimum 8 characters with uppercase, lowercase, number, and special character</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update Password
                </button>
              </form>
            </div>
            
            {/* Active Sessions */}
            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Active Sessions</h3>
              <div className="space-y-3">
                {security.sessions.length === 0 ? (
                  <p className="text-secondary-500 text-sm">No active sessions found</p>
                ) : (
                  security.sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-secondary-900 dark:text-white capitalize">{session.deviceType}</span>
                          {session.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Current</span>
                          )}
                        </div>
                        <p className="text-xs text-secondary-500 mt-1">
                          IP: {session.ipAddress} • {session.location || 'Unknown location'}
                        </p>
                        <p className="text-xs text-secondary-400">
                          Last active: {new Date(session.lastActivityAt).toLocaleString()}
                        </p>
                      </div>
                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => logout()}
                className="mt-4 flex items-center gap-2 text-red-600 hover:text-red-700 text-sm"
              >
                <LogOut className="h-4 w-4" />
                Sign out of all devices
              </button>
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-2">API Keys</h3>
              <p className="text-sm text-secondary-500 mb-4">
                Use API keys to authenticate API requests. Keep your API keys secure.
              </p>
              
              {generatedKey && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-400 mb-2">Your new API key:</p>
                  <code className="block p-2 bg-secondary-900 text-green-400 rounded font-mono text-sm break-all">
                    {generatedKey}
                  </code>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2">
                    ⚠️ Copy this key now. It will not be shown again.
                  </p>
                </div>
              )}
              
              {apiKey?.hasApiKey ? (
                <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Current API Key</span>
                    <span className="text-xs text-secondary-500">Prefix: {apiKey.prefix}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-secondary-600 dark:text-secondary-400">
                      ••••••••••••••••••••••••••••••••
                    </code>
                    <button
                      onClick={handleRevokeApiKey}
                      className="text-red-500 hover:text-red-600 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                  {apiKey.createdAt && (
                    <p className="text-xs text-secondary-400 mt-2">
                      Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  )}
                  {apiKey.lastUsedAt && (
                    <p className="text-xs text-secondary-400">
                      Last used: {new Date(apiKey.lastUsedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-secondary-50 dark:bg-secondary-700/50 rounded-lg p-4 text-center mb-4">
                  <Key className="h-8 w-8 mx-auto text-secondary-400 mb-2" />
                  <p className="text-secondary-500">No API key generated yet</p>
                </div>
              )}
              
              <button
                onClick={handleGenerateApiKey}
                disabled={isGeneratingKey}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isGeneratingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                Generate New API Key
              </button>
              
              <div className="mt-6 p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-secondary-900 dark:text-white mb-2">API Usage</h4>
                <p className="text-xs text-secondary-500 mb-2">
                  Use your API key in the Authorization header:
                </p>
                <code className="block p-2 bg-secondary-900 text-green-400 rounded font-mono text-xs">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <p className="text-xs text-secondary-500 mt-2">
                  Or use the X-API-Key header:
                </p>
                <code className="block p-2 bg-secondary-900 text-green-400 rounded font-mono text-xs">
                  X-API-Key: YOUR_API_KEY
                </code>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
