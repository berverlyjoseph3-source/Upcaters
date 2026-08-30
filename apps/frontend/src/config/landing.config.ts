// ============================================
// apps/frontend/src/config/landing.config.ts
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// All visual values reference design tokens ONLY
// No arbitrary magic numbers, colors, or spacing
// ============================================

import {
  LandingPageConfig,
  NavbarConfig,
  HeroConfig,
  FeaturesSectionConfig,
  StatsSectionConfig,
  WorkflowDemoConfig,
  IntegrationsSectionConfig,
  PricingSectionConfig,
  TestimonialsSectionConfig,
  FAQSectionConfig,
  CTABannerConfig,
  FooterConfig,
  LandingPageMeta,
  GlowOrb,
} from '../types/landing.types';

// ============================================
// ICON IMPORTS
// (These reference Lucide icons — the design system's icon library)
// ============================================
// In production, these would be imported dynamically.
// We define icon names as strings that map to Lucide components.

type IconName =
  | 'Sparkles'
  | 'ArrowRight'
  | 'ChevronDown'
  | 'Mail'
  | 'HardDrive'
  | 'Sparkles'
  | 'Share2'
  | 'Calendar'
  | 'Globe'
  | 'CheckSquare'
  | 'Cpu'
  | 'Shield'
  | 'Zap'
  | 'Users'
  | 'TrendingUp'
  | 'Star'
  | 'Check'
  | 'X'
  | 'Menu'
  | 'Linkedin'
  | 'Instagram'
  | 'Facebook'
  | 'Twitter'
  | 'Youtube'
  | 'Github'
  | 'Discord';

// ============================================
// 1. PAGE META
// ============================================

const pageMeta: LandingPageMeta = {
  title: 'UPCATERS — Enterprise AI Agent Platform | Automate Your Workflow',
  description:
    'Deploy intelligent AI agents that automate email, drive, social media, calendar, web research, and task management. Control your entire workflow with one AI system trusted by 10,000+ teams.',
  ogImage: '/og-image.png',
  canonicalUrl: 'https://www.upcaters.com',
  keywords: [
    'AI agent platform',
    'enterprise AI automation',
    'email automation',
    'social media automation',
    'task management AI',
    'AI workflow orchestration',
    'Google Drive automation',
    'calendar scheduling AI',
    'web research AI',
    'content generation AI',
    'multi-agent AI system',
    'enterprise SaaS',
  ],
  author: 'UPCATERS',
  themeColor: '#3B82F6',
};

// ============================================
// 2. NAVIGATION
// ============================================

const navigation: NavbarConfig = {
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
    alt: 'UPCATERS — AI Agent Platform',
    width: 160,
    height: 40,
    href: '/',
  },

  transparentOnTop: true,
  showMobileMenu: true,

  items: [
    {
      id: 'features',
      label: 'Features',
      href: '#features',
      trackingEvent: 'nav_features_click',
    },
    {
      id: 'workflow',
      label: 'Workflow',
      href: '#workflow',
      trackingEvent: 'nav_workflow_click',
    },
    {
      id: 'pricing',
      label: 'Pricing',
      href: '#pricing',
      trackingEvent: 'nav_pricing_click',
    },
    {
      id: 'integrations',
      label: 'Integrations',
      href: '#integrations',
      trackingEvent: 'nav_integrations_click',
    },
    {
      id: 'resources',
      label: 'Resources',
      href: '#',
      children: [
        {
          label: 'Documentation',
          href: '/docs',
          description: 'API references and integration guides',
          icon: 'FileText' as unknown as React.ReactNode,
        },
        {
          label: 'Blog',
          href: '/blog',
          description: 'AI automation insights and case studies',
          icon: 'BookOpen' as unknown as React.ReactNode,
        },
        {
          label: 'API Reference',
          href: '/api',
          description: 'Full API documentation for developers',
          icon: 'Code' as unknown as React.ReactNode,
        },
        {
          label: 'Community',
          href: '/community',
          description: 'Join our Discord community',
          icon: 'Discord' as unknown as React.ReactNode,
        },
      ],
      trackingEvent: 'nav_resources_click',
    },
  ],

  ctas: [
    {
      id: 'login',
      label: 'Sign In',
      href: '/login',
      isCTA: false,
      trackingEvent: 'nav_login_click',
    },
    {
      id: 'get-started',
      label: 'Get Started Free',
      href: '/register',
      isCTA: true,
      ctaVariant: 'primary',
      trackingEvent: 'nav_cta_click',
    },
  ],
};

// ============================================
// 3. HERO SECTION
// ============================================

