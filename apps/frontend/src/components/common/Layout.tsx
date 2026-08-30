// enterprise-ai-agent-platform/apps/frontend/src/components/common/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Bot, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Users, 
  LogOut, 
  User,
  Bell,
  ChevronDown,
  Sun,
  Moon,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import Button from './Button';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { name: 'Agents', href: '/agents', icon: <Bot className="h-5 w-5" /> },
  { name: 'Billing', href: '/billing', icon: <CreditCard className="h-5 w-5" /> },
  { name: 'Analytics', href: '/analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { name: 'Settings', href: '/settings', icon: <Settings className="h-5 w-5" /> },
  { name: 'Admin', href: '/admin', icon: <Shield className="h-5 w-5" />, adminOnly: true },
];

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
  showFooter?: boolean;
}

const getPlanBadgeColor = (planId: string) => {
  switch (planId) {
    case 'FREE': return 'bg-secondary-100 text-secondary-700';
    case 'STARTER': return 'bg-blue-100 text-blue-700';
    case 'PROFESSIONAL': return 'bg-primary-100 text-primary-700';
    case 'ENTERPRISE': return 'bg-purple-100 text-purple-700';
    default: return 'bg-secondary-100 text-secondary-700';
  }
};

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showNavbar = true, 
  showFooter = true 
}) => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; read: boolean }>>([]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  // Fetch notifications (can be connected to API later)
  useEffect(() => {
    if (isAuthenticated) {
      // TODO: Connect to notification API
      // fetchNotifications();
    }
  }, [isAuthenticated]);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.adminOnly && user?.role !== 'ADMIN') return false;
    return true;
  });

  const getInitials = (name?: string | null, email?: string) => {
    if (name && name.length > 0) {
      return name.charAt(0).toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  if (!showNavbar) {
    return (
      <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
        <main>{children}</main>
        {showFooter && (
          <footer className="bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <p className="text-center text-sm text-secondary-500 dark:text-secondary-400">
                © {new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
            </div>
          </footer>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-secondary-800 shadow-sm border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">AI</span>
                </div>
                <span className="font-semibold text-secondary-900 dark:text-white text-lg hidden sm:inline-block">
                  AI Agent Platform
                </span>
              </Link>
              
              {/* Desktop Navigation Links */}
              <div className="hidden md:flex ml-10 space-x-1">
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right side - User menu, theme toggle, notifications */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <button
                className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                )}
              </button>

              {/* User Menu Dropdown */}
              {isAuthenticated && user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                    aria-label="User menu"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                      {getInitials(user.name, user.email)}
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">
                        {user.name || user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400">
                        {user.email || ''}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-secondary-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50 overflow-hidden">
                        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                              {getInitials(user.name, user.email)}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900 dark:text-white">
                                {user.name || user.email?.split('@')[0] || 'User'}
                              </p>
                              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                                {user.email || ''}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.planId)}`}>
                              {user.planId || 'FREE'} Plan
                            </span>
                          </div>
                        </div>
                        
                        <div className="py-2">
                          <Link
                            to="/profile"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            Your Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="h-4 w-4" />
                            Settings
                          </Link>
                          {user.role === 'ADMIN' && (
                            <Link
                              to="/admin"
                              className="flex items-center gap-3 px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <Shield className="h-4 w-4" />
                              Admin Panel
                            </Link>
                          )}
                        </div>
                        
                        <div className="border-t border-secondary-200 dark:border-secondary-700 py-2">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-error hover:bg-error/10 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-secondary-200 dark:border-secondary-700 py-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 text-base font-medium transition-colors
                  ${location.pathname === item.href || location.pathname.startsWith(item.href + '/')
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                  }
                `}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="py-8">
        {children}
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                © {new Date().getFullYear()} AI Agent Platform. All rights reserved.
              </p>
              <div className="flex gap-6">
                <a href="/terms" className="text-sm text-secondary-500 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors">
                  Terms
                </a>
                <a href="/privacy" className="text-sm text-secondary-500 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors">
                  Privacy
                </a>
                <a href="/security" className="text-sm text-secondary-500 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors">
                  Security
                </a>
                <a href="/support" className="text-sm text-secondary-500 hover:text-primary-600 dark:text-secondary-400 dark:hover:text-primary-400 transition-colors">
                  Support
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
