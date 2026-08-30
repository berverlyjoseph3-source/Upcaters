// enterprise-ai-agent-platform/apps/frontend/src/components/orchestrator/OrchestratorInput.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
  Cpu,
  Zap,
  Target,
  StopCircle,
  Paperclip,
  Image,
  FileText,
  Code,
  Mic,
  Volume2,
  Languages,
  Smile,
  History,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  MoreVertical,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2,
  Edit,
  Reply,
  Forward,
  Bookmark,
  Flag,
  Share2,
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowRight,
  X,
  Plus,
  Minus,
  Search,
  Filter,
  Settings,
  HelpCircle,
  Info,
  ExternalLink,
  Download,
  Upload,
  MessageSquare,
  Calendar,
  Globe,
  CheckSquare,
  HardDrive,
  Mail,
  Share2 as ShareIcon,
  BarChart3,
  TrendingUp,
  Activity,
  Layers,
  GitBranch,
  Shield,
  Star,
  Award,
  GripHorizontal,
  PanelLeft,
  PanelRight,
  Square,
  Play,
  Pause,
} from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Badge } from '../common/Badge';
import { Tooltip } from '../common/Tooltip';
import { LoadingSkeleton } from '../../pages/agents/shared/LoadingSkeleton';
import { ErrorBoundary } from '../../pages/agents/shared/ErrorBoundary';
import { useOrchestratorStore } from '../../../store/orchestrator.store';
import { useAuthStore } from '../../../store/auth.store';
import { format, formatDistanceToNow } from 'date-fns';

// ============================================
// Types
// ============================================

export type InputMode = 'chat' | 'command' | 'voice' | 'code' | 'plan';

export type StreamingStatus =
  | 'idle'
  | 'thinking'
  | 'intent_classifying'
  | 'planning'
  | 'executing'
  | 'reflecting'
  | 'responding'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface OrchestratorInputProps {
  onSubmit?: (input: string, options?: SubmissionOptions) => void;
  onStop?: () => void;
  onClear?: () => void;
  onModeChange?: (mode: InputMode) => void;
  onFileUpload?: (files: File[]) => void;
  onCommandSelect?: (command: string) => void;
  placeholder?: string;
  initialValue?: string;
  initialMode?: InputMode;
  maxLength?: number;
  minLength?: number;
  disabled?: boolean;
  isLoading?: boolean;
  streamingStatus?: StreamingStatus;
  error?: string | null;
  showModeSelector?: boolean;
  showFileUpload?: boolean;
  showQuickActions?: boolean;
  showCommands?: boolean;
  showHistory?: boolean;
  showCharacterCount?: boolean;
  showSubmitButton?: boolean;
  showStopButton?: boolean;
  showClearButton?: boolean;
  autoFocus?: boolean;
  autoResize?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'minimal' | 'fullscreen';
  contextLabel?: string;
  contextIcon?: React.ReactNode;
}

export interface SubmissionOptions {
  mode?: InputMode;
  attachments?: File[];
  language?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  agentType?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: string;
  category: 'communication' | 'productivity' | 'content' | 'social' | 'research' | 'management' | 'code' | 'other';
  color: string;
  command?: string;
  shortcut?: string;
}

export interface CommandSuggestion {
  id: string;
  label: string;
  description: string;
  command: string;
  icon: React.ReactNode;
  category: string;
  params?: CommandParam[];
}

export interface CommandParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'date' | 'file';
  required: boolean;
  description: string;
  options?: string[];
  defaultValue?: any;
}

export interface InputHistoryEntry {
  id: string;
  input: string;
  timestamp: Date;
  mode: InputMode;
  metadata?: Record<string, any>;
}

