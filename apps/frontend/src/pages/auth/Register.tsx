// enterprise-ai-agent-platform/apps/frontend/src/pages/auth/Register.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import RegisterForm from '../../components/auth/RegisterForm';
import { Layout } from '../../components/common/Layout';
import { AlertCircle, Shield, Zap, Users, CheckCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, isLoading, error, validationErrors, isAuthenticated, clearError, clearValidationErrors, initiateOAuth } = useAuth();
  const navigate = useNavigate();
  const [showBenefits, setShowBenefits] = useState(true);
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Clear errors on unmount
  useEffect(() => {
    return () => {
      clearError();
      clearValidationErrors();
    };
  }, [clearError, clearValidationErrors]);
  
  const handleSubmit = async (data: any) => {
    const result = await register(data);
    if (result.success) {
      navigate('/dashboard');
    }
  };
  
  const benefits = [
    { icon: Zap, title: 'AI-Powered Automation', description: 'Automate email, calendar, social media, and tasks with AI' },
    { icon: Users, title: 'Team Collaboration', description: 'Invite team members and collaborate seamlessly' },
    { icon: Shield, title: 'Enterprise Security', description: 'Bank-grade encryption and security compliance' },
  ];
  
  return (
    <Layout showNavbar={false} showFooter={false}>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-secondary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - Benefits */}
            <div className="hidden lg:block space-y-8">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg mb-6">
                  <span className="text-white font-bold text-2xl">AI</span>
                </div>
                <h1 className="text-4xl font-bold text-secondary-900 mb-4">
                  Join the AI Revolution
                </h1>
                <p className="text-lg text-secondary-600">
                  Create your account and start automating your workflow with our intelligent AI agents.
                </p>
              </div>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-secondary-200 shadow-sm">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                      <benefit.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-secondary-900">{benefit.title}</h3>
                      <p className="text-sm text-secondary-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-primary-50 rounded-xl p-6 border border-primary-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-secondary-900">Free plan includes:</span>
                </div>
                <ul className="space-y-2 text-sm text-secondary-600">
                  <li className="flex items-center gap-2">• 50 AI Actions per month</li>
                  <li className="flex items-center gap-2">• 100 API Calls per month</li>
                  <li className="flex items-center gap-2">• Email, Calendar, and Web Agents</li>
                  <li className="flex items-center gap-2">• Community support</li>
                </ul>
              </div>
            </div>

            {/* Right Side - Registration Form */}
            <div className="w-full">
              <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-secondary-200">
                {/* Mobile Logo */}
                <div className="lg:hidden text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl shadow-lg">
                    <span className="text-white font-bold text-xl">AI</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-secondary-900">
                    Create your account
                  </h2>
                  <p className="mt-1 text-sm text-secondary-600">
                    Start using AI Agent Platform today
                  </p>
                </div>

                {/* Desktop Title */}
                <div className="hidden lg:block text-center mb-6">
                  <h2 className="text-2xl font-bold text-secondary-900">
                    Create your account
                  </h2>
                  <p className="text-sm text-secondary-600 mt-1">
                    Fill in the details below to get started
                  </p>
                </div>

                <RegisterForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  error={error}
                  validationErrors={validationErrors || undefined}
                  onOAuthStart={initiateOAuth}
                />
              </div>

              {/* Mobile Benefits */}
              <div className="lg:hidden mt-6 space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-secondary-200">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <benefit.icon className="h-4 w-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{benefit.title}</p>
                      <p className="text-xs text-secondary-500">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Links */}
              <div className="text-center mt-6 space-y-2">
                <p className="text-xs text-secondary-400">
                  By signing up, you agree to our{' '}
                  <a href="/terms" className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">
                    Terms
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary-500 hover:underline" target="_blank" rel="noopener noreferrer">
                    Privacy
                  </a>
                </p>
                <p className="text-xs text-secondary-400">
                  Need help?{' '}
                  <a href="/support" className="text-primary-500 hover:underline">
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default Register;