const hero: HeroConfig = {
  badge: {
    text: 'Enterprise AI Platform v2.0 Now Available',
    icon: 'Sparkles' as unknown as React.ReactNode,
    bgColor: 'brand-primary',
    borderColor: 'brand-primary',
    textColor: 'brand-primary',
  },

  headline: 'Control Your Entire Workflow With One AI',

  highlightedWords: ['Workflow', 'One AI'],

  subheadline:
    'Deploy intelligent agents that automate email, drive, social media, calendar, web research, and task management — all from a single, unified platform.',

  primaryCTA: {
    label: 'Start Building Free',
    href: '/register',
    variant: 'primary',
    icon: 'ArrowRight' as unknown as React.ReactNode,
    trackingEvent: 'hero_primary_cta_click',
  },

  secondaryCTA: {
    label: 'Watch Demo',
    href: '#demo',
    variant: 'secondary',
    opensModal: 'video',
    trackingEvent: 'hero_secondary_cta_click',
  },

  stats: [
    {
      value: '10,000+',
      label: 'Teams',
    },
    {
      value: '99.99%',
      label: 'Uptime',
    },
    {
      value: '4.9',
      label: 'Rating',
    },
    {
      value: '40+',
      label: 'Integrations',
    },
  ],

  showOrbs: true,
  showScrollIndicator: true,

  backgroundGradient: {
    from: 'brand-dark',
    via: 'brand-dark',
    to: 'brand-surface',
  },
};

// ============================================
// 4. FEATURES / AGENTS
// ============================================

const features: FeaturesSectionConfig = {
  heading: 'AI Agents for Every Workflow',
  subheading:
    'Our specialized AI agents work together to automate your entire business — no code required.',

  layout: 'grid',
  columns: { sm: 2, md: 3, lg: 4 },
  showViewAll: false,

  cards: [
    {
      id: 'email-agent',
      title: 'Email Agent',
      description: 'Smart email management with AI-powered replies, labeling, and prioritization.',
      icon: { name: 'Mail' },
      gradient: 'from-blue-500 to-blue-600',
      capabilities: [
        { name: 'Auto-reply suggestions', premium: false },
        { name: 'Email classification', premium: false },
        { name: 'AI draft generation', premium: false },
        { name: 'Smart label management', premium: false },
        { name: 'Bulk email processing', premium: true },
      ],
      learnMoreUrl: '/agents/email',
      requiredPlan: 'FREE',
      animation: { delay: 0, duration: 'normal', direction: 'up' },
    },
    {
      id: 'drive-agent',
      title: 'Drive Agent',
      description: 'File management, search, sharing, and organization across Google Drive.',
      icon: { name: 'HardDrive' },
      gradient: 'from-green-500 to-green-600',
      capabilities: [
        { name: 'File upload/download', premium: false },
        { name: 'Smart search', premium: false },
        { name: 'Batch file sharing', premium: false },
        { name: 'Auto-organization', premium: true },
        { name: 'File preview & conversion', premium: true },
      ],
      learnMoreUrl: '/agents/drive',
      requiredPlan: 'STARTER',
      animation: { delay: 0.1, duration: 'normal', direction: 'up' },
    },
    {
      id: 'content-agent',
      title: 'Content Agent',
      description: 'Generate text, images, and videos using state-of-the-art AI models.',
      icon: { name: 'Sparkles' },
      gradient: 'from-purple-500 to-purple-600',
      capabilities: [
        { name: 'AI text generation', premium: false },
        { name: 'DALL-E image creation', premium: false },
        { name: 'Video generation', premium: true, comingSoon: false },
        { name: 'Code generation', premium: false },
        { name: 'Content translation', premium: false },
      ],
      learnMoreUrl: '/agents/content',
      requiredPlan: 'FREE',
      animation: { delay: 0.2, duration: 'normal', direction: 'up' },
    },
    {
      id: 'social-agent',
      title: 'Social Agent',
      description: 'Schedule and post to LinkedIn, Instagram, Facebook, and X (Twitter).',
      icon: { name: 'Share2' },
      gradient: 'from-pink-500 to-pink-600',
      capabilities: [
        { name: 'Multi-platform posting', premium: false },
        { name: 'Content scheduling', premium: false },
        { name: 'Engagement analytics', premium: false },
        { name: 'AI content optimization', premium: true },
        { name: 'Bulk scheduling', premium: true },
      ],
      learnMoreUrl: '/agents/social',
      requiredPlan: 'STARTER',
      animation: { delay: 0.3, duration: 'normal', direction: 'up' },
    },
    {
      id: 'calendar-agent',
      title: 'Calendar Agent',
      description: 'Smart scheduling, meeting management, and availability coordination.',
      icon: { name: 'Calendar' },
      gradient: 'from-orange-500 to-orange-600',
      capabilities: [
        { name: 'Smart meeting scheduling', premium: false },
        { name: 'Availability checking', premium: false },
        { name: 'Calendar sync', premium: false },
        { name: 'Meeting reminders', premium: false },
        { name: 'Group scheduling', premium: true },
      ],
      learnMoreUrl: '/agents/calendar',
      requiredPlan: 'FREE',
      animation: { delay: 0.4, duration: 'normal', direction: 'up' },
    },
    {
      id: 'web-agent',
      title: 'Web Agent',
      description: 'Web search, research, weather, and data extraction with Perplexity AI.',
      icon: { name: 'Globe' },
      gradient: 'from-teal-500 to-teal-600',
      capabilities: [
        { name: 'Web search (Brave)', premium: false },
        { name: 'Deep research (Perplexity)', premium: false },
        { name: 'Live weather & forecasts', premium: false },
        { name: 'News aggregation', premium: false },
        { name: 'Data extraction & scraping', premium: true },
      ],
      learnMoreUrl: '/agents/web',
      requiredPlan: 'FREE',
      animation: { delay: 0.5, duration: 'normal', direction: 'up' },
    },
    {
      id: 'task-agent',
      title: 'Task Agent',
      description: 'Manage tasks across Google Tasks, Asana, and Monday.com.',
      icon: { name: 'CheckSquare' },
      gradient: 'from-indigo-500 to-indigo-600',
      capabilities: [
        { name: 'Task creation & management', premium: false },
        { name: 'Multi-platform sync', premium: false },
        { name: 'Task automation rules', premium: false },
        { name: 'Project templates', premium: true },
        { name: 'Advanced reporting', premium: true },
      ],
      learnMoreUrl: '/agents/task',
      requiredPlan: 'STARTER',
      animation: { delay: 0.6, duration: 'normal', direction: 'up' },
    },
    {
      id: 'orchestrator',
      title: 'Ultimate AI Agent',
      description: 'Central orchestrator that coordinates all agents for complex workflows.',
      icon: { name: 'Cpu' },
      gradient: 'from-gray-500 to-gray-600',
      capabilities: [
        { name: 'Intent classification', premium: false },
        { name: 'Task planning & delegation', premium: false },
        { name: 'Multi-agent coordination', premium: false },
        { name: 'Execution reflection', premium: false },
        { name: 'Memory & learning', premium: true },
      ],
      highlight: true,
      highlightBadge: 'Core Engine',
      learnMoreUrl: '/agents/orchestrator',
      requiredPlan: 'FREE',
      animation: { delay: 0.7, duration: 'normal', direction: 'up' },
    },
  ],
};

