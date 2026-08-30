// enterprise-ai-agent-platform/apps/api/src/agents/content/content.types.ts

/**
 * Content Type Enum
 */
export enum ContentGenerationType {
  TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    CODE = 'code',
}

/**
 * Content Model Provider
 */
export enum ModelProvider {
  OPENAI = 'openai',
    ANTHROPIC = 'anthropic',
    GOOGLE = 'google',
    STABILITY = 'stability',
    RUNWAY = 'runway',
}

/**
 * Content Generation Request
 */
export interface ContentGenerationRequest {
  type: ContentGenerationType;
  prompt: string;
  negativePrompt ? : string;
  model ? : string;
  provider ? : ModelProvider;
  parameters ? : ContentParameters;
  style ? : string;
  quality ? : 'draft' | 'standard' | 'premium';
}

/**
 * Content Parameters
 */
export interface ContentParameters {
  temperature ? : number;
  maxTokens ? : number;
  topP ? : number;
  frequencyPenalty ? : number;
  presencePenalty ? : number;
  aspectRatio ? : '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution ? : '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  duration ? : number; // For video (seconds)
  numImages ? : number; // Number of images to generate
  batchSize ? : number;
}

/**
 * Content Generation Result
 */
export interface ContentGenerationResult {
  id: string;
  type: ContentGenerationType;
  content: string | Buffer | string[];
  metadata: {
    model: string;
    provider: ModelProvider;
    tokensUsed ? : number;
    costUsd: number;
    generationTimeMs: number;
    prompt: string;
    negativePrompt ? : string;
  };
  createdAt: Date;
}

/**
 * Text Generation Options
 */
export interface TextGenerationOptions {
  prompt: string;
  systemPrompt ? : string;
  temperature ? : number;
  maxTokens ? : number;
  topP ? : number;
  frequencyPenalty ? : number;
  presencePenalty ? : number;
  stopSequences ? : string[];
  /** Preferred AI provider to try first (falls back through the chain if unavailable) */
  model ? : string;
}

/**
 * Image Generation Options
 */
export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt ? : string;
  model ? : 'dall-e-3' | 'dall-e-2' | 'stable-diffusion-xl' | 'stable-diffusion-3';
  size ? : '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality ? : 'standard' | 'hd';
  style ? : 'vivid' | 'natural';
  numImages ? : number;
}

/**
 * Video Generation Options
 */
export interface VideoGenerationOptions {
  prompt: string;
  duration ? : number; // seconds
  fps ? : number;
  resolution ? : '720p' | '1080p' | '4k';
  style ? : string;
  initImageUrl ? : string;
  negativePrompt ? : string;
}

/**
 * Content Edit Request
 */
export interface ContentEditRequest {
  originalContent: string | Buffer;
  editPrompt: string;
  type: ContentGenerationType;
  parameters ? : ContentParameters;
}

/**
 * Content Resize Request
 */
export interface ContentResizeRequest {
  content: string | Buffer;
  platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'tiktok';
  type: ContentGenerationType;
}

/**
 * Platform Dimensions
 */
export interface PlatformDimensions {
  platform: string;
  width: number;
  height: number;
  aspectRatio: string;
  crop: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Content Analysis Result
 */
export interface ContentAnalysisResult {
  contentType: ContentGenerationType;
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  readabilityScore ? : number;
  toxicityScore ? : number;
  suggestedImprovements ? : string[];
}

/**
 * Batch Generation Request
 */
export interface BatchGenerationRequest {
  requests: ContentGenerationRequest[];
  parallel ? : boolean;
  maxConcurrent ? : number;
}

/**
 * Batch Generation Result
 */
export interface BatchGenerationResult {
  results: ContentGenerationResult[];
  totalTimeMs: number;
  totalCostUsd: number;
  succeeded: number;
  failed: number;
  errors: Array < { index: number;error: string } > ;
}

/**
 * Content Template
 */
export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentGenerationType;
  template: string;
  variables: string[];
  description ? : string;
  category ? : string;
}

/**
 * AI Model Info
 */
export interface AIModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  type: ContentGenerationType;
  maxTokens ? : number;
  costPer1kTokens ? : number;
  costPerImage ? : number;
  costPerSecond ? : number;
  isAvailable: boolean;
}

/**
 * OpenAI API Response Types
 */
export interface OpenAIImageResponse {
  created: number;
  data: Array < {
    url: string;
    b64_json ? : string;
    revised_prompt ? : string;
  } > ;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array < {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  } > ;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Stability AI Response Types
 */
export interface StabilityImageResponse {
  artifacts: Array < {
    base64: string;
    seed: number;
    finishReason: string;
  } > ;
}

/**
 * Content Agent Configuration
 */
export interface ContentAgentConfig {
  defaultTextModel: string;
  defaultImageModel: string;
  defaultVideoModel: string;
  maxTextTokens: number;
  maxImageSize: number;
  maxVideoDuration: number;
  enableModeration: boolean;
  enableWatermark: boolean;
}