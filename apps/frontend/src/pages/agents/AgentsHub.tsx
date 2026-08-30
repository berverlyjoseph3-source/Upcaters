// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/AgentsHub.tsx
import React from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  HardDrive,
  Sparkles,
  Share2,
  Calendar,
  Globe,
  CheckSquare,
  Cpu,
} from 'lucide-react';
import { AgentCard } from './shared/AgentCard';

const agents = [
  {
    id: 'email',
    name: 'Email Agent',
    description: 'Smart email management with AI-powered replies, labeling, and prioritization.',
    icon: <Mail className="h-7 w-7" />,
    color: 'blue',
    gradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    path: '/agents/email',
    metrics: [
      { label: 'Processed', value: '1,234', trend: 'up' },
      { label: 'Unread', value: '23', trend: 'down' },
    ],
  },
  {
    id: 'drive',
    name: 'Drive Agent',
    description: 'File management, search, sharing, and organization across Google Drive.',
    icon: <HardDrive className="h-7 w-7" />,
    color: 'green',
    gradient: 'bg-gradient-to-br from-green-500 to-green-600',
    path: '/agents/drive',
    metrics: [
      { label: 'Files', value: '456', trend: 'up' },
      { label: 'Storage', value: '2.4GB', trend: 'up' },
    ],
  },
  {
    id: 'content',
    name: 'Content Agent',
    description: 'Generate text, images, and videos using state-of-the-art AI models.',
    icon: <Sparkles className="h-7 w-7" />,
    color: 'purple',
    gradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
    path: '/agents/content',
    metrics: [
      { label: 'Generated', value: '789', trend: 'up' },
      { label: 'Credits', value: '342', trend: 'down' },
    ],
  },
  {
    id: 'social',
    name: 'Social Agent',
    description: 'Schedule and post to LinkedIn, Instagram, Facebook, and X (Twitter).',
    icon: <Share2 className="h-7 w-7" />,
    color: 'pink',
    gradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
    path: '/agents/social',
    metrics: [
      { label: 'Scheduled', value: '12', trend: 'up' },
      { label: 'Published', value: '89', trend: 'up' },
    ],
  },
  {
    id: 'calendar',
    name: 'Calendar Agent',
    description: 'Smart scheduling, meeting management, and availability coordination.',
    icon: <Calendar className="h-7 w-7" />,
    color: 'orange',
    gradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
    path: '/agents/calendar',
    metrics: [
      { label: 'Events', value: '34', trend: 'up' },
      { label: 'Meetings', value: '12', trend: 'down' },
    ],
  },
  {
    id: 'web',
    name: 'Web Agent',
    description: 'Web search, research, weather, and data extraction with Perplexity AI.',
    icon: <Globe className="h-7 w-7" />,
    color: 'teal',
    gradient: 'bg-gradient-to-br from-teal-500 to-teal-600',
    path: '/agents/web',
    metrics: [
      { label: 'Searches', value: '567', trend: 'up' },
      { label: 'Research', value: '23', trend: 'up' },
    ],
  },
  {
    id: 'task',
    name: 'Task Agent',
    description: 'Manage tasks across Google Tasks, Asana, and Monday.com.',
    icon: <CheckSquare className="h-7 w-7" />,
    color: 'indigo',
    gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    path: '/agents/task',
    metrics: [
      { label: 'Pending', value: '18', trend: 'up' },
      { label: 'Completed', value: '142', trend: 'up' },
    ],
  },
  {
    id: 'orchestrator',
    name: 'Ultimate AI Agent',
    description: 'Central orchestrator that coordinates all agents for complex workflows.',
    icon: <Cpu className="h-7 w-7" />,
    color: 'slate',
    gradient: 'bg-gradient-to-br from-slate-500 to-slate-600',
    path: '/agents/orchestrator',
    metrics: [
      { label: 'Executions', value: '2,345', trend: 'up' },
      { label: 'Success Rate', value: '98%', trend: 'up' },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export const AgentsHub: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg mb-4">
          <Cpu className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">AI Agents</h1>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2 max-w-2xl mx-auto">
          Choose from our suite of specialized AI agents to automate your workflow
        </p>
      </div>

      {/* Agents grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {agents.map((agent) => (
          <motion.div key={agent.id} variants={itemVariants}>
            <AgentCard {...agent} />
          </motion.div>
        ))}
      </motion.div>

      {/* Footer note */}
      <div className="text-center text-xs text-secondary-400 mt-8 pt-4 border-t border-secondary-200 dark:border-secondary-700">
        Each agent requires appropriate OAuth connections. Connect accounts in Settings.
      </div>
    </div>
  );
};
export default AgentsHub;
