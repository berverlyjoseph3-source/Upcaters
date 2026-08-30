// enterprise-ai-agent-platform/apps/frontend/src/utils/pricing.utils.ts

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: price % 100 === 0 ? 0 : 2,
  });
  return formatter.format(price / 100);
};

export const formatPeriod = (interval: 'month' | 'year'): string => {
  return interval === 'month' ? 'per month' : 'per year';
};

export const calculateAnnualSavings = (monthlyPrice: number, yearlyPrice: number): number => {
  const annualMonthlyTotal = monthlyPrice * 12;
  return annualMonthlyTotal - yearlyPrice;
};

export const calculateDiscountPercentage = (monthlyPrice: number, yearlyPrice: number): number => {
  const annualMonthlyTotal = monthlyPrice * 12;
  return Math.round(((annualMonthlyTotal - yearlyPrice) / annualMonthlyTotal) * 100);
};

export const getPlanFeatures = (planId: string): string[] => {
  const features: Record < string, string[] > = {
    FREE: [
      '50 AI Actions per month',
      '100 API Calls per month',
      'Email Agent',
      'Calendar Agent',
      'Web Agent',
      'Community Support',
    ],
    STARTER: [
      '500 AI Actions per month',
      '2,000 API Calls per month',
      'All FREE features',
      'Drive Agent',
      'Social Upload Agent',
      'Task Agent',
      'Priority Support',
    ],
    PROFESSIONAL: [
      '2,500 AI Actions per month',
      '15,000 API Calls per month',
      'All STARTER features',
      'Image Generation',
      'Multi-platform Posts',
      'API Access',
      'Email Support',
    ],
    ENTERPRISE: [
      'Unlimited AI Actions',
      'Unlimited API Calls',
      'All PROFESSIONAL features',
      'Video Generation',
      'White-label',
      'Custom Integrations',
      'SLA Guarantee',
      '24/7 Phone Support',
      'Dedicated Account Manager',
    ],
  };
  return features[planId] || features.FREE;
};

export const getPlanLimit = (planId: string, limitKey: string): number | string => {
  const limits: Record < string, Record < string, number | string >> = {
    FREE: { aiActions: 50, apiCalls: 100, teamMembers: 1, storageGB: 0.1 },
    STARTER: { aiActions: 500, apiCalls: 2000, teamMembers: 3, storageGB: 1 },
    PROFESSIONAL: { aiActions: 2500, apiCalls: 15000, teamMembers: 10, storageGB: 10 },
    ENTERPRISE: { aiActions: 'unlimited', apiCalls: 'unlimited', teamMembers: 100, storageGB: 100 },
  };
  return limits[planId]?.[limitKey] ?? '—';
};

export const formatUsageValue = (value: number | string): string => {
  if (value === 'unlimited') return '∞';
  if (typeof value === 'number') return value.toLocaleString();
  return value;
};

export const getPlanColor = (planId: string): string => {
  const colors: Record < string, string > = {
    FREE: 'bg-secondary-100 text-secondary-700',
    STARTER: 'bg-blue-100 text-blue-700',
    PROFESSIONAL: 'bg-primary-100 text-primary-700',
    ENTERPRISE: 'bg-purple-100 text-purple-700',
  };
  return colors[planId] || colors.FREE;
};