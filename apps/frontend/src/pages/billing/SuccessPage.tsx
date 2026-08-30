// enterprise-ai-agent-platform/apps/frontend/src/pages/billing/SuccessPage.tsx
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, Receipt } from 'lucide-react';
import { Layout } from '../../components/common/Layout';

export const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [sessionId] = useState(searchParams.get('session_id'));
  const [isNewUser, setIsNewUser] = useState(searchParams.get('is_new') === 'true');
  
  useEffect(() => {
    // Track successful checkout for analytics
    if (sessionId) {
      console.log('Checkout completed:', sessionId);
    }
  }, [sessionId]);
  
  return (
    <Layout showNavbar={true} showFooter={true}>
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white mb-3">
            {isNewUser ? 'Welcome to AI Agent Platform!' : 'Subscription Updated!'}
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            {isNewUser
              ? 'Your account has been successfully created and your subscription is active.'
              : 'Your subscription has been successfully updated. You now have access to all premium features.'}
          </p>

          <div className="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-6 mb-8 text-left">
            <h3 className="font-semibold text-secondary-900 dark:text-white mb-3">What happens next?</h3>
            <ul className="space-y-2 text-sm text-secondary-600 dark:text-secondary-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                Your subscription is now active and will renew automatically
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                You can manage your subscription in the Billing section
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                A receipt has been sent to your email address
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <Link
              to="/billing"
              className="inline-flex items-center gap-2 px-6 py-3 border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              <Receipt className="h-4 w-4" />
              View Billing
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};
export default SuccessPage;
