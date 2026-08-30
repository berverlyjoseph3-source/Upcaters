// apps/frontend/src/services/content.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'code';
export type ModelProvider = 'openai' | 'anthropic' | 'google';
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';
export type VideoDuration = 4 | 8 | 12;
export type VideoResolution = '720p' | '1080p';
export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'humorous' | 'persuasive' | 'academic' | 'creative';
export type ContentFormat = 'article' | 'email' | 'social_post' | 'blog' | 'report' | 'code' | 'story' | 'poem' | 'summary' | 'translation' | 'outline' | 'bullet_points' | 'dialogue' | 'script';

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  provider?: ModelProvider;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  format?: ContentFormat;
  tone?: ToneType;
  audience?: string;
  wordCount?: number;
  language?: string;
  includeCitations?: boolean;
  stream?: boolean;
  seed?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  model?: 'dall-e-3' | 'dall-e-2' | 'stable-diffusion-xl' | 'stable-diffusion-3';
  provider?: ModelProvider;
  numImages?: number;
  seed?: number;
  responseFormat?: 'url' | 'b64_json';
}

export interface VideoGenerationOptions {
  prompt: string;
  duration?: VideoDuration;
  resolution?: VideoResolution;
  fps?: number;
  style?: string;
  negativePrompt?: string;
  initImageUrl?: string;
  motionStrength?: number;
  seed?: number;
}

export interface AudioGenerationOptions {
  prompt: string;
  duration?: number;
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'ogg';
  quality?: 'standard' | 'high';
}

export interface CodeGenerationOptions {
  prompt: string;
  language?: string;
  framework?: string;
  includeComments?: boolean;
  includeTests?: boolean;
  includeDocumentation?: boolean;
  style?: 'object_oriented' | 'functional' | 'procedural';
  temperature?: number;
  maxTokens?: number;
}

export interface ContentGenerationResult {
  id: string;
  type: ContentType;
  content: string | string[];
  metadata: {
    model: string;
    provider: ModelProvider;
    tokensUsed?: number;
    costUsd: number;
    generationTimeMs: number;
    prompt: string;
    negativePrompt?: string;
    parameters?: Record<string, any>;
  };
  createdAt: Date;
  revisedPrompt?: string;
}

export interface ContentEditOptions {
  originalContent: string;
  editPrompt: string;
  type: ContentType;
  preserveFormat?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ContentAnalysisResult {
  contentType: ContentType;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentConfidence?: number;
  topics: string[];
  keywords: string[];
  readabilityScore?: number;
  readabilityLevel?: string;
  toxicityScore?: number;
  suggestedImprovements?: string[];
  grammarIssues?: Array<{
    text: string;
    suggestion: string;
    severity: 'low' | 'medium' | 'high';
    type: string;
    position: { start: number; end: number };
  }>;
  style?: {
    formality: number;
    complexity: number;
    engagement: number;
    suggestions: string[];
  };
  entities?: Array<{
    name: string;
    type: string;
    mentions: number;
  }>;
  summary?: string;
  wordCount: number;
  characterCount: number;
  estimatedReadingTimeMinutes: number;
}

export interface ContentTranslationOptions {
  content: string;
  sourceLanguage?: string;
  targetLanguage: string;
  preserveFormat?: boolean;
  formality?: 'formal' | 'informal';
  glossary?: Record<string, string>;
}

export interface ContentSummarizationOptions {
  content: string;
  maxLength?: number;
  format?: 'paragraph' | 'bullet_points' | 'key_points';
  preserveKeyFacts?: boolean;
  includeQuotes?: boolean;
}

export interface BatchGenerationRequest {
  requests: Array<{
    type: ContentType;
    options: TextGenerationOptions | ImageGenerationOptions | VideoGenerationOptions | CodeGenerationOptions;
  }>;
  parallel?: boolean;
  maxConcurrent?: number;
}

export interface BatchGenerationResult {
  results: ContentGenerationResult[];
  totalTimeMs: number;
  totalCostUsd: number;
  succeeded: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  type: ContentType;
  template: string;
  variables: string[];
  category: string;
  tags: string[];
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  type: ContentType[];
  maxTokens: number;
  costPer1kTokens: number;
  costPerImage?: number;
  costPerSecond?: number;
  isAvailable: boolean;
  capabilities: string[];
}

// ============================================
// Content Service
// ============================================

class ContentService {
  // ============================================
  // Text Generation
  // ============================================

