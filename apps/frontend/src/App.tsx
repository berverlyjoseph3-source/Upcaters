// ============================================
// FILE: ./apps/frontend/src/App.tsx (UPDATED)
// ============================================

import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import Layout from './components/common/Layout';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/Register').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPassword').then(m => ({ default: m.ResetPasswordPage })));
const OAuthCallbackPage = lazy(() => import('./pages/auth/OAuthCallback').then(m => ({ default: m.OAuthCallbackPage })));

// Landing Page (public)
const LandingPage = lazy(() => import('./pages/landing/LandingPage').then(m => ({ default: m.default })));

// Dashboard page
const DashboardPage = lazy(() => import('./pages/dashboard/Dashboard').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'Dashboard'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Dashboard content coming soon...')
  )
})));

// Agents page
const AgentsPage = lazy(() => import('./pages/agents/Agents').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'AI Agents'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Agent management coming soon...')
  )
})));

// Billing page
const BillingPage = lazy(() => import('./pages/billing/Billing').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'Billing & Subscription'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Billing information coming soon...')
  )
})));

// Analytics page
const AnalyticsPage = lazy(() => import('./pages/analytics/Analytics').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'Analytics'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Usage analytics coming soon...')
  )
})));

// Settings page
const SettingsPage = lazy(() => import('./pages/settings/Settings').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'Settings'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Account settings coming soon...')
  )
})));

// Admin page
const AdminPage = lazy(() => import('./pages/admin/Admin').catch(() => ({
  default: () => React.createElement('div', { className: 'p-8' },
    React.createElement('h1', { className: 'text-2xl font-bold text-secondary-900 dark:text-white mb-4' }, 'Admin Panel'),
    React.createElement('p', { className: 'text-secondary-600 dark:text-secondary-400' }, 'Admin dashboard coming soon...')
  )
})));

// Loading component
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-secondary-600 dark:text-secondary-400">Loading...</p>
    </div>
  </div>
);

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requiredPlan?: string | string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, requiredPlan }) => {
  const { isAuthenticated, isLoading, user, loadUser } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loadUser();
    }
  }, [isAuthenticated, isLoading, loadUser]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    sessionStorage.setItem('return_to', window.location.pathname);
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPlan) {
    const plans = Array.isArray(requiredPlan) ? requiredPlan : [requiredPlan];
    if (!plans.includes(user?.planId || 'FREE')) {
      return <Navigate to="/billing" replace />;
    }
  }

  return <>{children}</>;
};

// Public Route - Redirects to dashboard if already authenticated
interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <PageLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main App Component
export const App: React.FC = () => {
  const { loadUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      loadUser();
    }
  }, [loadUser, isAuthenticated]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ============================================ */}
          {/* PUBLIC ROUTES (No Layout, Landing Page Style) */}
          {/* ============================================ */}

          {/* Landing Page - The marketing homepage */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />

          {/* Auth Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />

          {/* ============================================ */}
          {/* PROTECTED ROUTES (With Dashboard Layout)      */}
          {/* ============================================ */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/agents/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <AgentsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Layout>
                  <BillingPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute adminOnly={true}>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <SettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* ============================================ */}
          {/* CATCH-ALL ROUTE                              */}
          {/* ============================================ */}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