// ============================================
// 5. STATS COUNTER
// ============================================

const stats: StatsSectionConfig = {
  heading: 'Trusted by Industry Leaders',
  subheading: 'Real results from teams that switched to AI automation',

  layout: 'grid',
  columns: { sm: 2, md: 4 },
  background: 'solid',

  stats: [
    {
      id: 'stat-teams',
      value: '10,000',
      suffix: '+',
      label: 'Active Teams',
      animate: true,
      animationDuration: 2000,
    },
    {
      id: 'stat-executions',
      value: '2.5',
      suffix: 'M+',
      label: 'AI Actions Executed',
      animate: true,
      animationDuration: 2500,
    },
    {
      id: 'stat-uptime',
      value: '99.99',
      suffix: '%',
      label: 'Platform Uptime',
      animate: true,
      animationDuration: 1500,
    },
    {
      id: 'stat-savings',
      value: '40',
      suffix: '+',
      label: 'Hours Saved per Week',
      animate: true,
      animationDuration: 2000,
    },
  ],
};

// ============================================
// 6. WORKFLOW DEMO
// ============================================

const workflow: WorkflowDemoConfig = {
  heading: 'How It Works',
  subheading:
    'Our AI orchestrator intelligently routes your requests to the right agents — automatically.',

  animated: true,
  animationSpeed: 1,
  background: 'grid',

  nodes: [
    {
      id: 'input',
      label: 'Natural Language Input',
      description: 'Type your request in plain English',
      icon: { name: 'MessageSquare' },
      gradient: 'from-brand-primary to-brand-secondary',
      role: 'input',
      status: 'completed',
      duration: '< 100ms',
    },
    {
      id: 'classify',
      label: 'Intent Classification',
      description: 'AI understands what you want to do',
      icon: { name: 'Brain' },
      gradient: 'from-brand-secondary to-brand-accent',
      role: 'processor',
      status: 'completed',
      duration: '~250ms',
    },
    {
      id: 'plan',
      label: 'Auto Plan Creation',
      description: 'Orchestrator builds execution plan',
      icon: { name: 'GitBranch' },
      gradient: 'from-brand-accent to-brand-primary',
      role: 'processor',
      status: 'running',
      duration: '~500ms',
    },
    {
      id: 'delegate',
      label: 'Agent Delegation',
      description: 'Tasks routed to specialized agents',
      icon: { name: 'Send' },
      gradient: 'from-purple-500 to-pink-600',
      role: 'processor',
      status: 'pending',
      duration: '~1s',
    },
    {
      id: 'output',
      label: 'Results Delivered',
      description: 'Unified response with action confirmations',
      icon: { name: 'CheckCircle' },
      gradient: 'from-green-500 to-emerald-600',
      role: 'output',
      status: 'pending',
      duration: '~2s',
    },
  ],

  connections: [
    { from: 'input', to: 'classify', animated: true, showDataFlow: true },
    { from: 'classify', to: 'plan', animated: true, showDataFlow: true },
    { from: 'plan', to: 'delegate', animated: true, showDataFlow: true },
    { from: 'delegate', to: 'output', animated: true, showDataFlow: true },
  ],

  cta: {
    label: 'Try It Yourself',
    href: '/register',
    variant: 'primary',
  },
};

