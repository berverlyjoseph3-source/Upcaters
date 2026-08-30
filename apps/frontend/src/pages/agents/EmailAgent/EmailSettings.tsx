// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/EmailAgent/EmailSettings.tsx
import React, { useState } from 'react';
import { X, Save, Bell, Globe, Shield, User, Mail, RefreshCw } from 'lucide-react';

interface EmailSettingsProps {
  onClose: () => void;
}

export const EmailSettings: React.FC < EmailSettingsProps > = ({ onClose }) => {
  const [settings, setSettings] = useState({
    signature: 'Best regards,\n[Your Name]',
    autoReply: false,
    autoReplyMessage: '',
    notificationEmail: true,
    language: 'en',
    theme: 'system',
    refreshInterval: 5,
    sendReadReceipts: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    setIsSaving(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Email Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Signature */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <User className="h-4 w-4" />
              Email Signature
            </label>
            <textarea
              value={settings.signature}
              onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
              placeholder="Your email signature"
            />
          </div>

          {/* Auto-reply */}
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                <Mail className="h-4 w-4" />
                Auto-reply (vacation mode)
              </label>
              <p className="text-xs text-secondary-500">Automatically reply when you're away</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReply}
                onChange={(e) => setSettings({ ...settings, autoReply: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings.autoReply && (
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Auto-reply message</label>
              <textarea
                value={settings.autoReplyMessage}
                onChange={(e) => setSettings({ ...settings, autoReplyMessage: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
                placeholder="I'm currently out of office..."
              />
            </div>
          )}

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                <Bell className="h-4 w-4" />
                Email Notifications
              </label>
              <p className="text-xs text-secondary-500">Receive notifications for new emails</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notificationEmail}
                onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Read receipts */}
          <div className="flex items-center justify-between">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                <Shield className="h-4 w-4" />
                Request read receipts
              </label>
              <p className="text-xs text-secondary-500">Ask senders to confirm receipt</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.sendReadReceipts}
                onChange={(e) => setSettings({ ...settings, sendReadReceipts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Language */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Globe className="h-4 w-4" />
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          {/* Refresh interval */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <RefreshCw className="h-4 w-4" />
              Auto-refresh interval (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.refreshInterval}
              onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
              className="w-24 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            />
          </div>

          {/* Theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              <Globe className="h-4 w-4" />
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System default</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
        </div>

        {/* Success toast */}
        {success && (
          <div className="absolute bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
            Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
};
export default EmailSettings;