// ============================================
// Constants & Configuration
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'send_email',
    label: 'Send Email',
    description: 'Compose and send an email to someone',
    icon: <Mail className="h-4 w-4" />,
    action: 'email_agent',
    category: 'communication',
    color: 'bg-blue-500',
    command: '/email send to:[email] subject:[text] body:[text]',
  },
  {
    id: 'schedule_meeting',
    label: 'Schedule Meeting',
    description: 'Find best time and create calendar event',
    icon: <Calendar className="h-4 w-4" />,
    action: 'calendar_agent',
    category: 'productivity',
    color: 'bg-orange-500',
    command: '/calendar schedule title:[text] attendees:[emails] duration:[number]',
  },
  {
    id: 'search_web',
    label: 'Web Search',
    description: 'Search the web and get results',
    icon: <Globe className="h-4 w-4" />,
    action: 'web_agent',
    category: 'research',
    color: 'bg-teal-500',
    command: '/web search query:[text] count:[number]',
  },
  {
    id: 'generate_content',
    label: 'Generate Content',
    description: 'Create text, images, or code with AI',
    icon: <Sparkles className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
    command: '/content generate type:[text|image|code] prompt:[text]',
  },
  {
    id: 'create_task',
    label: 'Create Task',
    description: 'Add a new task to your task list',
    icon: <CheckSquare className="h-4 w-4" />,
    action: 'task_agent',
    category: 'management',
    color: 'bg-indigo-500',
    command: '/task create title:[text] priority:[low|medium|high]',
  },
  {
    id: 'post_social',
    label: 'Post to Social',
    description: 'Share content on social media platforms',
    icon: <ShareIcon className="h-4 w-4" />,
    action: 'social_agent',
    category: 'social',
    color: 'bg-pink-500',
    command: '/social post platform:[linkedin|twitter|facebook] content:[text]',
  },
  {
    id: 'upload_file',
    label: 'Upload File',
    description: 'Upload a file to Google Drive',
    icon: <HardDrive className="h-4 w-4" />,
    action: 'drive_agent',
    category: 'productivity',
    color: 'bg-green-500',
    command: '/drive upload file:[file] folder:[path]',
  },
  {
    id: 'analyze_data',
    label: 'Analyze Data',
    description: 'Get insights and analysis from your data',
    icon: <BarChart3 className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
    command: '/content analyze data:[text|file] format:[text|chart]',
  },
  {
    id: 'write_code',
    label: 'Write Code',
    description: 'Generate code snippets or functions',
    icon: <Code className="h-4 w-4" />,
    action: 'content_agent',
    category: 'code',
    color: 'bg-gray-700',
    command: '/code generate language:[text] description:[text]',
  },
  {
    id: 'research_topic',
    label: 'Deep Research',
    description: 'Conduct in-depth research on a topic',
    icon: <Search className="h-4 w-4" />,
    action: 'web_agent',
    category: 'research',
    color: 'bg-teal-500',
    command: '/web research topic:[text] depth:[brief|detailed|comprehensive]',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Summarize text or documents',
    icon: <FileText className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
    command: '/content summarize text:[text] length:[short|medium|long]',
  },
  {
    id: 'translate',
    label: 'Translate',
    description: 'Translate text to another language',
    icon: <Languages className="h-4 w-4" />,
    action: 'content_agent',
    category: 'content',
    color: 'bg-purple-500',
    command: '/content translate text:[text] to:[language]',
  },
];

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  {
    id: 'email_send',
    label: 'Send Email',
    description: 'Send an email to specified recipients',
    command: '/email send to: subject: body:',
    icon: <Mail className="h-4 w-4" />,
    category: 'communication',
    params: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email address(es)' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject line' },
      { name: 'body', type: 'string', required: true, description: 'Email body content' },
      { name: 'cc', type: 'string', required: false, description: 'CC recipients' },
      { name: 'bcc', type: 'string', required: false, description: 'BCC recipients' },
      { name: 'attachments', type: 'file', required: false, description: 'File attachments' },
    ],
  },
  {
    id: 'email_read',
    label: 'Read Emails',
    description: 'Read and list emails from inbox',
    command: '/email read from: count:',
    icon: <Mail className="h-4 w-4" />,
    category: 'communication',
    params: [
      { name: 'from', type: 'string', required: false, description: 'Filter by sender' },
      { name: 'count', type: 'number', required: false, description: 'Number of emails to retrieve', defaultValue: 10 },
      { name: 'unread', type: 'boolean', required: false, description: 'Show only unread emails', defaultValue: false },
    ],
  },
  {
    id: 'calendar_schedule',
    label: 'Schedule Event',
    description: 'Create a new calendar event',
    command: '/calendar schedule title: date: time: duration:',
    icon: <Calendar className="h-4 w-4" />,
    category: 'productivity',
    params: [
      { name: 'title', type: 'string', required: true, description: 'Event title' },
      { name: 'date', type: 'date', required: true, description: 'Event date' },
      { name: 'time', type: 'string', required: true, description: 'Event time' },
      { name: 'duration', type: 'number', required: false, description: 'Duration in minutes', defaultValue: 60 },
      { name: 'attendees', type: 'string', required: false, description: 'Attendee emails (comma separated)' },
      { name: 'location', type: 'string', required: false, description: 'Event location or meeting link' },
    ],
  },
  {
    id: 'calendar_availability',
    label: 'Check Availability',
    description: 'Find free time slots',
    command: '/calendar availability date: duration:',
    icon: <Calendar className="h-4 w-4" />,
    category: 'productivity',
    params: [
      { name: 'date', type: 'date', required: true, description: 'Date to check' },
      { name: 'duration', type: 'number', required: true, description: 'Meeting duration in minutes' },
      { name: 'working_hours', type: 'boolean', required: false, description: 'Only show working hours', defaultValue: true },
    ],
  },
  {
    id: 'web_search',
    label: 'Search Web',
    description: 'Perform a web search',
    command: '/web search query: count:',
    icon: <Globe className="h-4 w-4" />,
    category: 'research',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'count', type: 'number', required: false, description: 'Number of results', defaultValue: 10 },
      { name: 'freshness', type: 'select', required: false, description: 'Result freshness', options: ['any', 'day', 'week', 'month'] },
    ],
  },
  {
    id: 'web_weather',
    label: 'Get Weather',
    description: 'Get weather for a location',
    command: '/web weather location: days:',
    icon: <Cloud className="h-4 w-4" />,
    category: 'research',
    params: [
      { name: 'location', type: 'string', required: true, description: 'City name or zip code' },
      { name: 'days', type: 'number', required: false, description: 'Forecast days', defaultValue: 5 },
      { name: 'units', type: 'select', required: false, description: 'Temperature units', options: ['metric', 'imperial'] },
    ],
  },
  {
    id: 'content_text',
    label: 'Generate Text',
    description: 'Generate text content with AI',
    command: '/content text prompt: length: tone:',
    icon: <Sparkles className="h-4 w-4" />,
    category: 'content',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Content description' },
      { name: 'length', type: 'select', required: false, description: 'Content length', options: ['short', 'medium', 'long'] },
      { name: 'tone', type: 'select', required: false, description: 'Writing tone', options: ['professional', 'casual', 'friendly', 'formal', 'humorous'] },
      { name: 'temperature', type: 'number', required: false, description: 'Creativity level (0-1)', defaultValue: 0.7 },
    ],
  },
  {
    id: 'content_image',
    label: 'Generate Image',
    description: 'Generate an image with AI',
    command: '/content image prompt: size: style:',
    icon: <Image className="h-4 w-4" />,
    category: 'content',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Image description' },
      { name: 'size', type: 'select', required: false, description: 'Image size', options: ['512x512', '1024x1024', '1792x1024', '1024x1792'] },
      { name: 'style', type: 'select', required: false, description: 'Image style', options: ['vivid', 'natural'] },
      { name: 'count', type: 'number', required: false, description: 'Number of images', defaultValue: 1 },
    ],
  },
  {
    id: 'content_code',
    label: 'Generate Code',
    description: 'Generate code with AI',
    command: '/code generate language: description:',
    icon: <Code className="h-4 w-4" />,
    category: 'code',
    params: [
      { name: 'language', type: 'select', required: true, description: 'Programming language', options: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'sql', 'html', 'css'] },
      { name: 'description', type: 'string', required: true, description: 'Code description' },
      { name: 'comments', type: 'boolean', required: false, description: 'Include comments', defaultValue: true },
    ],
  },
  {
    id: 'task_create',
    label: 'Create Task',
    description: 'Create a new task',
    command: '/task create title: priority: due:',
    icon: <CheckSquare className="h-4 w-4" />,
    category: 'management',
    params: [
      { name: 'title', type: 'string', required: true, description: 'Task title' },
      { name: 'priority', type: 'select', required: false, description: 'Task priority', options: ['low', 'medium', 'high', 'urgent'] },
      { name: 'due', type: 'date', required: false, description: 'Due date' },
      { name: 'assignee', type: 'string', required: false, description: 'Assignee email' },
      { name: 'labels', type: 'string', required: false, description: 'Labels (comma separated)' },
    ],
  },
  {
    id: 'task_list',
    label: 'List Tasks',
    description: 'List and filter tasks',
    command: '/task list status: project:',
    icon: <CheckSquare className="h-4 w-4" />,
    category: 'management',
    params: [
      { name: 'status', type: 'select', required: false, description: 'Task status', options: ['pending', 'in_progress', 'completed', 'all'] },
      { name: 'project', type: 'string', required: false, description: 'Project name' },
      { name: 'count', type: 'number', required: false, description: 'Number of tasks', defaultValue: 20 },
    ],
  },
  {
    id: 'social_post',
    label: 'Post to Social',
    description: 'Create a social media post',
    command: '/social post platform: content:',
    icon: <ShareIcon className="h-4 w-4" />,
    category: 'social',
    params: [
      { name: 'platform', type: 'select', required: true, description: 'Social platform', options: ['linkedin', 'twitter', 'facebook', 'instagram'] },
      { name: 'content', type: 'string', required: true, description: 'Post content' },
      { name: 'hashtags', type: 'string', required: false, description: 'Hashtags (comma separated)' },
      { name: 'schedule', type: 'date', required: false, description: 'Schedule for later' },
    ],
  },
  {
    id: 'social_analytics',
    label: 'Social Analytics',
    description: 'Get social media analytics',
    command: '/social analytics platform: period:',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'social',
    params: [
      { name: 'platform', type: 'select', required: true, description: 'Social platform', options: ['linkedin', 'twitter', 'facebook', 'instagram', 'all'] },
      { name: 'period', type: 'select', required: false, description: 'Time period', options: ['7d', '30d', '90d', '1y'] },
    ],
  },
  {
    id: 'drive_list',
    label: 'List Files',
    description: 'List files from Google Drive',
    command: '/drive list folder: type: count:',
    icon: <HardDrive className="h-4 w-4" />,
    category: 'productivity',
    params: [
      { name: 'folder', type: 'string', required: false, description: 'Folder name or path' },
      { name: 'type', type: 'select', required: false, description: 'File type', options: ['all', 'document', 'spreadsheet', 'presentation', 'image', 'video', 'pdf'] },
      { name: 'count', type: 'number', required: false, description: 'Number of files', defaultValue: 20 },
    ],
  },
  {
    id: 'drive_upload',
    label: 'Upload File',
    description: 'Upload a file to Google Drive',
    command: '/drive upload file: folder:',
    icon: <Upload className="h-4 w-4" />,
    category: 'productivity',
    params: [
      { name: 'file', type: 'file', required: true, description: 'File to upload' },
      { name: 'folder', type: 'string', required: false, description: 'Destination folder' },
      { name: 'share', type: 'string', required: false, description: 'Share with email' },
    ],
  },
];

