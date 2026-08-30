// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/shared/AgentSidebar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Mail, HardDrive, Sparkles, Share2, Calendar, Globe, CheckSquare, Cpu,
  LayoutDashboard, CreditCard, BarChart3, Settings, HelpCircle
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
}

const agentNavItems: NavItem[] = [
  { name: 'Agents Hub', path: '/agents', icon: <Cpu className="h-4 w-4" />, description: 'All agents' },
  { name: 'Email Agent', path: '/agents/email', icon: <Mail className="h-4 w-4" />, description: 'Gmail integration' },
  { name: 'Drive Agent', path: '/agents/drive', icon: <HardDrive className="h-4 w-4" />, description: 'File management' },
  { name: 'Content Agent', path: '/agents/content', icon: <Sparkles className="h-4 w-4" />, description: 'AI generation' },
  { name: 'Social Agent', path: '/agents/social', icon: <Share2 className="h-4 w-4" />, description: 'Social media' },
  { name: 'Calendar Agent', path: '/agents/calendar', icon: <Calendar className="h-4 w-4" />, description: 'Scheduling' },
  { name: 'Web Agent', path: '/agents/web', icon: <Globe className="h-4 w-4" />, description: 'Search & research' },
  { name: 'Task Agent', path: '/agents/task', icon: <CheckSquare className="h-4 w-4" />, description: 'Task management' },
];

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { name: 'Agents', path: '/agents', icon: <Cpu className="h-4 w-4" /> },
  { name: 'Billing', path: '/billing', icon: <CreditCard className="h-4 w-4" /> },
  { name: 'Analytics', path: '/analytics', icon: <BarChart3 className="h-4 w-4" /> },
  { name: 'Settings', path: '/settings', icon: <Settings className="h-4 w-4" /> },
];

interface AgentSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ isCollapsed = false, onToggle }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/agents') return location.pathname === '/agents';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`
      bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700
      flex flex-col transition-all duration-300
      ${isCollapsed ? 'w-16' : 'w-64'}
    `}>
      {/* Logo Area */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center">
              <Cpu className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-secondary-900 dark:text-white">AI Agent Platform</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center mx-auto">
            <Cpu className="h-4 w-4 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider">Main</p>
          )}
          {mainNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive(item.path)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                }
              `}
              title={isCollapsed ? item.name : undefined}
            >
              {item.icon}
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </div>

        {/* Agents Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-3 text-xs font-semibold text-secondary-400 uppercase tracking-wider">Agents</p>
          )}
          {agentNavItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive(item.path)
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                }
              `}
              title={isCollapsed ? item.name : undefined}
            >
              {item.icon}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <span>{item.name}</span>
                  {item.description && (
                    <p className="text-xs text-secondary-400 truncate">{item.description}</p>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-secondary-200 dark:border-secondary-700 space-y-1">
        <Link
          to="/settings"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            ${isActive('/settings') ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}
          `}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <Settings className="h-4 w-4" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
        <Link
          to="/support"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
            text-secondary-600 hover:bg-secondary-100
          `}
          title={isCollapsed ? 'Help' : undefined}
        >
          <HelpCircle className="h-4 w-4" />
          {!isCollapsed && <span>Help & Support</span>}
        </Link>
      </div>
    </aside>
  );
};
export default AgentSidebar;
