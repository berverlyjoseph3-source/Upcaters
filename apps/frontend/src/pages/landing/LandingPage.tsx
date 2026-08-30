// ============================================
// apps/frontend/src/pages/landing/LandingPage.tsx
// Enterprise AI Agent Platform — Marketing Landing Page
// Design System: UPCATERS Design Tokens
// ============================================

'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useLandingPage } from '../../hooks/landing/useLandingPage';
import { Navbar } from '../../components/landing/layout/Navbar';
import { Footer } from '../../components/landing/layout/Footer';
import { HeroSection } from '../../components/landing/sections/HeroSection';
import { FeaturesShowcase, AgentFeatures } from '../../components/landing/sections/FeaturesShowcase';
import { WorkflowDemo, OrchestratorWorkflow } from '../../components/landing/sections/WorkflowDemo';
import { IntegrationsMarquee } from '../../components/landing/sections/IntegrationsMarquee';
import { PricingComparison } from '../../components/landing/sections/PricingComparison';
import { TestimonialsGrid } from '../../components/landing/sections/TestimonialsGrid';
import { StatsCounter } from '../../components/landing/sections/StatsCounter';
import { CTABanner, PremiumCTA } from '../../components/landing/sections/CTABanner';
import { FAQAccordion } from '../../components/landing/sections/FAQAccordion';
import { SectionWrapper } from '../../components/landing/ui/SectionWrapper';
import { GradientText } from '../../components/landing/ui/GradientText';
import { GlowingButton } from '../../components/landing/ui/GlowingButton';
import { RevealAnimation } from '../../components/landing/ui/RevealAnimation';
import { ParticleBackground } from '../../components/landing/ui/ParticleBackground';
import { GridPattern } from '../../components/landing/ui/GridPattern';

import {
  // Icons
  Bot,
  Mail,
  Calendar,
  FileText,
  Share2,
  Search,
  CheckSquare,
  Activity,
  Zap,
  Shield,
  Users,
  Globe,
  Database,
  Workflow,
  Sparkles,
  TrendingUp,
  Clock,
  Server,
  ArrowRight,
  Play,
  Star,
  Heart,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  CreditCard,
  Headphones,
  Lock,
  Cloud,
} from 'lucide-react';

import type {
  HeroSectionProps,
  FeatureItem,
  WorkflowStep,
  PricingPlan,
  TestimonialItem,
  FAQItem,
  StatItem,
  NavLink,
  FooterColumn,
  SocialLink,
} from '../../types/landing.types';

// ============================================
// 1. CONFIGURATION
// ============================================