const STREAMING_STATUS_CONFIG: Record<StreamingStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  progress: number;
}> = {
  idle: {
    label: 'Ready',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Ready to process your request',
    progress: 0,
  },
  thinking: {
    label: 'Thinking...',
    icon: <Brain className="h-4 w-4 animate-pulse" />,
    color: 'text-purple-600',
    description: 'Analyzing your request',
    progress: 15,
  },
  intent_classifying: {
    label: 'Classifying...',
    icon: <Target className="h-4 w-4 animate-pulse" />,
    color: 'text-blue-600',
    description: 'Determining what you want to do',
    progress: 30,
  },
  planning: {
    label: 'Planning...',
    icon: <GitBranch className="h-4 w-4 animate-pulse" />,
    color: 'text-indigo-600',
    description: 'Building execution strategy',
    progress: 45,
  },
  executing: {
    label: 'Executing...',
    icon: <Activity className="h-4 w-4 animate-pulse" />,
    color: 'text-green-600',
    description: 'Running agent tasks',
    progress: 70,
  },
  reflecting: {
    label: 'Reflecting...',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    color: 'text-yellow-600',
    description: 'Analyzing results',
    progress: 85,
  },
  responding: {
    label: 'Writing...',
    icon: <Sparkles className="h-4 w-4 animate-pulse" />,
    color: 'text-pink-600',
    description: 'Composing your answer',
    progress: 95,
  },
  complete: {
    label: 'Complete',
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    description: 'Response ready',
    progress: 100,
  },
  error: {
    label: 'Error',
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600',
    description: 'An error occurred',
    progress: 0,
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Square className="h-4 w-4" />,
    color: 'text-gray-500',
    description: 'Processing cancelled',
    progress: 0,
  },
};