  static async generateText(options: TextGenerationOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/text',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to generate text');
  }

  static async generateTextStream(
    options: TextGenerationOptions,
    onChunk: (chunk: string) => void
  ): Promise<ContentGenerationResult> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/api/agent/content/text/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...options, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalResult: ContentGenerationResult | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.content) {
              fullContent += parsed.content;
              onChunk(parsed.content);
            }

            if (parsed.type === 'complete') {
              finalResult = parsed.result;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    }

    if (finalResult) {
      return ContentService.transformResult(finalResult);
    }

    throw new Error('Stream ended without completion');
  }

  // ============================================
  // Image Generation
  // ============================================

  static async generateImage(options: ImageGenerationOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/image',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to generate image');
  }

  static async generateImages(
    prompts: string[],
    options?: Omit<ImageGenerationOptions, 'prompt'>
  ): Promise<ContentGenerationResult[]> {
    const response = await apiClient.post<{ results: ContentGenerationResult[] }>(
      '/api/agent/content/image/batch',
      { prompts, options }
    );

    if (response.success && response.data) {
      return response.data.results.map(ContentService.transformResult);
    }

    throw new Error(response.error || 'Failed to generate images');
  }

  // ============================================
  // Video Generation
  // ============================================

  static async generateVideo(options: VideoGenerationOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/video',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to generate video');
  }

  static async checkVideoStatus(generationId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    result?: ContentGenerationResult;
    error?: string;
  }> {
    const response = await apiClient.get<{
      status: string;
      progress: number;
      result?: ContentGenerationResult;
      error?: string;
    }>(`/api/agent/content/video/${generationId}/status`);

    if (response.success && response.data) {
      return {
        status: response.data.status as any,
        progress: response.data.progress,
        result: response.data.result ? ContentService.transformResult(response.data.result) : undefined,
        error: response.data.error,
      };
    }

    throw new Error(response.error || 'Failed to check video status');
  }

  // ============================================
  // Audio Generation
  // ============================================

  static async generateAudio(options: AudioGenerationOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/audio',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to generate audio');
  }

  // ============================================
  // Code Generation
  // ============================================

  static async generateCode(options: CodeGenerationOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/code',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to generate code');
  }

  // ============================================
  // Edit Content
  // ============================================

  static async editContent(options: ContentEditOptions): Promise<ContentGenerationResult> {
    const response = await apiClient.put<ContentGenerationResult>(
      '/api/agent/content/edit',
      options
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to edit content');
  }

  // ============================================
  // Improve Content
  // ============================================

  static async improveContent(
    content: string,
    options?: {
      aspect?: 'grammar' | 'clarity' | 'conciseness' | 'engagement' | 'tone';
      tone?: ToneType;
    }
  ): Promise<ContentGenerationResult> {
    const response = await apiClient.post<ContentGenerationResult>(
      '/api/agent/content/improve',
      { content, ...options }
    );

    if (response.success && response.data) {
      return ContentService.transformResult(response.data);
    }

    throw new Error(response.error || 'Failed to improve content');
  }

  // ============================================
  // Analyze Content
  // ============================================

  static async analyzeContent(
    content: string,
    type: ContentType = 'text'
  ): Promise<ContentAnalysisResult> {
    const response = await apiClient.post<ContentAnalysisResult>(
      '/api/agent/content/analyze',
      { content, type }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to analyze content');
  }

  // ============================================
  // Summarize Content
  // ============================================

  static async summarizeContent(options: ContentSummarizationOptions): Promise<string> {
    const response = await apiClient.post<{ summary: string }>(
      '/api/agent/content/summarize',
      options
    );

    if (response.success && response.data) {
      return response.data.summary;
    }

    throw new Error(response.error || 'Failed to summarize content');
  }

  // ============================================
  // Translate Content
  // ============================================

  static async translateContent(options: ContentTranslationOptions): Promise<{
    original: string;
    translated: string;
    sourceLanguage: string;
    targetLanguage: string;
  }> {
    const response = await apiClient.post<{
      original: string;
      translated: string;
      sourceLanguage: string;
      targetLanguage: string;
    }>('/api/agent/content/translate', options);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to translate content');
  }

  static async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
    possibleLanguages?: Array<{ language: string; confidence: number }>;
  }> {
    const response = await apiClient.post<{
      language: string;
      confidence: number;
      possibleLanguages?: Array<{ language: string; confidence: number }>;
    }>('/api/agent/content/detect-language', { text });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to detect language');
  }

  // ============================================
  // Batch Generation
  // ============================================

  static async batchGenerate(options: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const response = await apiClient.post<BatchGenerationResult>(
      '/api/agent/content/batch',
      options
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        results: response.data.results.map(ContentService.transformResult),
      };
    }

    throw new Error(response.error || 'Failed to batch generate');
  }

  // ============================================
  // Templates
  // ============================================

  static async getTemplates(category?: string): Promise<ContentTemplate[]> {
    const response = await apiClient.get<{ templates: ContentTemplate[] }>(
      '/api/agent/content/templates',
      { params: { category } }
    );

    if (response.success && response.data) {
      return response.data.templates;
    }

    throw new Error(response.error || 'Failed to get templates');
  }

  static async createTemplate(template: Omit<ContentTemplate, 'id'>): Promise<ContentTemplate> {
    const response = await apiClient.post<ContentTemplate>(
      '/api/agent/content/templates',
      template
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create template');
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/content/templates/${templateId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete template');
    }
  }

  // ============================================
  // AI Models
  // ============================================

  static async getAvailableModels(type?: ContentType): Promise<AIModelInfo[]> {
    const response = await apiClient.get<{ models: AIModelInfo[] }>(
      '/api/agent/content/models',
      { params: { type } }
    );

    if (response.success && response.data) {
      return response.data.models;
    }

    throw new Error(response.error || 'Failed to get models');
  }

  static async getModelInfo(modelId: string): Promise<AIModelInfo> {
    const response = await apiClient.get<AIModelInfo>(
      `/api/agent/content/models/${modelId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get model info');
  }

  // ============================================
  // Content History
  // ============================================

  static async getGenerationHistory(
    limit: number = 20,
    type?: ContentType
  ): Promise<ContentGenerationResult[]> {
    const response = await apiClient.get<{ history: ContentGenerationResult[] }>(
      '/api/agent/content/history',
      { params: { limit, type } }
    );

    if (response.success && response.data) {
      return response.data.history.map(ContentService.transformResult);
    }

    throw new Error(response.error || 'Failed to get history');
  }

  static async deleteFromHistory(generationId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/content/history/${generationId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete from history');
    }
  }

  static async clearHistory(): Promise<void> {
    const response = await apiClient.delete('/api/agent/content/history');

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear history');
    }
  }

  // ============================================
  // Cost Estimation
  // ============================================

  static async estimateCost(
    options: TextGenerationOptions | ImageGenerationOptions | VideoGenerationOptions
  ): Promise<{ estimatedCostUsd: number; estimatedTokens?: number; breakdown?: Record<string, number> }> {
    const response = await apiClient.post<{
      estimatedCostUsd: number;
      estimatedTokens?: number;
      breakdown?: Record<string, number>;
    }>('/api/agent/content/estimate-cost', options);

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to estimate cost');
  }

  // ============================================
  // Token Counting
  // ============================================

  static async countTokens(text: string, model?: string): Promise<number> {
    const response = await apiClient.post<{ tokenCount: number }>(
      '/api/agent/content/count-tokens',
      { text, model }
    );

    if (response.success && response.data) {
      return response.data.tokenCount;
    }

    throw new Error(response.error || 'Failed to count tokens');
  }

  // ============================================
  // Moderation
  // ============================================

  static async moderateContent(content: string): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    categoryScores: Record<string, number>;
    recommendations: string[];
  }> {
    const response = await apiClient.post<{
      flagged: boolean;
      categories: Record<string, boolean>;
      categoryScores: Record<string, number>;
      recommendations: string[];
    }>('/api/agent/content/moderate', { content });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to moderate content');
  }

  // ============================================
  // Generate Variations
  // ============================================

  static async generateVariations(
    content: string,
    count: number = 3,
    options?: { temperature?: number; preserveMeaning?: boolean }
  ): Promise<string[]> {
    const response = await apiClient.post<{ variations: string[] }>(
      '/api/agent/content/variations',
      { content, count, ...options }
    );

    if (response.success && response.data) {
      return response.data.variations;
    }

    throw new Error(response.error || 'Failed to generate variations');
  }

  // ============================================
  // Paraphrase
  // ============================================

  static async paraphrase(
    content: string,
    options?: { tone?: ToneType; strength?: number }
  ): Promise<string> {
    const response = await apiClient.post<{ paraphrased: string }>(
      '/api/agent/content/paraphrase',
      { content, ...options }
    );

    if (response.success && response.data) {
      return response.data.paraphrased;
    }

    throw new Error(response.error || 'Failed to paraphrase');
  }

  // ============================================
  // Expand Content
  // ============================================

  static async expandContent(
    content: string,
    options?: {
      targetLength?: number;
      focus?: string[];
      addExamples?: boolean;
      addDetails?: boolean;
    }
  ): Promise<string> {
    const response = await apiClient.post<{ expanded: string }>(
      '/api/agent/content/expand',
      { content, ...options }
    );

    if (response.success && response.data) {
      return response.data.expanded;
    }

    throw new Error(response.error || 'Failed to expand content');
  }

  // ============================================
  // Condense Content
  // ============================================

  static async condenseContent(
    content: string,
    targetLength: number
  ): Promise<string> {
    const response = await apiClient.post<{ condensed: string }>(
      '/api/agent/content/condense',
      { content, targetLength }
    );

    if (response.success && response.data) {
      return response.data.condensed;
    }

    throw new Error(response.error || 'Failed to condense content');
  }

  // ============================================
  // Format Conversion
  // ============================================

  static async convertFormat(
    content: string,
    fromFormat: ContentFormat,
    toFormat: ContentFormat
  ): Promise<string> {
    const response = await apiClient.post<{ converted: string }>(
      '/api/agent/content/convert-format',
      { content, fromFormat, toFormat }
    );

    if (response.success && response.data) {
      return response.data.converted;
    }

    throw new Error(response.error || 'Failed to convert format');
  }

  // ============================================
  // Extract Entities
  // ============================================

  static async extractEntities(content: string): Promise<{
    people: string[];
    organizations: string[];
    locations: string[];
    dates: string[];
    emails: string[];
    urls: string[];
    phoneNumbers: string[];
    customEntities?: Record<string, string[]>;
  }> {
    const response = await apiClient.post<{
      people: string[];
      organizations: string[];
      locations: string[];
      dates: string[];
      emails: string[];
      urls: string[];
      phoneNumbers: string[];
      customEntities?: Record<string, string[]>;
    }>('/api/agent/content/extract-entities', { content });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to extract entities');
  }

  // ============================================
  // Transform Helper
  // ============================================

  private static transformResult(result: any): ContentGenerationResult {
    return {
      id: result.id,
      type: result.type,
      content: result.content,
      metadata: {
        model: result.metadata?.model || 'unknown',
        provider: result.metadata?.provider || 'openai',
        tokensUsed: result.metadata?.tokensUsed,
        costUsd: result.metadata?.costUsd || 0,
        generationTimeMs: result.metadata?.generationTimeMs || 0,
        prompt: result.metadata?.prompt || '',
        negativePrompt: result.metadata?.negativePrompt,
        parameters: result.metadata?.parameters,
      },
      createdAt: new Date(result.createdAt || Date.now()),
      revisedPrompt: result.revisedPrompt,
    };
  }

  // ============================================
  // Utility
  // ============================================

  static estimateTokenCount(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  static estimateReadingTime(wordCount: number): number {
    // Average reading speed: 200-250 words per minute
    return Math.ceil(wordCount / 225);
  }

  static getAvailableFormats(): ContentFormat[] {
    return [
      'article', 'email', 'social_post', 'blog', 'report',
      'code', 'story', 'poem', 'summary', 'translation',
      'outline', 'bullet_points', 'dialogue', 'script',
    ];
  }

  static getAvailableTones(): ToneType[] {
    return [
      'professional', 'casual', 'friendly', 'formal',
      'humorous', 'persuasive', 'academic', 'creative',
    ];
  }

  static getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'ru', name: 'Russian' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'tr', name: 'Turkish' },
      { code: 'sv', name: 'Swedish' },
      { code: 'no', name: 'Norwegian' },
      { code: 'da', name: 'Danish' },
      { code: 'fi', name: 'Finnish' },
      { code: 'cs', name: 'Czech' },
    ];
  }
}

export default ContentService;