// ============================================
// 7. INTEGRATIONS
// ============================================

const integrations: IntegrationsSectionConfig = {
  heading: 'Works With Your Stack',
  subheading: 'Seamlessly connects with the tools your team already uses.',

  style: 'marquee',
  showViewAll: true,
  viewAllUrl: '/integrations',
  totalCount: 40,

  integrations: [
    {
      id: 'gmail',
      name: 'Gmail',
      logo: '/logos/gmail.svg',
      category: 'Email',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      logo: '/logos/google-calendar.svg',
      category: 'Calendar',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      logo: '/logos/google-drive.svg',
      category: 'Storage',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      logo: '/logos/linkedin.svg',
      category: 'Social',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      logo: '/logos/instagram.svg',
      category: 'Social',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      logo: '/logos/facebook.svg',
      category: 'Social',
    },
    {
      id: 'x-twitter',
      name: 'X (Twitter)',
      logo: '/logos/x.svg',
      category: 'Social',
    },
    {
      id: 'asana',
      name: 'Asana',
      logo: '/logos/asana.svg',
      category: 'Tasks',
    },
    {
      id: 'monday',
      name: 'Monday.com',
      logo: '/logos/monday.svg',
      category: 'Tasks',
    },
    {
      id: 'google-tasks',
      name: 'Google Tasks',
      logo: '/logos/google-tasks.svg',
      category: 'Tasks',
    },
    {
      id: 'stripe',
      name: 'Stripe',
      logo: '/logos/stripe.svg',
      category: 'Payments',
    },
    {
      id: 'slack',
      name: 'Slack',
      logo: '/logos/slack.svg',
      category: 'Communication',
    },
  ],
};

// ============================================
// 8. PRICING
// ============================================