const LANDING_CONFIG = {
  navigation: {
    logo: {
      src: '/logo.svg',
      alt: 'AI Agent Platform',
      width: 180,
      height: 40,
    },
    links: [
      { id: 'features', label: 'Features', href: '#features' },
      { id: 'workflow', label: 'How It Works', href: '#workflow' },
      { id: 'pricing', label: 'Pricing', href: '#pricing' },
      { id: 'testimonials', label: 'Testimonials', href: '#testimonials' },
      { id: 'faq', label: 'FAQ', href: '#faq' },
    ] as NavLink[],
    ctas: [
      { label: 'Sign In', href: '/login', variant: 'ghost' },
      { label: 'Get Started Free', href: '/register', variant: 'primary' },
    ],
  },

  hero: {
    badge: {
      text: '🚀 Now with AI Orchestrator v3.0',
      variant: 'primary',
      icon: <Sparkles className="w-3.5 h-3.5" />,
    },
    title: 'Your Entire Workflow,\nPowered by ',
    highlightedTitle: '7 AI Agents',
    subtitle:
      'Orchestrate email, calendar, social media, file management, web research, and task automation — all from a single conversational interface.',
    primaryCTA: {
      label: 'Start Free Trial',
      href: '/register',
      variant: 'primary',
      showArrow: true,
      glow: true,
    },
    secondaryCTA: {
      label: 'Watch Demo',
      href: '#demo',
      variant: 'glass',
      icon: <Play className="w-4 h-4" />,
    },
    stats: [
      {
        value: '10,000+',
        label: 'Active Users',
        icon: <Users className="w-5 h-5" />,
      },
      {
        value: '2.5M+',
        label: 'AI Actions Processed',
        icon: <Zap className="w-5 h-5" />,
      },
      {
        value: '99.9%',
        label: 'Uptime SLA',
        icon: <Shield className="w-5 h-5" />,
      },
      {
        value: '50+',
        label: 'Integrations',
        icon: <Globe className="w-5 h-5" />,
      },
    ],
    trust: {
      rating: 4.8,
      ratingText: 'from 500+ reviews on G2',
      companyLogos: [
        '/logos/acme.svg',
        '/logos/techcorp.svg',
        '/logos/startup.svg',
        '/logos/enterprise.svg',
      ],
    },
  } as Partial<HeroSectionProps>,

  features: {
    title: '7 Specialized AI Agents',
    subtitle:
      'Each agent is purpose-built and works together through our intelligent orchestrator.',
    badge: '🤖 AI Capabilities',
    agents: [
      {
        id: 'email-agent',
        title: 'Email Agent',
        description: 'Smart email management with AI-powered replies, labeling, and prioritization.',
        icon: <Mail className="w-5 h-5" />,
        category: 'communication',
        color: '#3B82F6',
        gradient: 'from-blue-500 to-blue-600',
        subFeatures: [
          'Gmail & Outlook integration',
          'AI-powered smart replies',
          'Automatic email classification',
          'Bulk email processing',
        ],
        metrics: [
          { label: 'Response Time', value: '2.3s', trend: 'down' },
          { label: 'Accuracy', value: '98%', trend: 'up' },
        ],
      },
      {
        id: 'calendar-agent',
        title: 'Calendar Agent',
        description: 'Intelligent scheduling with meeting coordination and availability management.',
        icon: <Calendar className="w-5 h-5" />,
        category: 'productivity',
        color: '#F97316',
        gradient: 'from-orange-500 to-orange-600',
        subFeatures: [
          'Smart meeting scheduling',
          'Multi-calendar support',
          'Automated reminders',
          'Availability detection',
        ],
      },
      {
        id: 'content-agent',
        title: 'Content Agent',
        description: 'Generate text, images, and videos using state-of-the-art AI models.',
        icon: <Sparkles className="w-5 h-5" />,
        category: 'ai',
        color: '#7C3AED',
        gradient: 'from-purple-500 to-purple-600',
        premium: true,
        subFeatures: [
          'GPT-4 & Claude text generation',
          'DALL-E image creation',
          'Video generation (Enterprise)',
          'Content editing & refinement',
        ],
      },
      {
        id: 'web-agent',
        title: 'Web Agent',
        description: 'Web search, research, and data extraction with AI-powered analysis.',
        icon: <Search className="w-5 h-5" />,
        category: 'ai',
        color: '#06B6D4',
        gradient: 'from-cyan-500 to-cyan-600',
        subFeatures: [
          'Real-time web search',
          'Perplexity AI research',
          'Weather & news data',
          'Data extraction',
        ],
      },
      {
        id: 'social-agent',
        title: 'Social Agent',
        description: 'Schedule and post to LinkedIn, Instagram, Facebook, and X (Twitter).',
        icon: <Share2 className="w-5 h-5" />,
        category: 'communication',
        color: '#EC4899',
        gradient: 'from-pink-500 to-pink-600',
        subFeatures: [
          'Multi-platform posting',
          'Post scheduling',
          'Analytics tracking',
          'Content optimization',
        ],
      },
      {
        id: 'task-agent',
        title: 'Task Agent',
        description: 'Manage tasks across Google Tasks, Asana, Monday.com, and more.',
        icon: <CheckSquare className="w-5 h-5" />,
        category: 'productivity',
        color: '#6366F1',
        gradient: 'from-indigo-500 to-indigo-600',
        subFeatures: [
          'Multi-provider sync',
          'Batch task creation',
          'Due date tracking',
          'Priority management',
        ],
      },
      {
        id: 'drive-agent',
        title: 'Drive Agent',
        description: 'File management, search, sharing, and organization across cloud storage.',
        icon: <FileText className="w-5 h-5" />,
        category: 'integration',
        color: '#10B981',
        gradient: 'from-emerald-500 to-emerald-600',
        subFeatures: [
          'Google Drive integration',
          'File upload & download',
          'Folder management',
          'Sharing & permissions',
        ],
      },
      {
        id: 'orchestrator',
        title: 'Orchestrator',
        description: 'Central AI coordinator that manages all specialized agents for complex workflows.',
        icon: <Bot className="w-5 h-5" />,
        category: 'ai',
        color: '#6B7280',
        gradient: 'from-gray-500 to-gray-600',
        highlight: true,
        subFeatures: [
          'Intent classification',
          'Task planning & routing',
          'Multi-agent coordination',
          'Memory & context management',
          'Execution reflection',
        ],
      },
    ] as FeatureItem[],
  },

  workflow: {
    title: 'See the AI Orchestrator in Action',
    subtitle: 'Watch how a single command flows through our intelligent pipeline.',
    badge: '⚡ Interactive Demo',
    steps: [
      {
        step: 1,
        title: 'Natural Language Input',
        description: 'Type your request in plain English',
        icon: <MessageSquare className="w-5 h-5" />,
        status: 'idle',
      },
      {
        step: 2,
        title: 'Intent Classification',
        description: 'AI understands what you need',
        icon: <Activity className="w-5 h-5" />,
        status: 'idle',
      },
      {
        step: 3,
        title: 'Agent Orchestration',
        description: 'Tasks routed to specialized agents',
        icon: <Workflow className="w-5 h-5" />,
        status: 'idle',
      },
      {
        step: 4,
        title: 'Parallel Execution',
        description: 'Multiple agents work simultaneously',
        icon: <Zap className="w-5 h-5" />,
        status: 'idle',
      },
      {
        step: 5,
        title: 'Quality Reflection',
        description: 'AI reviews and optimizes results',
        icon: <Sparkles className="w-5 h-5" />,
        status: 'idle',
      },
      {
        step: 6,
        title: 'Formatted Response',
        description: 'You get a polished, complete result',
        icon: <CheckSquare className="w-5 h-5" />,
        status: 'idle',
      },
    ] as WorkflowStep[],
  },

  pricing: {
    title: 'Simple, Transparent Pricing',
    subtitle: 'Start free, scale as you grow. No hidden fees.',
    badge: '💳 Plans & Pricing',
    plans: [
      {
        id: 'free',
        name: 'Free',
        tier: 'free',
        description: 'Perfect for trying out the platform',
        monthlyPrice: 0,
        yearlyPrice: 0,
        priceMonthly: 0,
        priceYearly: 0,
        features: [
          { name: '50 AI Actions / month', status: 'included' },
          { name: '100 API Calls / month', status: 'included' },
          { name: 'Email Agent', status: 'included' },
          { name: 'Calendar Agent', status: 'included' },
          { name: 'Web Agent', status: 'included' },
          { name: 'Basic Content Generation', status: 'included' },
          { name: 'Community Support', status: 'included' },
          { name: 'Drive Agent', status: 'excluded' },
          { name: 'Social Media Posting', status: 'excluded' },
          { name: 'Task Agent', status: 'excluded' },
          { name: 'Image Generation', status: 'excluded' },
          { name: 'API Access', status: 'excluded' },
        ],
        cta: 'Get Started Free',
        ctaHref: '/register',
        color: '#6B7280',
        sortOrder: 0,
        highlightedFeatureNames: [],
      },
      {
        id: 'starter',
        name: 'Starter',
        tier: 'starter',
        description: 'For individuals and small teams',
        monthlyPrice: 3900,
        yearlyPrice: 37440,
        priceMonthly: 3900,
        priceYearly: 37440,
        yearSavings: 20,
        freeTrial: true,
        trialDays: 14,
        features: [
          { name: '500 AI Actions / month', status: 'included' },
          { name: '2,000 API Calls / month', status: 'included' },
          { name: 'Everything in Free', status: 'included' },
          { name: 'Drive Agent', status: 'included' },
          { name: 'Social Media Posting', status: 'included' },
          { name: 'Task Agent', status: 'included' },
          { name: 'Priority Support', status: 'included' },
          { name: 'Image Generation', status: 'excluded' },
          { name: 'Multi-platform Posts', status: 'excluded' },
          { name: 'API Access', status: 'excluded' },
        ],
        cta: 'Start Free Trial',
        ctaHref: '/register?plan=starter',
        color: '#3B82F6',
        gradient: 'from-blue-500 to-blue-600',
        sortOrder: 1,
        highlightedFeatureNames: [],
      },
      {
        id: 'professional',
        name: 'Professional',
        tier: 'professional',
        description: 'For growing businesses',
        monthlyPrice: 12900,
        yearlyPrice: 123840,
        priceMonthly: 12900,
        priceYearly: 123840,
        yearSavings: 20,
        highlight: 'popular',
        badge: 'Most Popular',
        freeTrial: true,
        trialDays: 14,
        moneyBack: true,
        guaranteeDays: 30,
        features: [
          { name: '2,500 AI Actions / month', status: 'included' },
          { name: '15,000 API Calls / month', status: 'included' },
          { name: 'Everything in Starter', status: 'included' },
          { name: 'Image Generation', status: 'included' },
          { name: 'Multi-platform Posts', status: 'included' },
          { name: 'API Access', status: 'included' },
          { name: 'Email Support', status: 'included' },
          { name: 'Video Generation', status: 'excluded' },
          { name: 'White-label', status: 'excluded' },
          { name: 'Custom Integrations', status: 'excluded' },
        ],
        cta: 'Start Free Trial',
        ctaHref: '/register?plan=professional',
        color: '#7C3AED',
        gradient: 'from-purple-500 to-purple-600',
        sortOrder: 2,
        highlightedFeatureNames: [],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        tier: 'enterprise',
        description: 'For large organizations',
        monthlyPrice: 59900,
        yearlyPrice: 575040,
        priceMonthly: 59900,
        priceYearly: 575040,
        yearSavings: 20,
        features: [
          { name: '10,000 AI Actions / month', status: 'included' },
          { name: '50,000 API Calls / month', status: 'included' },
          { name: 'Everything in Professional', status: 'included' },
          { name: 'Video Generation', status: 'included' },
          { name: 'White-label', status: 'included' },
          { name: 'Custom Integrations', status: 'included' },
          { name: 'SLA Guarantee (99.9%)', status: 'included' },
          { name: '24/7 Phone Support', status: 'included' },
          { name: 'Dedicated Account Manager', status: 'included' },
          { name: 'On-premise Deployment', status: 'addon' },
        ],
        cta: 'Contact Sales',
        ctaHref: '/contact',
        color: '#F59E0B',
        gradient: 'from-amber-500 to-amber-600',
        contactSales: true,
        sortOrder: 3,
        highlightedFeatureNames: [],
      },
    ] as PricingPlan[],
  },

  integrations: {
    title: 'Works With Your Stack',
    subtitle: 'Seamlessly connects with 50+ platforms and services.',
    logos: [
      '/logos/google.svg',
      '/logos/microsoft.svg',
      '/logos/slack.svg',
      '/logos/stripe.svg',
      '/logos/openai.svg',
      '/logos/anthropic.svg',
      '/logos/linkedin.svg',
      '/logos/facebook.svg',
      '/logos/twitter.svg',
      '/logos/asana.svg',
      '/logos/monday.svg',
      '/logos/github.svg',
      '/logos/sendgrid.svg',
      '/logos/notion.svg',
      '/logos/zoom.svg',
    ],
  },

  testimonials: {
    title: 'Trusted by Teams Worldwide',
    subtitle: 'See how companies use AI Agent Platform to transform their workflows.',
    badge: '💬 Customer Stories',
    items: [
      {
        id: 't1',
        content:
          'AI Agent Platform has completely transformed how our team handles email and scheduling. We save 15+ hours per week.',
        author: {
          name: 'Sarah Chen',
          role: 'CTO',
          company: 'TechVentures Inc.',
          avatar: '/avatars/sarah.jpg',
        },
        rating: 5,
        featured: true,
        metrics: [
          { label: 'Hours Saved/Week', value: '15+' },
          { label: 'Response Time', value: '-60%' },
        ],
        category: 'enterprise',
      },
      {
        id: 't2',
        content:
          'The orchestrator is pure magic. One command handles my entire social media workflow — posting, scheduling, analytics.',
        author: {
          name: 'Marcus Rodriguez',
          role: 'Marketing Director',
          company: 'GrowthLab',
          avatar: '/avatars/marcus.jpg',
        },
        rating: 5,
        metrics: [
          { label: 'Platforms Managed', value: '5' },
          { label: 'Engagement Increase', value: '+45%' },
        ],
        category: 'agency',
      },
      {
        id: 't3',
        content:
          'As a solo developer, this platform gives me an entire AI team. The web agent and content agent alone save me 20+ hours a week.',
        author: {
          name: 'Aiko Tanaka',
          role: 'Full-Stack Developer',
          company: 'Freelance',
          avatar: '/avatars/aiko.jpg',
        },
        rating: 5,
        category: 'developer',
        featured: true,
      },
      {
        id: 't4',
        content:
          'We deployed the Enterprise plan for our 50-person team. The white-label feature and custom integrations made it feel like our own product.',
        author: {
          name: 'James Wilson',
          role: 'VP of Engineering',
          company: 'DataSphere',
          avatar: '/avatars/james.jpg',
        },
        rating: 5,
        metrics: [
          { label: 'Team Size', value: '50' },
          { label: 'ROI', value: '300%' },
        ],
        category: 'enterprise',
      },
      {
        id: 't5',
        content:
          'I was skeptical about AI agents, but the calendar agent alone convinced me. It scheduled 12 meetings across 4 timezones flawlessly.',
        author: {
          name: 'Emily Park',
          role: 'Executive Assistant',
          company: 'GlobalCorp',
          avatar: '/avatars/emily.jpg',
        },
        rating: 4,
        category: 'enterprise',
      },
      {
        id: 't6',
        content:
          'The task agent working with Monday.com is a game-changer. I can manage all my projects just by typing what I need.',
        author: {
          name: 'David Kim',
          role: 'Project Manager',
          company: 'BuildRight',
          avatar: '/avatars/david.jpg',
        },
        rating: 5,
        category: 'startup',
        featured: true,
      },
    ] as TestimonialItem[],
  },

  stats: {
    title: 'Platform by the Numbers',
    badge: '📊 Platform Stats',
    items: [
      { value: 10000, suffix: '+', label: 'Active Users', icon: <Users className="w-5 h-5" /> },
      { value: 2500000, suffix: '+', label: 'AI Actions Processed', icon: <Zap className="w-5 h-5" /> },
      { value: 99.9, suffix: '%', label: 'Uptime', icon: <Server className="w-5 h-5" /> },
      { value: 50, suffix: '+', label: 'Integrations', icon: <Globe className="w-5 h-5" /> },
      { value: 4.8, suffix: '/5', label: 'Rating on G2', icon: <Star className="w-5 h-5" /> },
    ] as StatItem[],
  },

  cta: {
    title: 'Ready to Transform Your Workflow?',
    subtitle:
      'Join 10,000+ users who save 15+ hours per week with AI automation. Start your free 14-day trial today.',
    primaryLabel: 'Start Free Trial',
    primaryHref: '/register',
    secondaryLabel: 'Talk to Sales',
    secondaryHref: '/contact',
    guarantee: '30-day money-back guarantee • No credit card required',
  },

  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know about AI Agent Platform.',
    badge: '❓ FAQ',
    items: [
      {
        id: 'faq-1',
        question: 'What is the AI Agent Platform?',
        answer:
          'AI Agent Platform is an enterprise SaaS application that orchestrates 7 specialized AI agents — Email, Drive, Content, Social, Calendar, Web, and Task — through a central orchestrator. It lets you automate workflows using natural language, integrating with 50+ services like Gmail, Google Drive, LinkedIn, and more.',
        category: 'general',
        popular: true,
      },
      {
        id: 'faq-2',
        question: 'How does the orchestrator work?',
        answer:
          'The orchestrator is the brains of the platform. It classifies your intent, creates an execution plan, delegates tasks to specialized agents in parallel or sequence, reflects on results for quality, and returns a polished response. It also learns from your preferences over time.',
        category: 'technical',
        featured: true,
      },
      {
        id: 'faq-3',
        question: 'What are "AI Actions" and "API Calls"?',
        answer:
          'AI Actions are tasks that use artificial intelligence, like generating text, analyzing sentiment, or creating images. API Calls are integrations with external services, like fetching emails from Gmail or posting to LinkedIn. Each plan has monthly limits for both, with affordable overage pricing.',
        category: 'billing',
      },
      {
        id: 'faq-4',
        question: 'Can I cancel my subscription anytime?',
        answer:
          'Absolutely. You can cancel your subscription at any time from your billing settings. If you cancel, you will retain access to your paid plan until the end of your billing period. There are no cancellation fees or long-term contracts.',
        category: 'billing',
        popular: true,
      },
      {
        id: 'faq-5',
        question: 'How secure is my data?',
        answer:
          'Security is our top priority. We use AES-256-GCM encryption for all data at rest and TLS 1.3 for data in transit. We are SOC 2 Type II certified, GDPR compliant, and offer SSO/SAML for Enterprise plans. All API keys and OAuth tokens are encrypted with per-user keys.',
        category: 'security',
        featured: true,
      },
      {
        id: 'faq-6',
        question: 'Do you offer a free trial?',
        answer:
          'Yes! All paid plans come with a 14-day free trial. No credit card is required to start. You can explore all features of your chosen plan during the trial period.',
        category: 'billing',
      },
      {
        id: 'faq-7',
        question: 'Can I integrate with my existing tools?',
        answer:
          'Yes! We support 50+ integrations including Google Workspace (Gmail, Drive, Calendar, Tasks), Microsoft 365, LinkedIn, Facebook, Instagram, X (Twitter), Asana, Monday.com, Slack, GitHub, Stripe, and many more. Enterprise plans can request custom integrations.',
        category: 'integrations',
        relatedIds: ['faq-9'],
      },
      {
        id: 'faq-8',
        question: 'What happens if I exceed my plan limits?',
        answer:
          'If you exceed your plan limits, you will be charged overage fees at the rates specified in your plan. We will notify you when you reach 80% and 95% of your limits so you can upgrade or adjust usage before incurring overage charges.',
        category: 'billing',
      },
      {
        id: 'faq-9',
        question: 'Do you offer a white-label solution?',
        answer:
          'Yes, the Enterprise plan includes white-label capabilities. You can customize the platform with your own branding, logo, colors, and domain. For on-premise deployment, contact our sales team.',
        category: 'features',
        relatedIds: ['faq-7'],
      },
      {
        id: 'faq-10',
        question: 'What support do you offer?',
        answer:
          'Free plan users get access to our community forum and knowledge base. Starter plan users get priority email support. Professional plan users get email support with 4-hour response time. Enterprise plan users get 24/7 phone support and a dedicated account manager.',
        category: 'general',
      },
    ] as FAQItem[],
  },

  footer: {
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'Integrations', href: '#integrations' },
          { label: 'Changelog', href: '/changelog' },
          { label: 'Roadmap', href: '/roadmap' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Documentation', href: '/docs' },
          { label: 'API Reference', href: '/api' },
          { label: 'Blog', href: '/blog' },
          { label: 'Community', href: '/community' },
          { label: 'Tutorials', href: '/tutorials' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Careers', href: '/careers' },
          { label: 'Contact', href: '/contact' },
          { label: 'Partners', href: '/partners' },
          { label: 'Press', href: '/press' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' },
          { label: 'Security', href: '/security' },
          { label: 'GDPR', href: '/gdpr' },
          { label: 'Cookie Policy', href: '/cookies' },
        ],
      },
    ] as FooterColumn[],
    social: [
      { platform: 'twitter', href: '#', icon: null },
      { platform: 'linkedin', href: '#', icon: null },
      { platform: 'github', href: '#', icon: null },
      { platform: 'discord', href: '#', icon: null },
    ] as SocialLink[],
    copyright: `© ${new Date().getFullYear()} AI Agent Platform. All rights reserved.`,
    newsletter: {
      heading: 'Stay Updated',
      placeholder: 'Enter your email',
      buttonLabel: 'Subscribe',
      onSubmit: (email: string) => {
        console.log('Newsletter signup:', email);
      },
    },
  },
};

