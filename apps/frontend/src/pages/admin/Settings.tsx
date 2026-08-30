// enterprise-ai-agent-platform/apps/frontend/src/pages/admin/Settings.tsx
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle, Globe, Mail, Phone, Shield, Lock, Users, Bell, Database, Server, Image, Link as LinkIcon } from 'lucide-react';
import { useAdmin } from '../../hooks/useAdmin';
import { SystemSettings, PlanId } from '../../types/admin.types';

export const AdminSettings: React.FC = () => {
  const { settings, settingsLoading, settingsError, fetchSettings, updateSettings, clearCache, toggleMaintenance } = useAdmin();
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'general' | 'security' | 'branding' | 'system'>('general');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await updateSettings(formData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save settings');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the system cache? This may temporarily affect performance.')) {
      await clearCache();
      alert('Cache cleared successfully');
    }
  };

  const handleToggleMaintenance = async () => {
    const enable = !settings?.maintenanceMode;
    const message = enable ? prompt('Enter maintenance message (optional):') : undefined;
    await toggleMaintenance(enable, message || undefined);
    await fetchSettings();
  };

  const sections = [
    { id: 'general', label: 'General', icon: <Globe className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> },
    { id: 'branding', label: 'Branding', icon: <Image className="h-4 w-4" /> },
    { id: 'system', label: 'System', icon: <Server className="h-4 w-4" /> },
  ];

  if (settingsLoading && !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">{settingsError}</p>
        <button onClick={fetchSettings} className="mt-2 text-sm text-primary-600 hover:underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">System Settings</h2>
          <p className="text-sm text-secondary-500">Configure global platform settings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-secondary-800 border border-secondary-200 rounded-lg hover:bg-secondary-50"
          >
            <Database className="h-4 w-4" />
            Clear Cache
          </button>
          <button
            onClick={handleToggleMaintenance}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              settings?.maintenanceMode
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-yellow-600 hover:bg-yellow-700 text-white'
            }`}
          >
            {settings?.maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
          </button>
        </div>
      </div>

      {/* Maintenance Banner */}
      {settings?.maintenanceMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span className="text-sm text-yellow-800 dark:text-yellow-300">
            Maintenance mode is active. Non-admin users cannot access the platform.
            {settings.maintenanceMessage && ` Message: "${settings.maintenanceMessage}"`}
          </span>
        </div>
      )}

      {/* Sections Navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeSection === section.id
                  ? 'bg-white dark:bg-secondary-800 text-primary-600 border-b-2 border-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Form */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        {activeSection === 'general' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName || ''}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Support Email</label>
                <input
                  type="email"
                  value={formData.supportEmail || ''}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Phone</label>
                <input
                  type="tel"
                  value={formData.supportPhone || ''}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Default Plan</label>
                <select
                  value={formData.defaultPlan || 'FREE'}
                  onChange={(e) => setFormData({ ...formData, defaultPlan: e.target.value as PlanId })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                >
                  <option value="FREE">Free</option>
                  <option value="STARTER">Starter</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trial Days</label>
                <input
                  type="number"
                  value={formData.trialDays || 14}
                  onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium">Registration Enabled</label>
                <p className="text-xs text-secondary-500">Allow new user registrations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.registrationEnabled !== false}
                  onChange={(e) => setFormData({ ...formData, registrationEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium">Email Verification Required</label>
                <p className="text-xs text-secondary-500">Require email verification before login</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.emailVerificationRequired || false}
                  onChange={(e) => setFormData({ ...formData, emailVerificationRequired: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                value={formData.security?.sessionTimeout || 30}
                onChange={(e) => setFormData({ ...formData, security: { ...formData.security, sessionTimeout: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
              />
              <p className="text-xs text-secondary-500 mt-1">Inactivity timeout for user sessions</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Login Attempts</label>
              <input
                type="number"
                value={formData.security?.maxLoginAttempts || 5}
                onChange={(e) => setFormData({ ...formData, security: { ...formData.security, maxLoginAttempts: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
              />
              <p className="text-xs text-secondary-500 mt-1">Failed attempts before account lockout</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password Expiry Days</label>
              <input
                type="number"
                value={formData.security?.passwordExpiryDays || 90}
                onChange={(e) => setFormData({ ...formData, security: { ...formData.security, passwordExpiryDays: parseInt(e.target.value) || null } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                placeholder="Leave empty for no expiry"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium">Two-Factor Authentication Required</label>
                <p className="text-xs text-secondary-500">Force 2FA for all users</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.security?.twoFactorRequired || false}
                  onChange={(e) => setFormData({ ...formData, security: { ...formData.security, twoFactorRequired: e.target.checked } })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        )}

        {activeSection === 'branding' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Company Logo URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.companyLogo || ''}
                  onChange={(e) => setFormData({ ...formData, companyLogo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-3 py-2 rounded-lg border border-secondary-300"
                />
                <button className="px-3 py-2 border rounded-lg hover:bg-secondary-50">Upload</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Twitter URL</label>
              <input
                type="url"
                value={formData.socialLinks?.twitter || ''}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, twitter: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={formData.socialLinks?.linkedin || ''}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, linkedin: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GitHub URL</label>
              <input
                type="url"
                value={formData.socialLinks?.github || ''}
                onChange={(e) => setFormData({ ...formData, socialLinks: { ...formData.socialLinks, github: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
              />
            </div>
          </div>
        )}

        {activeSection === 'system' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Maintenance Message</label>
              <textarea
                value={formData.maintenanceMessage || ''}
                onChange={(e) => setFormData({ ...formData, maintenanceMessage: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300"
                placeholder="Message shown during maintenance mode"
              />
            </div>
            <div className="bg-secondary-50 dark:bg-secondary-700/30 rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">System Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary-500">Platform Version</span>
                  <span className="font-mono">{settings?.system?.version || '1.0.0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">Environment</span>
                  <span className="font-mono">{import.meta.env.MODE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-500">API Endpoint</span>
                  <span className="font-mono">{import.meta.env.VITE_API_URL}</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="w-full py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
            >
              <Database className="h-4 w-4" />
              Clear All System Caches
            </button>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-secondary-200">
          {saveStatus === 'success' && (
            <span className="flex items-center gap-1 text-green-600 mr-3"><CheckCircle className="h-4 w-4" />Saved</span>
          )}
          {saveStatus === 'error' && errorMessage && (
            <span className="flex items-center gap-1 text-red-600 mr-3"><AlertCircle className="h-4 w-4" />{errorMessage}</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
          >
            {saveStatus === 'saving' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
export default Settings;