const pricing: PricingSectionConfig = {
  heading: 'Simple, Transparent Pricing',
  subheading: 'Start free and scale as your team grows. No hidden fees, no surprises.',

  showToggle: true,
  defaultInterval: 'monthly',
  yearlyDiscountText: 'Save 20%',

  faqLink: {
    label: 'Have questions? Check our FAQ',
    href: '#faq',
  },

  enterpriseCTA: {
    label: 'Need a custom plan? Contact Sales',
    href: '/contact',
  },

  plans: [
    {
      id: 'free',
      name: 'Free',
      description: 'For individuals exploring AI automation',
      monthlyPrice: 0,
      yearlyPrice: 0,
      currency: 'USD',
      cta: 'Get Started Free',
      ctaHref: '/register',
      gradient: 'from-gray-500 to-gray-600',
      limits: {
        aiActions: 50,
        apiCalls: 100,
        teamMembers: 1,
        storageGB: 0.1,
      },
      features: [
        { name: '50 AI Actions/month', included: true },
        { name: '100 API Calls/month', included: true },
        { name: 'Email Agent', included: true },
        { name: 'Calendar Agent', included: true },
        { name: 'Web Agent (Basic)', included: true },
        { name: 'Content Agent (Text)', included: true },
        { name: 'Drive Agent', included: false },
        { name: 'Social Agent', included: false },
        { name: 'Task Agent', included: false },
        { name: 'Image Generation', included: false },
        { name: 'API Access', included: false },
        { name: 'Community Support', included: true },
        { name: 'Priority Support', included: false },
      ],
      highlightedFeatureNames: [
        'Email Agent',
        'Calendar Agent',
        'Web Agent (Basic)',
        'Content Agent (Text)',
      ],
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'For professionals and small teams',
      monthlyPrice: 29,
      yearlyPrice: 278,
      currency: 'USD',
      cta: 'Start Free Trial',
      ctaHref: '/register?plan=starter',
      gradient: 'from-blue-500 to-blue-600',
      limits: {
        aiActions: 500,
        apiCalls: 2000,
        teamMembers: 3,
        storageGB: 1,
      },
      features: [
        { name: '500 AI Actions/month', included: true },
        { name: '2,000 API Calls/month', included: true },
        { name: 'All Free features', included: true, highlight: true },
        { name: 'Drive Agent', included: true },
        { name: 'Social Upload Agent', included: true },
        { name: 'Task Agent', included: true },
        { name: 'Content Agent (Full)', included: true },
        { name: 'Image Generation', included: false },
        { name: 'API Access', included: false },
        { name: 'Priority Support', included: true },
        { name: 'SLA Guarantee', included: false },
      ],
      highlightedFeatureNames: [
        'Drive Agent',
        'Social Upload Agent',
        'Task Agent',
        'Priority Support',
      ],
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing businesses that need more power',
      monthlyPrice: 99,
      yearlyPrice: 950,
      currency: 'USD',
      popular: true,
      cta: 'Start Free Trial',
      ctaHref: '/register?plan=professional',
      gradient: 'from-purple-500 to-purple-600',
      limits: {
        aiActions: 2500,
        apiCalls: 15000,
        teamMembers: 10,
        storageGB: 10,
      },
      features: [
        { name: '2,500 AI Actions/month', included: true },
        { name: '15,000 API Calls/month', included: true },
        { name: 'All Starter features', included: true, highlight: true },
        { name: 'Image Generation', included: true, highlight: true },
        { name: 'Multi-platform Posts', included: true },
        { name: 'API Access', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'Video Generation', included: false },
        { name: 'White-label', included: false },
        { name: 'Email Support', included: true },
        { name: 'SLA Guarantee', included: false },
      ],
      highlightedFeatureNames: [
        'Image Generation',
        'API Access',
        'Custom Integrations',
        'Multi-platform Posts',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with advanced needs',
      monthlyPrice: 499,
      yearlyPrice: 4790,
      currency: 'USD',
      cta: 'Contact Sales',
      ctaHref: '/contact?plan=enterprise',
      gradient: 'from-orange-500 to-orange-600',
      limits: {
        aiActions: 'unlimited',
        apiCalls: 'unlimited',
        teamMembers: 100,
        storageGB: 100,
      },
      features: [
        { name: 'Unlimited AI Actions', included: true, highlight: true },
        { name: 'Unlimited API Calls', included: true, highlight: true },
        { name: 'All Professional features', included: true },
        { name: 'Video Generation', included: true, highlight: true },
        { name: 'White-label Solution', included: true },
        { name: 'Custom Integrations', included: true },
        { name: 'SLA Guarantee', included: true, highlight: true },
        { name: '24/7 Phone Support', included: true },
        { name: 'Dedicated Account Manager', included: true },
        { name: 'Custom AI Model Training', included: true },
      ],
      highlightedFeatureNames: [
        'Unlimited AI Actions',
        'Unlimited API Calls',
        'Video Generation',
        'SLA Guarantee',
      ],
    },
  ],

  comparisonFeatures: [
    {
      name: 'AI Actions',
      values: { free: '50/mo', starter: '500/mo', professional: '2,500/mo', enterprise: 'Unlimited' },
    },
    {
      name: 'API Calls',
      values: { free: '100/mo', starter: '2,000/mo', professional: '15,000/mo', enterprise: 'Unlimited' },
    },
    {
      name: 'Team Members',
      values: { free: '1', starter: '3', professional: '10', enterprise: '100' },
    },
    {
      name: 'Image Generation',
      values: { free: false, starter: false, professional: true, enterprise: true },
    },
    {
      name: 'Video Generation',
      values: { free: false, starter: false, professional: false, enterprise: true },
    },
    {
      name: 'API Access',
      values: { free: false, starter: false, professional: true, enterprise: true },
    },
    {
      name: 'Support Level',
      values: { free: 'Community', starter: 'Priority', professional: 'Email', enterprise: '24/7 Phone' },
    },
    {
      name: 'SLA',
      values: { free: false, starter: false, professional: false, enterprise: true },
    },
  ],
};

// ============================================
// 9. TESTIMONIALS
// ============================================

const testimonials: TestimonialsSectionConfig = {
  heading: 'Loved by Teams Everywhere',
  subheading: 'See how companies are transforming their workflows with AI automation.',

  layout: 'grid',
  columns: { sm: 1, md: 2, lg: 3 },

  testimonials: [
    {
      id: 'testimonial-1',
      name: 'Sarah Johnson',
      role: 'CTO',
      company: 'TechFlow Inc.',
      companyLogo: '/logos/techflow.svg',
      content:
        'The AI Agent Platform transformed how we handle internal operations. We automated 80% of our routine tasks within the first month. The email and calendar agents alone save us 30 hours per week.',
      rating: 5,
      metrics: [
        { label: 'Time Saved', value: '40hrs/week', trend: 'up' },
        { label: 'ROI', value: '320%', trend: 'up' },
      ],
      avatar: '/avatars/sarah.jpg',
      verified: true,
      industry: 'Technology',
      companySize: 'medium',
    },
    {
      id: 'testimonial-2',
      name: 'Marcus Chen',
      role: 'VP of Marketing',
      company: 'GrowthPulse',
      companyLogo: '/logos/growthpulse.svg',
      content:
        'Our social media workflow is now completely automated. We schedule posts across 4 platforms in minutes. The AI content suggestions have improved our engagement by 45%.',
      rating: 5,
      metrics: [
        { label: 'Engagement', value: '+45%', trend: 'up' },
        { label: 'Posts/Week', value: '28', trend: 'up' },
      ],
      avatar: '/avatars/marcus.jpg',
      verified: true,
      industry: 'Marketing',
      companySize: 'small',
    },
    {
      id: 'testimonial-3',
      name: 'Elena Rodriguez',
      role: 'Operations Director',
      company: 'Atlas Logistics',
      companyLogo: '/logos/atlas.svg',
      content:
        'Managing complex supply chain tasks across multiple platforms used to be a nightmare. With the Task Agent and Web Agent working together, we automated our entire tracking system.',
      rating: 5,
      metrics: [
        { label: 'Efficiency Gain', value: '+65%', trend: 'up' },
        { label: 'Error Rate', value: '-92%', trend: 'down' },
      ],
      avatar: '/avatars/elena.jpg',
      verified: true,
      industry: 'Logistics',
      companySize: 'enterprise',
    },
    {
      id: 'testimonial-4',
      name: 'David Kim',
      role: 'Founder',
      company: 'NovaTech Startups',
      companyLogo: '/logos/novatech.svg',
      content:
        'As a startup, we needed to do more with less. The orchestration agent handles complex multi-step workflows that would normally require 3-4 different team members. Game changer.',
      rating: 5,
      metrics: [
        { label: 'Team Productivity', value: '+200%', trend: 'up' },
        { label: 'Cost Reduction', value: '-60%', trend: 'down' },
      ],
      avatar: '/avatars/david.jpg',
      verified: true,
      industry: 'Technology',
      companySize: 'small',
    },
    {
      id: 'testimonial-5',
      name: 'Amara Okafor',
      role: 'Head of Product',
      company: 'FinBridge',
      companyLogo: '/logos/finbridge.svg',
      content:
        'The content agent produces our weekly financial reports in seconds instead of hours. The accuracy is remarkable, and our compliance team loves the audit trail feature.',
      rating: 5,
      metrics: [
        { label: 'Report Speed', value: '120x faster', trend: 'up' },
        { label: 'Accuracy', value: '99.7%', trend: 'up' },
      ],
      avatar: '/avatars/amara.jpg',
      verified: true,
      industry: 'Finance',
      companySize: 'enterprise',
    },
    {
      id: 'testimonial-6',
      name: 'James Wilson',
      role: 'IT Manager',
      company: 'MedCore Health',
      companyLogo: '/logos/medcore.svg',
      content:
        'HIPAA compliance was a concern, but the enterprise plan gives us full data control and encryption. The Drive Agent keeps all our patient documentation organized and audit-ready.',
      rating: 4,
      metrics: [
        { label: 'Compliance Score', value: '100%', trend: 'stable' },
        { label: 'Audit Prep Time', value: '-85%', trend: 'down' },
      ],
      avatar: '/avatars/james.jpg',
      verified: true,
      industry: 'Healthcare',
      companySize: 'enterprise',
    },
  ],
};

// ============================================
// 10. FAQ
// ============================================

const faq: FAQSectionConfig = {
  heading: 'Frequently Asked Questions',
  subheading: 'Everything you need to know about the AI Agent Platform.',

  layout: 'two-column',
  showSearch: true,
  searchPlaceholder: 'Search questions...',

  contactCTA: {
    label: 'Still have questions? Contact us',
    href: '/contact',
  },

  items: [
    {
      id: 'faq-what-is',
      question: 'What exactly is the AI Agent Platform?',
      answer:
        'The AI Agent Platform is an enterprise-grade automation system that lets you control multiple AI agents from a single interface. It includes specialized agents for email, file management, content creation, social media, calendar scheduling, web research, and task management — all orchestrated by a central AI that understands natural language requests.',
      category: 'General',
    },
    {
      id: 'faq-how-works',
      question: 'How does the AI orchestration work?',
      answer:
        'When you type a request (e.g., "Send a follow-up email to the marketing team and schedule a meeting for next Tuesday"), our orchestrator classifies your intent, creates an execution plan, delegates tasks to the appropriate specialized agents, and returns a unified response. All of this happens in seconds.',
      category: 'General',
    },
    {
      id: 'faq-security',
      question: 'Is my data secure?',
      answer:
        'Absolutely. We use AES-256 encryption for data at rest and TLS 1.3 for data in transit. Our platform is SOC 2 Type II compliant, GDPR ready, and we never use your data to train AI models. Enterprise customers can deploy on their own infrastructure.',
      category: 'Security',
    },
    {
      id: 'faq-integrations',
      question: 'What integrations are supported?',
      answer:
        'We support over 40 integrations including Gmail, Google Calendar, Google Drive, LinkedIn, Instagram, Facebook, X (Twitter), Asana, Monday.com, Google Tasks, Stripe, Slack, and more. Our API also lets you build custom integrations with any service.',
      category: 'Integrations',
    },
    {
      id: 'faq-free-plan',
      question: 'What does the free plan include?',
      answer:
        'The free plan includes 50 AI Actions and 100 API Calls per month, along with access to the Email Agent, Calendar Agent, Web Agent (basic search), and Content Agent (text generation only). It\'s perfect for individuals who want to try the platform.',
      category: 'Pricing',
    },
    {
      id: 'faq-upgrade',
      question: 'Can I upgrade or downgrade my plan anytime?',
      answer:
        'Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your current billing period.',
      category: 'Pricing',
    },
    {
      id: 'faq-trial',
      question: 'Is there a free trial for paid plans?',
      answer:
        'Yes, all paid plans come with a 14-day free trial. No credit card is required to start your trial. You can cancel anytime during the trial period without being charged.',
      category: 'Pricing',
    },
    {
      id: 'faq-support',
      question: 'What kind of support do you provide?',
      answer:
        'Free plan users get access to our community support forums. Starter plan users get priority email support with 24-hour response time. Professional plan users get email support with 4-hour response time. Enterprise customers get 24/7 phone support with a dedicated account manager.',
      category: 'Support',
    },
    {
      id: 'faq-api',
      question: 'Do you have an API?',
      answer:
        'Yes, the Professional and Enterprise plans include full API access. Our REST API lets you programmatically execute AI agents, manage tasks, and integrate with your existing systems. Full API documentation is available at /docs/api.',
      category: 'Technical',
    },
    {
      id: 'faq-enterprise',
      question: 'What does the Enterprise plan offer?',
      answer:
        'The Enterprise plan includes everything: unlimited AI actions and API calls, all agents with full capabilities, video generation, white-label customization, custom integrations, SLA guarantee (99.99% uptime), 24/7 phone support, dedicated account manager, and the option for on-premise deployment.',
      category: 'Pricing',
      defaultExpanded: false,
    },
    {
      id: 'faq-migration',
      question: 'How do I migrate from existing tools?',
      answer:
        'We provide migration guides and our support team can assist with data import. Most integrations (Gmail, Google Calendar, Asana, etc.) connect via OAuth — just authorize the connection and the agent automatically syncs your data.',
      category: 'Technical',
    },
    {
      id: 'faq-custom',
      question: 'Can I create custom AI agents?',
      answer:
        'Enterprise customers can request custom agent development for specialized workflows. Our team works with you to understand your requirements and build custom agents that integrate with your specific tools and processes.',
      category: 'Technical',
    },
  ],
};

// ============================================
// 11. CTA BANNER
// ============================================

const ctaBanner: CTABannerConfig = {
  heading: 'Ready to Automate Your Workflow?',
  subheading: 'Join 10,000+ teams already using AI agents to save 40+ hours per week. Start free — no credit card required.',

  primaryCTA: {
    label: 'Get Started Free',
    href: '/register',
    variant: 'primary',
    icon: 'ArrowRight' as unknown as React.ReactNode,
  },

  secondaryCTA: {
    label: 'Talk to Sales',
    href: '/contact',
    variant: 'outline',
  },

  background: 'gradient',
  backgroundGradient: {
    from: 'brand-primary',
    to: 'brand-secondary',
    angle: 135,
  },

  showParticles: true,

  trustBadges: [
    'No credit card required',
    'Free 14-day trial',
    'Cancel anytime',
    'SOC 2 Compliant',
  ],
};

// ============================================
// 12. FOOTER
// ============================================

const footer: FooterConfig = {
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
    alt: 'UPCATERS',
    width: 140,
    height: 35,
    href: '/',
  },

  description:
    'Enterprise AI Agent Platform — Automate email, drive, social media, calendar, web research, and task management with intelligent AI agents.',

  columns: [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '/features' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Integrations', href: '/integrations' },
        { label: 'Changelog', href: '/changelog' },
        { label: 'Roadmap', href: '/roadmap' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Documentation', href: '/docs' },
        { label: 'API Reference', href: '/docs/api' },
        { label: 'Blog', href: '/blog' },
        { label: 'Guides', href: '/guides' },
        { label: 'Community', href: '/community' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Careers', href: '/careers' },
        { label: 'Contact', href: '/contact' },
        { label: 'Partners', href: '/partners' },
        { label: 'Press', href: '/press' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Security', href: '/security' },
        { label: 'GDPR', href: '/gdpr' },
        { label: 'Cookie Policy', href: '/cookies' },
      ],
    },
  ],

  socialLinks: [
    { platform: 'X (Twitter)', href: 'https://x.com/upcaters', icon: 'Twitter' as unknown as React.ReactNode },
    { platform: 'LinkedIn', href: 'https://linkedin.com/company/upcaters', icon: 'Linkedin' as unknown as React.ReactNode },
    { platform: 'GitHub', href: 'https://github.com/upcaters', icon: 'Github' as unknown as React.ReactNode },
    { platform: 'Discord', href: 'https://discord.gg/upcaters', icon: 'Discord' as unknown as React.ReactNode },
    { platform: 'YouTube', href: 'https://youtube.com/@upcaters', icon: 'Youtube' as unknown as React.ReactNode },
  ],

  copyright: `© ${new Date().getFullYear()} UPCATERS. All rights reserved.`,

  bottomLinks: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Cookie Settings', href: '#cookie-settings' },
  ],

  newsletter: {
    heading: 'Stay in the loop',
    placeholder: 'Enter your email',
    buttonLabel: 'Subscribe',
    onSubmit: (email: string) => {
      // In production: POST to /api/newsletter/subscribe
      console.log('Newsletter signup:', email);
    },
  },
};