// ============================================
// 2. MAIN COMPONENT
// ============================================

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const {
    isPageLoaded,
    activeSection,
    scrollToSection,
  } = useLandingPage();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Handle CTA click with authentication check
  const handleCtaClick = useCallback(
    (plan: any, interval: any) => {
      if (isAuthenticated) {
        navigate(`/billing?plan=${plan.id}&interval=${interval}`);
      } else {
        navigate(`/register?plan=${plan.id}&interval=${interval}`);
      }
    },
    [isAuthenticated, navigate]
  );

  // Handle feature click
  const handleFeatureClick = useCallback(
    (feature: FeatureItem) => {
      // Scroll to the relevant section or open modal
      const agentSection = document.getElementById(`agent-${feature.id}`);
      if (agentSection) {
        agentSection.scrollIntoView({ behavior: 'smooth' });
      }
    },
    []
  );

  // Memoize feature categories to prevent unnecessary re-renders
  const featureCategories = useMemo(
    () => ['ai', 'communication', 'productivity', 'integration'] as const,
    []
  );

  // ============================================
  // 3. RENDER
  // ============================================

  return (
    <div className="relative bg-[#0B0F1A] text-white overflow-x-hidden">
      {/* ========================================== */}
      {/* GLOBAL BACKGROUND EFFECTS */}
      {/* ========================================== */}

      <ParticleBackground
        theme="default"
        config={{
          count: 40,
          interaction: 'repel',
          speed: 0.3,
          opacity: 0.4,
        }}
        className="fixed inset-0 pointer-events-none z-0"
      />

      <GridPattern
        type="dots"
        opacity="subtle"
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* ========================================== */}
      {/* NAVIGATION */}
      {/* ========================================== */}

      <Navbar
        links={LANDING_CONFIG.navigation.links}
        ctas={LANDING_CONFIG.navigation.ctas}
        logo={LANDING_CONFIG.navigation.logo}
        activeSection={activeSection}
        transparentAtTop
      />

      {/* ========================================== */}
      {/* SECTION 1: HERO */}
      {/* ========================================== */}

      <SectionWrapper background="none" className="pt-24 md:pt-32">
        <HeroSection
          {...LANDING_CONFIG.hero}
          variant="default"
          size="lg"
          background="particles"
          showOrbs
          showParticles={false}
          showScrollIndicator
          animation="fade-up"
          animationDuration={800}
          graphic={
            <div className="relative w-full max-w-lg mx-auto">
              {/* Agent cards floating illustration */}
              <div className="grid grid-cols-2 gap-3 opacity-80">
                {LANDING_CONFIG.features.agents.slice(0, 4).map((agent, i) => (
                  <div
                    key={agent.id}
                    className={`
                      bg-[#111827] border border-[#1F2937] rounded-xl p-3
                      ${i === 0 ? '-rotate-2' : i === 1 ? 'rotate-1' : i === 2 ? '-rotate-1' : 'rotate-2'}
                      hover:border-purple-500/50 transition-all duration-300
                      animate-float
                    `}
                    style={{
                      animationDelay: `${i * 0.3}s`,
                      animationDuration: `${4 + i * 0.5}s`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)` }}
                      >
                        {agent.icon}
                      </div>
                      <span className="text-sm font-medium text-white">{agent.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
          graphicPosition="right"
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 2: FEATURES SHOWCASE */}
      {/* ========================================== */}

      <SectionWrapper background="surface" className="py-16 md:py-24">
        <FeaturesShowcase
          features={LANDING_CONFIG.features.agents}
          variant="card"
          size="md"
          layout="grid"
          columns={4}
          gap="md"
          animation="fade"
          animateOnView
          stagger
          staggerDelay={100}
          showFilter
          showCategories
          showSubFeatures
          showCTA={false}
          title={LANDING_CONFIG.features.title}
          subtitle={LANDING_CONFIG.features.subtitle}
          badge={LANDING_CONFIG.features.badge}
          onFeatureClick={handleFeatureClick}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 3: WORKFLOW DEMO */}
      {/* ========================================== */}

      <SectionWrapper background="default" className="py-16 md:py-24">
        <WorkflowDemo
          steps={LANDING_CONFIG.workflow.steps}
          variant="card"
          size="md"
          layout="horizontal"
          animation="slide"
          animateOnView
          stagger
          staggerDelay={150}
          showStepNumbers
          showDescriptions
          autoPlay
          autoPlayInterval={2500}
          title={LANDING_CONFIG.workflow.title}
          subtitle={LANDING_CONFIG.workflow.subtitle}
          badge={LANDING_CONFIG.workflow.badge}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 4: INTEGRATIONS MARQUEE */}
      {/* ========================================== */}

      <SectionWrapper background="elevated" className="py-16 md:py-24">
        <IntegrationsMarquee
          title={LANDING_CONFIG.integrations.title}
          subtitle={LANDING_CONFIG.integrations.subtitle}
          speed="slow"
          pauseOnHover
          fadeEdges
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 5: PRICING */}
      {/* ========================================== */}

      <SectionWrapper background="default" className="py-16 md:py-24">
        <PricingComparison
          plans={LANDING_CONFIG.pricing.plans as any}
          variant="card"
          size="md"
          layout="grid"
          defaultInterval="monthly"
          showBillingToggle
          showFeatureDescriptions
          showFeatureTooltips
          showFeatureIcons
          showLimits
          showTrialInfo
          showGuarantee
          showSavings
          showComparisonTable
          title={LANDING_CONFIG.pricing.title}
          subtitle={LANDING_CONFIG.pricing.subtitle}
          badge={LANDING_CONFIG.pricing.badge}
          onCtaClick={handleCtaClick as any}
          showEnterpriseContact
          enterpriseCTA={{
            label: 'Contact Sales',
            href: '/contact',
          }}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 6: TESTIMONIALS */}
      {/* ========================================== */}

      <SectionWrapper background="surface" className="py-16 md:py-24">
        <TestimonialsGrid
          testimonials={LANDING_CONFIG.testimonials.items}
          variant="card"
          size="md"
          layout="grid"
          columns={3}
          gap="md"
          animation="fade"
          animateOnView
          stagger
          staggerDelay={100}
          showRatings
          showAuthor
          showCompanyLogo={false}
          showVerified
          showMetrics
          showCaseStudy={false}
          showQuoteIcon
          title={LANDING_CONFIG.testimonials.title}
          subtitle={LANDING_CONFIG.testimonials.subtitle}
          badge={LANDING_CONFIG.testimonials.badge}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 7: STATS COUNTER */}
      {/* ========================================== */}

      <SectionWrapper background="elevated" className="py-12 md:py-20">
        <StatsCounter
          items={LANDING_CONFIG.stats.items}
          variant="minimal"
          size="lg"
          animateOnView
          animationDuration={2000}
          showIcons
          showLabels
          title={LANDING_CONFIG.stats.title}
          badge={LANDING_CONFIG.stats.badge}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 8: CTA BANNER */}
      {/* ========================================== */}

      <SectionWrapper background="none" className="py-16 md:py-24">
        <CTABanner
          title={LANDING_CONFIG.cta.title}
          subtitle={LANDING_CONFIG.cta.subtitle}
          size="lg"
          background="glow"
          layout="card"
          primaryCTA={{
            label: LANDING_CONFIG.cta.primaryLabel,
            href: LANDING_CONFIG.cta.primaryHref,
            variant: 'premium',
            showArrow: true,
            glow: true,
          }}
          secondaryCTA={{
            label: LANDING_CONFIG.cta.secondaryLabel,
            href: LANDING_CONFIG.cta.secondaryHref,
            variant: 'outline',
          }}
          socialProof={{
            rating: 4.8,
            trustBadges: [
              {
                icon: <Shield className="w-3.5 h-3.5" />,
                label: 'SOC 2 Certified',
              },
              {
                icon: <Lock className="w-3.5 h-3.5" />,
                label: 'GDPR Compliant',
              },
              {
                icon: <Cloud className="w-3.5 h-3.5" />,
                label: '99.9% SLA',
              },
            ],
          }}
          decorative
          floatingOrbs
          noiseTexture
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* SECTION 9: FAQ */}
      {/* ========================================== */}

      <SectionWrapper background="default" className="py-16 md:py-24">
        <FAQAccordion
          items={LANDING_CONFIG.faq.items}
          variant="separated"
          size="md"
          layout="double"
          animation="slide"
          singleExpand
          showSearch
          showCategories
          showFeatured
          showNew={false}
          showPopular
          showRelated
          maxRelated={3}
          expandIconType="plus"
          title={LANDING_CONFIG.faq.title}
          subtitle={LANDING_CONFIG.faq.subtitle}
          badge={LANDING_CONFIG.faq.badge}
        />
      </SectionWrapper>

      {/* ========================================== */}
      {/* FOOTER */}
      {/* ========================================== */}

      <Footer
        columns={LANDING_CONFIG.footer.columns}
        social={LANDING_CONFIG.footer.social}
        copyright={LANDING_CONFIG.footer.copyright}
        newsletter={{
          heading: LANDING_CONFIG.footer.newsletter.heading,
          placeholder: LANDING_CONFIG.footer.newsletter.placeholder,
          buttonLabel: LANDING_CONFIG.footer.newsletter.buttonLabel,
          onSubmit: LANDING_CONFIG.footer.newsletter.onSubmit,
        }}
        logo={{
          src: '/logo-white.svg',
          alt: 'AI Agent Platform',
          width: 180,
          height: 40,
        }}
      />

      {/* ========================================== */}
      {/* SCROLL TO TOP BUTTON */}
      {/* ========================================== */}

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`
          fixed bottom-6 right-6 z-50
          w-12 h-12 rounded-xl
          bg-gradient-to-r from-blue-500 to-purple-600
          text-white
          shadow-lg shadow-purple-500/25
          hover:scale-110 active:scale-95
          transition-all duration-200
          flex items-center justify-center
          opacity-0 translate-y-4
          ${isPageLoaded ? 'opacity-100 translate-y-0' : ''}
        `}
        aria-label="Scroll to top"
      >
        <ChevronRight className="w-5 h-5 -rotate-90" />
      </button>

      {/* ========================================== */}
      {/* CUSTOM ANIMATIONS / STYLES */}
      {/* ========================================== */}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(124, 58, 237, 0.6);
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-pulse-glow,
          .animate-gradient-shift,
          .animate-shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================
// 4. DISPLAY NAME
// ============================================

LandingPage.displayName = 'LandingPage';

// ============================================
// 5. DEFAULT EXPORT
// ============================================

export default LandingPage;
