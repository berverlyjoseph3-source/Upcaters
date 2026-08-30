// enterprise-ai-agent-platform/apps/frontend/src/components/billing/FeatureComparison.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Plan } from '../../types/billing.types';

interface FeatureComparisonProps {
  plans: Plan[];
}

const allFeatures = [
  { key: 'emailAgent', label: 'Email Agent', description: 'Gmail integration for sending, reading, and organizing emails' },
  { key: 'driveAgent', label: 'Drive Agent', description: 'Google Drive file management and sharing' },
  { key: 'contentAgentText', label: 'AI Text Generation', description: 'Generate articles, emails, code with GPT-4' },
  { key: 'contentAgentImage', label: 'AI Image Generation', description: 'Create images with DALL-E and Stable Diffusion' },
  { key: 'contentAgentVideo', label: 'AI Video Generation', description: 'Generate short videos (Enterprise only)' },
  { key: 'socialUploadAgent', label: 'Social Media Posting', description: 'Post to LinkedIn, Instagram, Facebook, X' },
  { key: 'calendarAgent', label: 'Calendar Agent', description: 'Google Calendar integration and smart scheduling' },
  { key: 'webAgent', label: 'Web Agent', description: 'Web search, weather, Perplexity AI research' },
  { key: 'taskAgent', label: 'Task Agent', description: 'Task management across Google Tasks, Asana, Monday' },
  { key: 'multiPlatformPosts', label: 'Multi-Platform Posts', description: 'Post to multiple platforms simultaneously' },
  { key: 'apiAccess', label: 'API Access', description: 'Programmatic access via REST API' },
  { key: 'whiteLabel', label: 'White Label', description: 'Custom branding and white-label solutions' },
  { key: 'customIntegrations', label: 'Custom Integrations', description: 'Custom API integrations for your stack' },
  { key: 'slaGuarantee', label: 'SLA Guarantee', description: '99.9% uptime SLA with support credits' },
];

// Map features to plan limits display
const getFeatureValue = (plan: Plan, featureKey: string): string | boolean => {
  const limits = plan.limits;
  switch (featureKey) {
    case 'emailAgent': return true;
    case 'driveAgent': return plan.id !== 'FREE';
    case 'contentAgentText': return true;
    case 'contentAgentImage': return plan.id === 'PROFESSIONAL' || plan.id === 'ENTERPRISE';
    case 'contentAgentVideo': return plan.id === 'ENTERPRISE';
    case 'socialUploadAgent': return plan.id !== 'FREE';
    case 'calendarAgent': return true;
    case 'webAgent': return true;
    case 'taskAgent': return plan.id !== 'FREE';
    case 'multiPlatformPosts': return plan.id === 'PROFESSIONAL' || plan.id === 'ENTERPRISE';
    case 'apiAccess': return plan.id === 'PROFESSIONAL' || plan.id === 'ENTERPRISE';
    case 'whiteLabel': return plan.id === 'ENTERPRISE';
    case 'customIntegrations': return plan.id === 'ENTERPRISE';
    case 'slaGuarantee': return plan.id === 'ENTERPRISE';
    default: return false;
  }
};

export const FeatureComparison: React.FC<FeatureComparisonProps> = ({ plans }) => {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const displayedFeatures = showAllFeatures ? allFeatures : allFeatures.slice(0, 8);

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Feature Comparison</h3>
        <p className="text-sm text-secondary-500 mt-1">Compare features across all plans</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Feature</th>
              {plans.map(plan => (
                <th key={plan.id} className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {displayedFeatures.map(feature => (
              <tr key={feature.key} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-secondary-900 dark:text-white">{feature.label}</div>
                  <div className="text-xs text-secondary-500 mt-0.5">{feature.description}</div>
                </td>
                {plans.map(plan => {
                  const value = getFeatureValue(plan, feature.key);
                  return (
                    <td key={plan.id} className="px-6 py-4 text-center">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-secondary-300 dark:text-secondary-600 mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium">{value}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-secondary-200 dark:border-secondary-700 text-center">
        <button
          onClick={() => setShowAllFeatures(!showAllFeatures)}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          {showAllFeatures ? (
            <>Show less <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Show all features <ChevronDown className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
};
export default FeatureComparison;