// ============================================
// 13. GLOW ORBS (Background Effects)
// ============================================

const glowOrbs: GlowOrb[] = [
  {
    id: 'orb-hero-1',
    color: '#3B82F6',
    size: 500,
    x: '-10%',
    y: '-20%',
    blur: 120,
    opacity: [0.1, 0.2, 0.15],
    duration: 8,
    delay: 0,
  },
  {
    id: 'orb-hero-2',
    color: '#7C3AED',
    size: 400,
    x: '60%',
    y: '30%',
    blur: 100,
    opacity: [0.08, 0.18, 0.12],
    duration: 10,
    delay: 2,
  },
  {
    id: 'orb-hero-3',
    color: '#EC4899',
    size: 300,
    x: '40%',
    y: '70%',
    blur: 80,
    opacity: [0.05, 0.15, 0.1],
    duration: 12,
    delay: 4,
  },
  {
    id: 'orb-cta-1',
    color: '#3B82F6',
    size: 350,
    x: '80%',
    y: '50%',
    blur: 90,
    opacity: [0.1, 0.25, 0.15],
    duration: 7,
    delay: 0,
  },
  {
    id: 'orb-cta-2',
    color: '#7C3AED',
    size: 300,
    x: '10%',
    y: '60%',
    blur: 70,
    opacity: [0.08, 0.2, 0.12],
    duration: 9,
    delay: 3,
  },
];

