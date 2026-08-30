// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/AlertFeed.tsx
import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface Alert {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AlertFeedProps {
  maxAlerts ? : number;
  autoDismiss ? : number;
  onAlertClick ? : (alert: Alert) => void;
}

const alertIcons = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

const alertBgColors = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

// Mock real-time alerts – in production, would come from WebSocket
const generateMockAlert = (): Alert => {
  const types: Alert['type'][] = ['info', 'success', 'warning', 'error'];
  const titles = {
    info: ['System Update', 'New Feature Available', 'Scheduled Maintenance'],
    success: ['Task Completed', 'Backup Successful', 'Deployment Live'],
    warning: ['High Memory Usage', 'Approaching Limit', 'Deprecation Notice'],
    error: ['Connection Failed', 'API Error', 'Authentication Failed'],
  };
  const type = types[Math.floor(Math.random() * types.length)];
  const titleList = titles[type];
  return {
    id: Date.now().toString(),
    type,
    title: titleList[Math.floor(Math.random() * titleList.length)],
    message: `This is a ${type} alert message for demonstration purposes.`,
    timestamp: new Date(),
    read: false,
  };
};

export const AlertFeed: React.FC < AlertFeedProps > = ({ maxAlerts = 10, autoDismiss = 5000, onAlertClick }) => {
  const [alerts, setAlerts] = useState < Alert[] > ([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    // Simulate real-time alerts (in production, subscribe to WebSocket)
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newAlert = generateMockAlert();
        setAlerts(prev => [newAlert, ...prev].slice(0, maxAlerts));
        if (autoDismiss > 0) {
          setTimeout(() => {
            setAlerts(prev => prev.filter(a => a.id !== newAlert.id));
          }, autoDismiss);
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [maxAlerts, autoDismiss]);
  
  const unreadCount = alerts.filter(a => !a.read).length;
  
  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };
  
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };
  
  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };
  
  const handleAlertClick = (alert: Alert) => {
    markAsRead(alert.id);
    if (onAlertClick) onAlertClick(alert);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50 overflow-hidden">
          <div className="flex justify-between items-center p-3 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="font-semibold text-secondary-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary-600 hover:text-primary-700">
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-secondary-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No new notifications</p>
              </div>
            ) : (
              alerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className={`p-3 border-b border-secondary-200 dark:border-secondary-700 cursor-pointer transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-700 ${alert.read ? 'opacity-70' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">{alertIcons[alert.type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white">{alert.title}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeAlert(alert.id); }}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-secondary-500 mt-1">{alert.message}</p>
                      <p className="text-xs text-secondary-400 mt-1">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AlertFeed;