const INPUT_MODES: Array<{
  id: InputMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  shortcut?: string;
}> = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Natural language conversation',
    shortcut: 'Ctrl+1',
  },
  {
    id: 'command',
    label: 'Command',
    icon: <Code className="h-4 w-4" />,
    description: 'Structured commands with parameters',
    shortcut: 'Ctrl+2',
  },
  {
    id: 'code',
    label: 'Code',
    icon: <Code className="h-4 w-4" />,
    description: 'Write and execute code',
    shortcut: 'Ctrl+3',
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: <GitBranch className="h-4 w-4" />,
    description: 'Create execution plans',
    shortcut: 'Ctrl+4',
  },
];

const SIZE_CLASSES = {
  sm: {
    container: 'min-h-[48px]',
    textarea: 'text-sm py-2',
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  md: {
    container: 'min-h-[56px]',
    textarea: 'text-base py-3',
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
  lg: {
    container: 'min-h-[64px]',
    textarea: 'text-base py-4',
    button: 'h-12 w-12',
    icon: 'h-5 w-5',
  },
};

const VARIANT_CLASSES = {
  default: 'rounded-xl border shadow-sm',
  compact: 'rounded-lg border',
  minimal: 'rounded-lg border-0 bg-transparent',
  fullscreen: 'rounded-none border-0',
};

// ============================================
// Component
// ============================================

export const OrchestratorInput: React.FC<OrchestratorInputProps> = ({
  onSubmit,
  onStop,
  onClear,
  onModeChange,
  onFileUpload,
  onCommandSelect,
  placeholder = 'Message the Ultimate AI Agent...',
  initialValue = '',
  initialMode = 'chat',
  maxLength = 2000,
  minLength = 1,
  disabled = false,
  isLoading = false,
  streamingStatus = 'idle',
  error = null,
  showModeSelector = true,
  showFileUpload = true,
  showQuickActions = true,
  showCommands = true,
  showHistory = false,
  showCharacterCount = true,
  showSubmitButton = true,
  showStopButton = true,
  showClearButton = true,
  autoFocus = true,
  autoResize = true,
  className = '',
  size = 'md',
  variant = 'default',
  contextLabel,
  contextIcon,
}) => {
  // ============================================
  // State
  // ============================================

  const [input, setInput] = useState(initialValue);
  const [mode, setMode] = useState<InputMode>(initialMode);
  const [isFocused, setIsFocused] = useState(false);
  const [showQuickActionsPanel, setShowQuickActionsPanel] = useState(false);
  const [showCommandsPanel, setShowCommandsPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<CommandSuggestion[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandsPanelRef = useRef<HTMLDivElement>(null);

  // ============================================
  // Derived Data
  // ============================================

  const statusConfig = STREAMING_STATUS_CONFIG[streamingStatus] || STREAMING_STATUS_CONFIG.idle;
  const isProcessing = streamingStatus !== 'idle' && streamingStatus !== 'complete' && streamingStatus !== 'error' && streamingStatus !== 'cancelled';
  const canSubmit = input.trim().length >= minLength && !isProcessing && !disabled;
  const characterCount = input.length;
  const isOverLimit = characterCount > maxLength;
  const sizeConfig = SIZE_CLASSES[size];
  const variantClass = VARIANT_CLASSES[variant];

  // ============================================
  // Effects
  // ============================================

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Auto-resize textarea
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, autoResize]);

  // Filter commands when input changes
  useEffect(() => {
    if (mode === 'command' && input.startsWith('/')) {
      const searchTerm = input.toLowerCase();
      const filtered = COMMAND_SUGGESTIONS.filter(
        (cmd) =>
          cmd.command.toLowerCase().includes(searchTerm) ||
          cmd.label.toLowerCase().includes(searchTerm) ||
          cmd.description.toLowerCase().includes(searchTerm),
      );
      setFilteredCommands(filtered.slice(0, 8));
      setSelectedCommandIndex(-1);
    } else {
      setFilteredCommands([]);
    }
  }, [input, mode]);

  // Keyboard shortcut for modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '1') { e.preventDefault(); handleModeChange('chat'); }
      if (e.ctrlKey && e.key === '2') { e.preventDefault(); handleModeChange('command'); }
      if (e.ctrlKey && e.key === '3') { e.preventDefault(); handleModeChange('code'); }
      if (e.ctrlKey && e.key === '4') { e.preventDefault(); handleModeChange('plan'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================
  // Handlers
  // ============================================

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    const submissionInput = input.trim();
    onSubmit?.(submissionInput, {
      mode,
      attachments: attachments.length > 0 ? attachments : undefined,
      language: selectedLanguage,
      priority,
    });

    // Add to history
    setInputHistory((prev) => [
      {
        id: `hist_${Date.now()}`,
        input: submissionInput,
        timestamp: new Date(),
        mode,
      },
      ...prev.slice(0, 49), // Keep last 50 entries
    ]);

    setInput('');
    setAttachments([]);
    setShowQuickActionsPanel(false);
    setShowCommandsPanel(false);

    // Refocus textarea
    textareaRef.current?.focus();
  }, [input, canSubmit, mode, attachments, selectedLanguage, priority, onSubmit]);

  const handleStop = useCallback(() => {
    onStop?.();
  }, [onStop]);

  const handleClear = useCallback(() => {
    setInput('');
    setAttachments([]);
    onClear?.();
    textareaRef.current?.focus();
  }, [onClear]);

  const handleModeChange = useCallback(
    (newMode: InputMode) => {
      setMode(newMode);
      onModeChange?.(newMode);
      // If switching to command mode, add / prefix
      if (newMode === 'command' && !input.startsWith('/')) {
        setInput('/');
      }
      textareaRef.current?.focus();
    },
    [input, onModeChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey && mode !== 'command' && mode !== 'code') {
        e.preventDefault();
        handleSubmit();
      }

      // Submit on Enter + Ctrl/Cmd
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }

      // Tab for command autocomplete
      if (e.key === 'Tab' && mode === 'command' && filteredCommands.length > 0) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex >= 0 ? selectedCommandIndex : 0];
        if (selectedCommand) {
          setInput(selectedCommand.command + ' ');
          setFilteredCommands([]);
        }
      }

      // Arrow keys for command selection
      if (mode === 'command' && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCommandIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCommandIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Escape') {
          setFilteredCommands([]);
          setSelectedCommandIndex(-1);
        }
      }

      // Escape to close panels
      if (e.key === 'Escape') {
        if (showQuickActionsPanel) setShowQuickActionsPanel(false);
        if (showCommandsPanel) setShowCommandsPanel(false);
        if (showHistoryPanel) setShowHistoryPanel(false);
      }
    },
    [
      mode,
      handleSubmit,
      filteredCommands,
      selectedCommandIndex,
      showQuickActionsPanel,
      showCommandsPanel,
      showHistoryPanel,
    ],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files) {
        const newFiles = Array.from(files);
        setAttachments((prev) => [...prev, ...newFiles]);
        onFileUpload?.(newFiles);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onFileUpload],
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files) {
        const newFiles = Array.from(files);
        setAttachments((prev) => [...prev, ...newFiles]);
        onFileUpload?.(newFiles);
      }
    },
    [onFileUpload],
  );

  const handleQuickActionClick = useCallback(
    (action: QuickAction) => {
      if (mode === 'command') {
        setInput(action.command || '');
      } else {
        setInput(action.description || action.label);
      }
      textareaRef.current?.focus();
      setShowQuickActionsPanel(false);
      onCommandSelect?.(action.command || action.label);
    },
    [mode, onCommandSelect],
  );

  const handleHistorySelect = useCallback((entry: InputHistoryEntry) => {
    setInput(entry.input);
    setMode(entry.mode);
    setShowHistoryPanel(false);
    textareaRef.current?.focus();
  }, []);

  const handleCopyInput = useCallback(() => {
    if (input) {
      navigator.clipboard.writeText(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [input]);

  // ============================================
  // Render: Status Indicator
  // ============================================

  const renderStatusIndicator = () => {
    if (streamingStatus === 'idle' || streamingStatus === 'complete' || streamingStatus === 'error' || streamingStatus === 'cancelled') {
      return null;
    }

    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
        <div className={`flex items-center gap-2 ${statusConfig.color}`}>
          {statusConfig.icon}
          <span className="text-sm font-medium">{statusConfig.label}</span>
        </div>
        <span className="text-xs text-secondary-400">{statusConfig.description}</span>
        <div className="flex-1" />
        <div className="h-1.5 bg-secondary-200 dark:bg-secondary-600 rounded-full w-32 overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${statusConfig.progress}%` }}
          />
        </div>
        {showStopButton && (
          <Button variant="danger" size="xs" onClick={handleStop}>
            <Square className="h-3 w-3 mr-1" />
            Stop
          </Button>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Mode Selector
  // ============================================

  const renderModeSelector = () => {
    if (!showModeSelector) return null;

    return (
      <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
        {INPUT_MODES.map((m) => (
          <Tooltip key={m.id} content={`${m.description} (${m.shortcut})`}>
            <button
              onClick={() => handleModeChange(m.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all
                ${mode === m.id
                  ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600 dark:text-primary-400'
                  : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                }
              `}
            >
              {m.icon}
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>
    );
  };

  // ============================================
  // Render: Quick Actions Panel
  // ============================================

  const renderQuickActionsPanel = () => {
    if (!showQuickActionsPanel) return null;

    const categorizedActions = QUICK_ACTIONS.reduce(
      (acc, action) => {
        const category = action.category;
        if (!acc[category]) acc[category] = [];
        acc[category].push(action);
        return acc;
      },
      {} as Record<string, QuickAction[]>,
    );

    const categoryLabels: Record<string, string> = {
      communication: 'Communication',
      productivity: 'Productivity',
      content: 'Content',
      social: 'Social',
      research: 'Research',
      management: 'Management',
      code: 'Code',
      other: 'Other',
    };

    return (
      <div className="border-t border-secondary-200 dark:border-secondary-700 p-4 max-h-64 overflow-y-auto">
        {Object.entries(categorizedActions).map(([category, actions]) => (
          <div key={category} className="mb-4 last:mb-0">
            <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-2">
              {categoryLabels[category] || category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleQuickActionClick(action)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                    hover:shadow-md hover:-translate-y-0.5
                    ${action.color} text-white
                  `}
                  title={`${action.description}\nCommand: ${action.command}`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // Render: Commands Panel
  // ============================================

  const renderCommandsPanel = () => {
    if (!showCommandsPanel) return null;

    return (
      <div
        ref={commandsPanelRef}
        className="border-t border-secondary-200 dark:border-secondary-700 p-4 max-h-64 overflow-y-auto"
      >
        <h4 className="text-xs font-semibold text-secondary-500 uppercase mb-3">Available Commands</h4>
        <div className="space-y-2">
          {COMMAND_SUGGESTIONS.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                setInput(cmd.command + ' ');
                textareaRef.current?.focus();
              }}
              className="w-full text-left p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-all"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-secondary-400">{cmd.icon}</span>
                <span className="font-medium text-secondary-900 dark:text-white">{cmd.label}</span>
                <code className="ml-auto text-xs bg-secondary-100 dark:bg-secondary-700 px-2 py-0.5 rounded text-secondary-600 dark:text-secondary-400 font-mono">
                  {cmd.command}
                </code>
              </div>
              <p className="text-xs text-secondary-500">{cmd.description}</p>
              {cmd.params && cmd.params.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {cmd.params.map((param) => (
                    <span
                      key={param.name}
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        param.required
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500'
                      }`}
                    >
                      {param.name}{param.required ? '*' : ''}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // Render: History Panel
  // ============================================

  const renderHistoryPanel = () => {
    if (!showHistoryPanel) return null;

    return (
      <div className="border-t border-secondary-200 dark:border-secondary-700 max-h-64 overflow-y-auto">
        {inputHistory.length === 0 ? (
          <div className="p-6 text-center text-secondary-400">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No input history</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {inputHistory.map((entry) => (
              <button
                key={entry.id}
                onClick={() => handleHistorySelect(entry)}
                className="w-full text-left p-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-secondary-700 dark:text-secondary-300 truncate flex-1">
                    {entry.input}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-xs text-secondary-500 capitalize">
                      {entry.mode}
                    </span>
                    <span className="text-xs text-secondary-400">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // Render: Command Autocomplete Dropdown
  // ============================================

  const renderCommandAutocomplete = () => {
    if (!filteredCommands.length || (!isFocused && selectedCommandIndex < 0)) return null;

    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-xl max-h-48 overflow-y-auto z-20">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            onClick={() => {
              setInput(cmd.command + ' ');
              setFilteredCommands([]);
              textareaRef.current?.focus();
            }}
            className={`
              w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors
              ${index === selectedCommandIndex
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                : 'hover:bg-secondary-50 dark:hover:bg-secondary-700 text-secondary-700 dark:text-secondary-300'
              }
            `}
          >
            <span className="text-secondary-400">{cmd.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{cmd.label}</span>
                <code className="text-xs bg-secondary-100 dark:bg-secondary-700 px-2 py-0.5 rounded text-secondary-500 font-mono">
                  {cmd.command}
                </code>
              </div>
              <p className="text-xs text-secondary-500 truncate">{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  // ============================================
  // Render: Error Banner
  // ============================================

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
        <button className="text-red-500 hover:text-red-700">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  };

  // ============================================
  // Render: Attachments
  // ============================================

  const renderAttachments = () => {
    if (attachments.length === 0) return null;

    return (
      <div className="px-4 py-2 border-t border-secondary-200 dark:border-secondary-700 flex flex-wrap gap-2">
        {attachments.map((file, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-lg text-sm"
          >
            {file.type.startsWith('image/') ? (
              <Image className="h-4 w-4 text-blue-500" />
            ) : file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('javascript') ? (
              <Code className="h-4 w-4 text-green-500" />
            ) : (
              <FileText className="h-4 w-4 text-secondary-500" />
            )}
            <span className="max-w-[150px] truncate text-xs">{file.name}</span>
            <span className="text-xs text-secondary-400">
              {(file.size / 1024).toFixed(1)} KB
            </span>
            <button
              onClick={() => handleRemoveAttachment(index)}
              className="text-secondary-400 hover:text-red-500 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  return (
    <ErrorBoundary>
      <div
        ref={containerRef}
        className={`
          bg-white dark:bg-secondary-800
          ${variantClass}
          ${isFocused ? 'ring-2 ring-primary-500 border-primary-500' : 'border-secondary-300 dark:border-secondary-600'}
          transition-all duration-200
          ${className}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Status Indicator */}
        {renderStatusIndicator()}

        {/* Error Banner */}
        {renderError()}

        {/* Context Label */}
        {contextLabel && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-sm text-secondary-500">
            {contextIcon}
            <span>{contextLabel}</span>
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary-50/80 dark:bg-primary-900/30 border-2 border-dashed border-primary-500 rounded-xl z-10 flex items-center justify-center">
            <div className="text-center">
              <Upload className="h-8 w-8 text-primary-500 mx-auto mb-2" />
              <p className="text-primary-700 dark:text-primary-300 font-medium">
                Drop files to attach
              </p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className={`flex items-start gap-2 ${sizeConfig.container} px-4 py-2`}>
          {/* File Upload Button */}
          {showFileUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors flex-shrink-0 mt-1`}
              disabled={disabled || isProcessing}
              title="Attach files"
            >
              <Paperclip className={sizeConfig.icon} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.kt,.swift,.html,.css,.md"
          />

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                // Delay to allow click on autocomplete items
                setTimeout(() => setIsFocused(false), 200);
              }}
              placeholder={
                mode === 'command'
                  ? 'Type / for commands... (Tab to autocomplete)'
                  : mode === 'code'
                    ? 'Write code... (Ctrl+Enter to execute)'
                    : mode === 'plan'
                      ? 'Describe the plan you want to create...'
                      : placeholder
              }
              rows={1}
              className={`
                w-full resize-none bg-transparent outline-none
                text-secondary-900 dark:text-white placeholder-secondary-400
                ${sizeConfig.textarea}
              `}
              maxLength={maxLength}
              disabled={disabled || isProcessing}
              style={{ minHeight: size === 'sm' ? '32px' : size === 'md' ? '36px' : '44px' }}
            />

            {/* Character Count */}
            {showCharacterCount && (
              <div className="absolute bottom-1 right-2 flex items-center gap-1">
                <span
                  className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : characterCount > maxLength * 0.9 ? 'text-yellow-500' : 'text-secondary-400'}`}
                >
                  {characterCount}/{maxLength}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
            {/* Quick Actions Toggle */}
            {showQuickActions && !isProcessing && (
              <Tooltip content="Quick Actions">
                <button
                  onClick={() => {
                    setShowQuickActionsPanel(!showQuickActionsPanel);
                    setShowCommandsPanel(false);
                    setShowHistoryPanel(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showQuickActionsPanel
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                      : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  }`}
                  disabled={disabled}
                >
                  <Zap className={sizeConfig.icon} />
                </button>
              </Tooltip>
            )}

            {/* Commands Toggle */}
            {showCommands && !isProcessing && (
              <Tooltip content="Commands">
                <button
                  onClick={() => {
                    setShowCommandsPanel(!showCommandsPanel);
                    setShowQuickActionsPanel(false);
                    setShowHistoryPanel(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showCommandsPanel
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                      : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  }`}
                  disabled={disabled}
                >
                  <Code className={sizeConfig.icon} />
                </button>
              </Tooltip>
            )}

            {/* History Toggle */}
            {showHistory && !isProcessing && (
              <Tooltip content="History">
                <button
                  onClick={() => {
                    setShowHistoryPanel(!showHistoryPanel);
                    setShowQuickActionsPanel(false);
                    setShowCommandsPanel(false);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    showHistoryPanel
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                      : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                  }`}
                  disabled={disabled}
                >
                  <History className={sizeConfig.icon} />
                </button>
              </Tooltip>
            )}

            {/* Copy Button */}
            {input && !isProcessing && (
              <Tooltip content={isCopied ? 'Copied!' : 'Copy'}>
                <button
                  onClick={handleCopyInput}
                  className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                >
                  {isCopied ? <CheckCircle className={`${sizeConfig.icon} text-green-500`} /> : <Copy className={sizeConfig.icon} />}
                </button>
              </Tooltip>
            )}

            {/* Clear Button */}
            {showClearButton && input && !isProcessing && (
              <Tooltip content="Clear">
                <button
                  onClick={handleClear}
                  className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                  disabled={disabled}
                >
                  <X className={sizeConfig.icon} />
                </button>
              </Tooltip>
            )}

            {/* Stop Button */}
            {showStopButton && isProcessing && (
              <Button variant="danger" size={size === 'sm' ? 'xs' : 'sm'} onClick={handleStop} className="rounded-lg">
                <Square className={`${sizeConfig.icon}`} />
              </Button>
            )}

            {/* Submit Button */}
            {showSubmitButton && !isProcessing && (
              <Button
                variant="primary"
                size={size === 'sm' ? 'xs' : 'sm'}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`rounded-lg ${sizeConfig.button} flex items-center justify-center`}
              >
                {isLoading ? (
                  <Loader2 className={`${sizeConfig.icon} animate-spin`} />
                ) : mode === 'plan' ? (
                  <GitBranch className={sizeConfig.icon} />
                ) : (
                  <Send className={sizeConfig.icon} />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mode Selector */}
        {showModeSelector && (
          <div className="px-4 pb-2">
            {renderModeSelector()}
          </div>
        )}

        {/* Attachments */}
        {renderAttachments()}

        {/* Command Autocomplete Dropdown */}
        {renderCommandAutocomplete()}

        {/* Quick Actions Panel */}
        {renderQuickActionsPanel()}

        {/* Commands Panel */}
        {renderCommandsPanel()}

        {/* History Panel */}
        {renderHistoryPanel()}

        {/* Footer */}
        <div className="px-4 py-1.5 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-between text-xs text-secondary-400">
          <div className="flex items-center gap-3">
            {isProcessing ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing...
              </span>
            ) : (
              <span>Press Enter to send, Shift+Enter for new line</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs bg-transparent border-0 text-secondary-400 cursor-pointer hover:text-secondary-600"
              disabled={disabled || isProcessing}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
            </select>

            {/* Priority Indicator */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const priorities: Array<'low' | 'normal' | 'high' | 'critical'> = ['low', 'normal', 'high', 'critical'];
                  const currentIndex = priorities.indexOf(priority);
                  setPriority(priorities[(currentIndex + 1) % priorities.length]);
                }}
                className={`
                  px-1.5 py-0.5 rounded text-xs cursor-pointer transition-colors
                  ${priority === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}
                `}
                disabled={disabled || isProcessing}
                title="Click to change priority"
              >
                {priority}
              </button>
            </div>

            {/* Character Count Mobile */}
            <span className="sm:hidden">{characterCount}/{maxLength}</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};


export default OrchestratorInput;