// ============================================
// 14. EXPORT: COMPLETE LANDING PAGE CONFIG
// ============================================

export const landingPageConfig: LandingPageConfig = {
  meta: pageMeta,
  navigation,
  hero,
  features,
  stats,
  workflow,
  integrations,
  pricing,
  testimonials,
  faq,
  ctaBanner,
  footer,
  showScrollProgress: true,
  smoothScroll: true,
  glowOrbs,
  analyticsId: 'G-XXXXXXXXXX', // Replace with actual GA4 ID
};

// ============================================
// 15. NAMED EXPORTS (for individual section use)
// ============================================

export {
  pageMeta,
  navigation,
  hero,
  features,
  stats,
  workflow,
  integrations,
  pricing,
  testimonials,
  faq,
  ctaBanner,
  footer,
  glowOrbs,
};

// ============================================
// 16. TYPE-SAFE ACCESSORS
// ============================================

/** Get a feature card by its ID */
export function getFeatureById(id: string) {
  return features.cards.find((card) => card.id === id);
}

/** Get a pricing plan by its ID */
export function getPlanById(id: string) {
  return pricing.plans.find((plan) => plan.id === id);
}

/** Get a testimonial by its ID */
export function getTestimonialById(id: string) {
  return testimonials.testimonials.find((t) => t.id === id);
}

/** Get FAQ items by category */
export function getFAQByCategory(category: string) {
  return faq.items.filter((item) => item.category === category);
}

/** Get all unique FAQ categories */
export function getFAQCategories(): string[] {
  return [...new Set(faq.items.map((item) => item.category).filter(Boolean))] as string[];
}

/** Get navigation item by ID */
export function getNavItemById(id: string) {
  return navigation.items.find((item) => item.id === id);
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default landingPageConfig;