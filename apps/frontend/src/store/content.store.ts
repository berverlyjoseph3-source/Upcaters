// enterprise-ai-agent-platform/apps/frontend/src/store/content.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type GenerationType = 'text' | 'image' | 'video' | 'code' | 'translation' | 'summarization' | 'analysis';
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'stability' | 'runway';
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';
export type VideoResolution = '720p' | '1080p' | '4k';
export type VideoDuration = 4 | 8 | 12;
export type GenerationStatus = 'idle' | 'loading' | 'success' | 'error';

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  model?: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  model?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  numImages?: number;
}

export interface VideoGenerationOptions {
  prompt: string;
  duration?: VideoDuration;
  fps?: number;
  resolution?: VideoResolution;
  style?: string;
  initImageUrl?: string;
  negativePrompt?: string;
}

export interface CodeGenerationOptions {
  prompt: string;
  language: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  framework?: string;
  includeComments?: boolean;
  includeErrorHandling?: boolean;
  includeTests?: boolean;
}

export interface TranslationOptions {
  content: string;
  targetLanguage: string;
  sourceLanguage?: string;
  formality?: 'formal' | 'informal' | 'neutral';
}

export interface SummarizationOptions {
  content: string;
  maxLength?: number;
  format?: 'paragraph' | 'bullet_points' | 'key_points';
}

export interface ContentAnalysisResult {
  contentType: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  readabilityScore?: number;
  toxicityScore?: number;
  suggestedImprovements?: string[];
}

export interface ContentModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
  overallToxicity?: number;
  action: 'allowed' | 'blocked' | 'flagged' | 'review';
}

export interface GenerationResult {
  id: string;
  type: GenerationType;
  content: string | string[];
  metadata: {
    model: string;
    provider: ModelProvider;
    tokensUsed?: number;
    costUsd: number;
    generationTimeMs: number;
    prompt: string;
    negativePrompt?: string;
  };
  createdAt: Date;
}

export interface GenerationHistory {
  id: string;
  type: GenerationType;
  prompt: string;
  result: string;
  model: string;
  provider: ModelProvider;
  costUsd: number;
  createdAt: Date;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  type: GenerationType;
  maxTokens?: number;
  costPer1kTokens?: number;
  costPerImage?: number;
  costPerSecond?: number;
  isAvailable: boolean;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: GenerationType;
  template: string;
  variables: string[];
  description?: string;
  category?: string;
}

// ============================================
// Store State Interface
// ============================================

interface ContentState {
  // ============================================
  // Generation State
  // ============================================
  activeType: GenerationType;
  isGenerating: boolean;
  generationStatus: GenerationStatus;
  error: string | null;
  
  // ============================================
  // Text Generation
  // ============================================
  textPrompt: string;
  textSystemPrompt: string;
  textTemperature: number;
  textMaxTokens: number;
  textModel: string;
  textResult: string | null;
  textResultMetadata: {
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
    generationTimeMs: number;
  } | null;

  // ============================================
  // Image Generation
  // ============================================
  imagePrompt: string;
  imageNegativePrompt: string;
  imageSize: ImageSize;
  imageQuality: ImageQuality;
  imageStyle: ImageStyle;
  imageNumImages: number;
  imageModel: string;
  imageResults: string[] | null;
  imageResultMetadata: {
    model: string;
    provider: string;
    costUsd: number;
    generationTimeMs: number;
  } | null;

  // ============================================
  // Video Generation
  // ============================================
  videoPrompt: string;
  videoDuration: VideoDuration;
  videoResolution: VideoResolution;
  videoStyle: string;
  videoInitImageUrl: string;
  videoResult: string | null;
  videoProgress: number;

  // ============================================
  // Code Generation
  // ============================================
  codePrompt: string;
  codeLanguage: string;
  codeFramework: string;
  codeIncludeComments: boolean;
  codeIncludeErrorHandling: boolean;
  codeIncludeTests: boolean;
  codeResult: string | null;
  codeResultMetadata: {
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  } | null;

  // ============================================
  // Translation
  // ============================================
  translationContent: string;
  translationTargetLanguage: string;
  translationSourceLanguage: string;
  translationFormality: 'formal' | 'informal' | 'neutral';
  translationResult: string | null;
  translationOriginalLength: number;
  translationResultLength: number;

  // ============================================
  // Summarization
  // ============================================
  summarizationContent: string;
  summarizationMaxLength: number;
  summarizationFormat: 'paragraph' | 'bullet_points' | 'key_points';
  summarizationResult: string | null;
  summarizationOriginalLength: number;
  summarizationResultLength: number;

  // ============================================
  // Analysis
  // ============================================
  analysisContent: string;
  analysisResult: ContentAnalysisResult | null;
  moderationResult: ContentModerationResult | null;

  // ============================================
  // History & Templates
  // ============================================
  history: GenerationHistory[];
  templates: ContentTemplate[];
  availableModels: AIModelInfo[];
  isLoadingHistory: boolean;
  isLoadingModels: boolean;

  // ============================================
  // UI State
  // ============================================
  selectedTemplate: string | null;
  showingHistory: boolean;
  showingTemplates: boolean;
  copied: boolean;
  downloaded: boolean;

  // ============================================
  // Actions - Text Generation
  // ============================================
  generateText: (options?: TextGenerationOptions) => Promise<void>;
  setTextPrompt: (prompt: string) => void;
  setTextSystemPrompt: (prompt: string) => void;
  setTextTemperature: (temp: number) => void;
  setTextMaxTokens: (tokens: number) => void;
  setTextModel: (model: string) => void;
  clearTextResult: () => void;

  // ============================================
  // Actions - Image Generation
  // ============================================
  generateImage: (options?: ImageGenerationOptions) => Promise<void>;
  setImagePrompt: (prompt: string) => void;
  setImageNegativePrompt: (prompt: string) => void;
  setImageSize: (size: ImageSize) => void;
  setImageQuality: (quality: ImageQuality) => void;
  setImageStyle: (style: ImageStyle) => void;
  setImageNumImages: (count: number) => void;
  setImageModel: (model: string) => void;
  clearImageResults: () => void;

  // ============================================
  // Actions - Video Generation
  // ============================================
  generateVideo: (options?: VideoGenerationOptions) => Promise<void>;
  setVideoPrompt: (prompt: string) => void;
  setVideoDuration: (duration: VideoDuration) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  setVideoStyle: (style: string) => void;
  setVideoInitImageUrl: (url: string) => void;
  clearVideoResult: () => void;

  // ============================================
  // Actions - Code Generation
  // ============================================
  generateCode: (options?: CodeGenerationOptions) => Promise<void>;
  setCodePrompt: (prompt: string) => void;
  setCodeLanguage: (language: string) => void;
  setCodeFramework: (framework: string) => void;
  setCodeIncludeComments: (include: boolean) => void;
  setCodeIncludeErrorHandling: (include: boolean) => void;
  setCodeIncludeTests: (include: boolean) => void;
  clearCodeResult: () => void;

  // ============================================
  // Actions - Translation
  // ============================================
  translateText: (options?: TranslationOptions) => Promise<void>;
  setTranslationContent: (content: string) => void;
  setTranslationTargetLanguage: (language: string) => void;
  setTranslationSourceLanguage: (language: string) => void;
  setTranslationFormality: (formality: 'formal' | 'informal' | 'neutral') => void;
  clearTranslationResult: () => void;

  // ============================================
  // Actions - Summarization
  // ============================================
  summarizeText: (options?: SummarizationOptions) => Promise<void>;
  setSummarizationContent: (content: string) => void;
  setSummarizationMaxLength: (length: number) => void;
  setSummarizationFormat: (format: 'paragraph' | 'bullet_points' | 'key_points') => void;
  clearSummarizationResult: () => void;

  // ============================================
  // Actions - Analysis
  // ============================================
  analyzeContent: (content: string) => Promise<void>;
  moderateContent: (content: string) => Promise<void>;
  setAnalysisContent: (content: string) => void;
  clearAnalysisResult: () => void;

  // ============================================
  // Actions - UI & Utilities
  // ============================================
  setActiveType: (type: GenerationType) => void;
  copyToClipboard: (content: string) => void;
  downloadResult: (content: string, filename: string, mimeType?: string) => void;
  applyTemplate: (templateId: string) => void;
  saveToHistory: (entry: GenerationHistory) => void;
  clearHistory: () => void;
  toggleHistory: () => void;
  toggleTemplates: () => void;
  fetchTemplates: () => Promise<void>;
  fetchAvailableModels: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  clearAllResults: () => void;
  clearError: () => void;
  resetState: () => void;
}

// ============================================
// Helper Functions
// ============================================

const generateId = (): string => {
  return `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

const estimateCost = (type: GenerationType, tokensUsed: number = 0): number => {
  const rates: Record<string, number> = {
    text: 0.00001,    // $0.01 per 1K tokens
    image: 0.04,      // $0.04 per image
    video: 0.50,      // $0.50 per video
    code: 0.00003,    // $0.03 per 1K tokens
    translation: 0.000005, // $0.005 per 1K tokens
    summarization: 0.00001, // $0.01 per 1K tokens
    analysis: 0.00001, // $0.01 per 1K tokens
  };
  return tokensUsed * (rates[type] || 0.00001);
};

// ============================================
// Store Implementation
// ============================================

const initialState = {
  activeType: 'text' as GenerationType,
  isGenerating: false,
  generationStatus: 'idle' as GenerationStatus,
  error: null as string | null,

  // Text
  textPrompt: '',
  textSystemPrompt: '',
  textTemperature: 0.7,
  textMaxTokens: 1000,
  textModel: 'gpt-4',
  textResult: null as string | null,
  textResultMetadata: null as {
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
    generationTimeMs: number;
  } | null,

  // Image
  imagePrompt: '',
  imageNegativePrompt: '',
  imageSize: '1024x1024' as ImageSize,
  imageQuality: 'standard' as ImageQuality,
  imageStyle: 'vivid' as ImageStyle,
  imageNumImages: 1,
  imageModel: 'dall-e-3',
  imageResults: null as string[] | null,
  imageResultMetadata: null as {
    model: string;
    provider: string;
    costUsd: number;
    generationTimeMs: number;
  } | null,

  // Video
  videoPrompt: '',
  videoDuration: 4 as VideoDuration,
  videoResolution: '720p' as VideoResolution,
  videoStyle: '',
  videoInitImageUrl: '',
  videoResult: null as string | null,
  videoProgress: 0,

  // Code
  codePrompt: '',
  codeLanguage: 'javascript',
  codeFramework: '',
  codeIncludeComments: true,
  codeIncludeErrorHandling: true,
  codeIncludeTests: false,
  codeResult: null as string | null,
  codeResultMetadata: null as {
    model: string;
    provider: string;
    tokensUsed: number;
    costUsd: number;
  } | null,

  // Translation
  translationContent: '',
  translationTargetLanguage: 'spanish',
  translationSourceLanguage: '',
  translationFormality: 'neutral' as 'formal' | 'informal' | 'neutral',
  translationResult: null as string | null,
  translationOriginalLength: 0,
  translationResultLength: 0,

  // Summarization
  summarizationContent: '',
  summarizationMaxLength: 200,
  summarizationFormat: 'paragraph' as 'paragraph' | 'bullet_points' | 'key_points',
  summarizationResult: null as string | null,
  summarizationOriginalLength: 0,
  summarizationResultLength: 0,

  // Analysis
  analysisContent: '',
  analysisResult: null as ContentAnalysisResult | null,
  moderationResult: null as ContentModerationResult | null,

  // History & Templates
  history: [] as GenerationHistory[],
  templates: [] as ContentTemplate[],
  availableModels: [] as AIModelInfo[],
  isLoadingHistory: false,
  isLoadingModels: false,

  // UI
  selectedTemplate: null as string | null,
  showingHistory: false,
  showingTemplates: false,
  copied: false,
  downloaded: false,
};

export const useContentStore = create<ContentState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // Text Generation Actions
        // ============================================

        generateText: async (options?: TextGenerationOptions) => {
          const state = get();
          const startTime = Date.now();

          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            const prompt = options?.prompt || state.textPrompt;
            if (!prompt.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter a prompt to generate text' });
              return;
            }

            const response = await apiClient.post<{
              content: string;
              metadata: {
                model: string;
                provider: string;
                tokensUsed: number;
                costUsd: number;
                generationTimeMs: number;
              };
            }>('/api/agent/content/generate-text', {
              prompt,
              systemPrompt: options?.systemPrompt || state.textSystemPrompt,
              temperature: options?.temperature ?? state.textTemperature,
              maxTokens: options?.maxTokens ?? state.textMaxTokens,
              model: options?.model || state.textModel,
            });

            if (response.success && response.data) {
              const generationTime = Date.now() - startTime;

              set({
                isGenerating: false,
                generationStatus: 'success',
                textResult: response.data.content,
                textResultMetadata: {
                  ...response.data.metadata,
                  generationTimeMs: generationTime,
                },
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'text',
                prompt,
                result: response.data.content,
                model: response.data.metadata.model,
                provider: response.data.metadata.provider as ModelProvider,
                costUsd: response.data.metadata.costUsd,
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to generate text',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to generate text',
            });
          }
        },

        setTextPrompt: (prompt: string) => set({ textPrompt: prompt }),
        setTextSystemPrompt: (prompt: string) => set({ textSystemPrompt: prompt }),
        setTextTemperature: (temp: number) => set({ textTemperature: temp }),
        setTextMaxTokens: (tokens: number) => set({ textMaxTokens: tokens }),
        setTextModel: (model: string) => set({ textModel: model }),
        clearTextResult: () => set({ textResult: null, textResultMetadata: null }),

        // ============================================
        // Image Generation Actions
        // ============================================

        generateImage: async (options?: ImageGenerationOptions) => {
          const state = get();
          const startTime = Date.now();

          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            const prompt = options?.prompt || state.imagePrompt;
            if (!prompt.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter a prompt to generate an image' });
              return;
            }

            const response = await apiClient.post<{
              images: string[];
              metadata: {
                model: string;
                provider: string;
                costUsd: number;
                generationTimeMs: number;
              };
            }>('/api/agent/content/generate-image', {
              prompt,
              negativePrompt: options?.negativePrompt || state.imageNegativePrompt,
              size: options?.size || state.imageSize,
              quality: options?.quality || state.imageQuality,
              style: options?.style || state.imageStyle,
              numImages: options?.numImages ?? state.imageNumImages,
              model: options?.model || state.imageModel,
            });

            if (response.success && response.data) {
              const generationTime = Date.now() - startTime;

              set({
                isGenerating: false,
                generationStatus: 'success',
                imageResults: response.data.images,
                imageResultMetadata: {
                  ...response.data.metadata,
                  generationTimeMs: generationTime,
                },
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'image',
                prompt,
                result: response.data.images[0] || '',
                model: response.data.metadata.model,
                provider: response.data.metadata.provider as ModelProvider,
                costUsd: response.data.metadata.costUsd,
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to generate image',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to generate image',
            });
          }
        },

        setImagePrompt: (prompt: string) => set({ imagePrompt: prompt }),
        setImageNegativePrompt: (prompt: string) => set({ imageNegativePrompt: prompt }),
        setImageSize: (size: ImageSize) => set({ imageSize: size }),
        setImageQuality: (quality: ImageQuality) => set({ imageQuality: quality }),
        setImageStyle: (style: ImageStyle) => set({ imageStyle: style }),
        setImageNumImages: (count: number) => set({ imageNumImages: count }),
        setImageModel: (model: string) => set({ imageModel: model }),
        clearImageResults: () => set({ imageResults: null, imageResultMetadata: null }),

        // ============================================
        // Video Generation Actions
        // ============================================

        generateVideo: async (options?: VideoGenerationOptions) => {
          const state = get();
          const startTime = Date.now();

          set({ isGenerating: true, generationStatus: 'loading', error: null, videoProgress: 0 });

          try {
            const prompt = options?.prompt || state.videoPrompt;
            if (!prompt.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter a prompt to generate a video' });
              return;
            }

            // Simulate progress updates
            const progressInterval = setInterval(() => {
              set(s => ({ videoProgress: Math.min(s.videoProgress + 10, 90) }));
            }, 500);

            const response = await apiClient.post<{
              videoUrl: string;
              metadata: {
                model: string;
                provider: string;
                costUsd: number;
                generationTimeMs: number;
              };
            }>('/api/agent/content/generate-video', {
              prompt,
              duration: options?.duration || state.videoDuration,
              resolution: options?.resolution || state.videoResolution,
              style: options?.style || state.videoStyle,
              initImageUrl: options?.initImageUrl || state.videoInitImageUrl,
            });

            clearInterval(progressInterval);

            if (response.success && response.data) {
              const generationTime = Date.now() - startTime;

              set({
                isGenerating: false,
                generationStatus: 'success',
                videoResult: response.data.videoUrl,
                videoProgress: 100,
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'video',
                prompt,
                result: response.data.videoUrl,
                model: response.data.metadata.model,
                provider: response.data.metadata.provider as ModelProvider,
                costUsd: response.data.metadata.costUsd,
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to generate video',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to generate video',
            });
          }
        },

        setVideoPrompt: (prompt: string) => set({ videoPrompt: prompt }),
        setVideoDuration: (duration: VideoDuration) => set({ videoDuration: duration }),
        setVideoResolution: (resolution: VideoResolution) => set({ videoResolution: resolution }),
        setVideoStyle: (style: string) => set({ videoStyle: style }),
        setVideoInitImageUrl: (url: string) => set({ videoInitImageUrl: url }),
        clearVideoResult: () => set({ videoResult: null, videoProgress: 0 }),

        // ============================================
        // Code Generation Actions
        // ============================================

        generateCode: async (options?: CodeGenerationOptions) => {
          const state = get();
          const startTime = Date.now();

          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            const prompt = options?.prompt || state.codePrompt;
            if (!prompt.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please describe what code you want to generate' });
              return;
            }

            const response = await apiClient.post<{
              content: string;
              metadata: {
                model: string;
                provider: string;
                tokensUsed: number;
                costUsd: number;
              };
            }>('/api/agent/content/generate-code', {
              prompt,
              language: options?.language || state.codeLanguage,
              framework: options?.framework || state.codeFramework,
              includeComments: options?.includeComments ?? state.codeIncludeComments,
              includeErrorHandling: options?.includeErrorHandling ?? state.codeIncludeErrorHandling,
              includeTests: options?.includeTests ?? state.codeIncludeTests,
            });

            if (response.success && response.data) {
              const generationTime = Date.now() - startTime;

              set({
                isGenerating: false,
                generationStatus: 'success',
                codeResult: response.data.content,
                codeResultMetadata: {
                  ...response.data.metadata,
                },
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'code',
                prompt,
                result: response.data.content,
                model: response.data.metadata.model,
                provider: response.data.metadata.provider as ModelProvider,
                costUsd: response.data.metadata.costUsd,
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to generate code',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to generate code',
            });
          }
        },

        setCodePrompt: (prompt: string) => set({ codePrompt: prompt }),
        setCodeLanguage: (language: string) => set({ codeLanguage: language }),
        setCodeFramework: (framework: string) => set({ codeFramework: framework }),
        setCodeIncludeComments: (include: boolean) => set({ codeIncludeComments: include }),
        setCodeIncludeErrorHandling: (include: boolean) => set({ codeIncludeErrorHandling: include }),
        setCodeIncludeTests: (include: boolean) => set({ codeIncludeTests: include }),
        clearCodeResult: () => set({ codeResult: null, codeResultMetadata: null }),

        // ============================================
        // Translation Actions
        // ============================================

        translateText: async (options?: TranslationOptions) => {
          const state = get();

          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            const content = options?.content || state.translationContent;
            if (!content.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter text to translate' });
              return;
            }

            const response = await apiClient.post<{
              original: string;
              translated: string;
              originalLength: number;
              translatedLength: number;
            }>('/api/agent/content/translate', {
              content,
              targetLanguage: options?.targetLanguage || state.translationTargetLanguage,
              sourceLanguage: options?.sourceLanguage || state.translationSourceLanguage,
              formality: options?.formality || state.translationFormality,
            });

            if (response.success && response.data) {
              set({
                isGenerating: false,
                generationStatus: 'success',
                translationResult: response.data.translated,
                translationOriginalLength: response.data.originalLength,
                translationResultLength: response.data.translatedLength,
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'translation',
                prompt: content,
                result: response.data.translated,
                model: 'translation-model',
                provider: 'openai',
                costUsd: estimateCost('translation', response.data.originalLength / 4),
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to translate text',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to translate text',
            });
          }
        },

        setTranslationContent: (content: string) => set({ translationContent: content }),
        setTranslationTargetLanguage: (language: string) => set({ translationTargetLanguage: language }),
        setTranslationSourceLanguage: (language: string) => set({ translationSourceLanguage: language }),
        setTranslationFormality: (formality: 'formal' | 'informal' | 'neutral') => set({ translationFormality: formality }),
        clearTranslationResult: () => set({ translationResult: null }),

        // ============================================
        // Summarization Actions
        // ============================================

        summarizeText: async (options?: SummarizationOptions) => {
          const state = get();

          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            const content = options?.content || state.summarizationContent;
            if (!content.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter text to summarize' });
              return;
            }

            const response = await apiClient.post<{
              summary: string;
              originalLength: number;
              summaryLength: number;
              compressionRatio: number;
            }>('/api/agent/content/summarize', {
              content,
              maxLength: options?.maxLength || state.summarizationMaxLength,
              format: options?.format || state.summarizationFormat,
            });

            if (response.success && response.data) {
              set({
                isGenerating: false,
                generationStatus: 'success',
                summarizationResult: response.data.summary,
                summarizationOriginalLength: response.data.originalLength,
                summarizationResultLength: response.data.summaryLength,
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'summarization',
                prompt: content,
                result: response.data.summary,
                model: 'summarization-model',
                provider: 'openai',
                costUsd: estimateCost('summarization', response.data.originalLength / 4),
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to summarize text',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to summarize text',
            });
          }
        },

        setSummarizationContent: (content: string) => set({ summarizationContent: content }),
        setSummarizationMaxLength: (length: number) => set({ summarizationMaxLength: length }),
        setSummarizationFormat: (format: 'paragraph' | 'bullet_points' | 'key_points') => set({ summarizationFormat: format }),
        clearSummarizationResult: () => set({ summarizationResult: null }),

        // ============================================
        // Analysis Actions
        // ============================================

        analyzeContent: async (content: string) => {
          set({ isGenerating: true, generationStatus: 'loading', error: null });

          try {
            if (!content.trim()) {
              set({ isGenerating: false, generationStatus: 'error', error: 'Please enter content to analyze' });
              return;
            }

            const response = await apiClient.post<ContentAnalysisResult>(
              '/api/agent/content/analyze',
              { content }
            );

            if (response.success && response.data) {
              set({
                isGenerating: false,
                generationStatus: 'success',
                analysisResult: response.data,
              });

              // Save to history
              get().saveToHistory({
                id: generateId(),
                type: 'analysis',
                prompt: content,
                result: JSON.stringify(response.data, null, 2),
                model: 'analysis-model',
                provider: 'openai',
                costUsd: estimateCost('analysis', content.length / 4),
                createdAt: new Date(),
              });
            } else {
              set({
                isGenerating: false,
                generationStatus: 'error',
                error: response.error || 'Failed to analyze content',
              });
            }
          } catch (err) {
            set({
              isGenerating: false,
              generationStatus: 'error',
              error: err instanceof Error ? err.message : 'Failed to analyze content',
            });
          }
        },

        moderateContent: async (content: string) => {
          try {
            const response = await apiClient.post<ContentModerationResult>(
              '/api/agent/content/moderate',
              { content }
            );

            if (response.success && response.data) {
              set({ moderationResult: response.data });
            }
          } catch (err) {
            console.error('Failed to moderate content:', err);
          }
        },

        setAnalysisContent: (content: string) => set({ analysisContent: content }),
        clearAnalysisResult: () => set({ analysisResult: null, moderationResult: null }),

        // ============================================
        // UI & Utility Actions
        // ============================================

        setActiveType: (type: GenerationType) => {
          set({
            activeType: type,
            generationStatus: 'idle',
          });
        },

        copyToClipboard: (content: string) => {
          navigator.clipboard.writeText(content);
          set({ copied: true });
          setTimeout(() => set({ copied: false }), 2000);
        },

        downloadResult: (content: string, filename: string, mimeType: string = 'text/plain') => {
          const blob = new Blob([content], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          set({ downloaded: true });
          setTimeout(() => set({ downloaded: false }), 2000);
        },

        applyTemplate: (templateId: string) => {
          const template = get().templates.find(t => t.id === templateId);
          if (!template) return;

          set({ selectedTemplate: templateId });

          switch (template.type) {
            case 'text':
              set({ textPrompt: template.template });
              break;
            case 'image':
              set({ imagePrompt: template.template });
              break;
            case 'video':
              set({ videoPrompt: template.template });
              break;
            case 'code':
              set({ codePrompt: template.template });
              break;
            case 'translation':
              set({ translationContent: template.template });
              break;
            case 'summarization':
              set({ summarizationContent: template.template });
              break;
            case 'analysis':
              set({ analysisContent: template.template });
              break;
          }

          set({ showingTemplates: false });
        },

        saveToHistory: (entry: GenerationHistory) => {
          set(state => ({
            history: [entry, ...state.history].slice(0, 100), // Keep last 100 entries
          }));
        },

        clearHistory: () => {
          set({ history: [] });
        },

        toggleHistory: () => {
          set(state => ({ showingHistory: !state.showingHistory }));
        },

        toggleTemplates: () => {
          set(state => ({ showingTemplates: !state.showingTemplates }));
        },

        fetchTemplates: async () => {
          try {
            const response = await apiClient.get<ContentTemplate[]>('/api/agent/content/templates');
            if (response.success && response.data) {
              set({ templates: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch templates:', err);
          }
        },

        fetchAvailableModels: async () => {
          set({ isLoadingModels: true });
          
          try {
            const response = await apiClient.get<AIModelInfo[]>('/api/agent/content/models');
            if (response.success && response.data) {
              set({ availableModels: response.data, isLoadingModels: false });
            } else {
              set({
                isLoadingModels: false,
                availableModels: getDefaultModels(),
              });
            }
          } catch (err) {
            set({
              isLoadingModels: false,
              availableModels: getDefaultModels(),
            });
          }
        },

        fetchHistory: async () => {
          set({ isLoadingHistory: true });

          try {
            const response = await apiClient.get<GenerationHistory[]>('/api/agent/content/history', { limit: 100 });
            if (response.success && response.data) {
              set({ history: response.data, isLoadingHistory: false });
            } else {
              set({ isLoadingHistory: false });
            }
          } catch (err) {
            set({ isLoadingHistory: false });
          }
        },

        clearAllResults: () => {
          set({
            textResult: null,
            textResultMetadata: null,
            imageResults: null,
            imageResultMetadata: null,
            videoResult: null,
            videoProgress: 0,
            codeResult: null,
            codeResultMetadata: null,
            translationResult: null,
            summarizationResult: null,
            analysisResult: null,
            moderationResult: null,
            generationStatus: 'idle',
          });
        },

        clearError: () => {
          set({ error: null });
        },

        resetState: () => {
          set({ ...initialState, history: [] });
        },
      }),
      {
        name: 'content-agent-store',
        partialize: (state) => ({
          activeType: state.activeType,
          textPrompt: state.textPrompt,
          textTemperature: state.textTemperature,
          textMaxTokens: state.textMaxTokens,
          textModel: state.textModel,
          imageSize: state.imageSize,
          imageQuality: state.imageQuality,
          imageStyle: state.imageStyle,
          imageNumImages: state.imageNumImages,
          imageModel: state.imageModel,
          videoDuration: state.videoDuration,
          videoResolution: state.videoResolution,
          codeLanguage: state.codeLanguage,
          codeIncludeComments: state.codeIncludeComments,
          codeIncludeErrorHandling: state.codeIncludeErrorHandling,
          codeIncludeTests: state.codeIncludeTests,
          translationTargetLanguage: state.translationTargetLanguage,
          translationFormality: state.translationFormality,
          summarizationMaxLength: state.summarizationMaxLength,
          summarizationFormat: state.summarizationFormat,
          history: state.history.slice(0, 50), // Persist last 50 history entries
        }),
      }
    )
  )
);

// ============================================
// Default Models (Fallback)
// ============================================

function getDefaultModels(): AIModelInfo[] {
  return [
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      type: 'text',
      maxTokens: 8192,
      costPer1kTokens: 0.03,
      isAvailable: true,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      type: 'text',
      maxTokens: 128000,
      costPer1kTokens: 0.01,
      isAvailable: true,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      type: 'text',
      maxTokens: 4096,
      costPer1kTokens: 0.0005,
      isAvailable: true,
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      type: 'text',
      maxTokens: 200000,
      costPer1kTokens: 0.015,
      isAvailable: true,
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      type: 'text',
      maxTokens: 200000,
      costPer1kTokens: 0.003,
      isAvailable: true,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      type: 'text',
      maxTokens: 1000000,
      costPer1kTokens: 0.0035,
      isAvailable: true,
    },
    {
      id: 'dall-e-3',
      name: 'DALL-E 3',
      provider: 'openai',
      type: 'image',
      costPerImage: 0.04,
      isAvailable: true,
    },
    {
      id: 'stable-diffusion-xl',
      name: 'Stable Diffusion XL',
      provider: 'stability',
      type: 'image',
      costPerImage: 0.002,
      isAvailable: true,
    },
    {
      id: 'runway-gen2',
      name: 'Runway Gen-2',
      provider: 'runway',
      type: 'video',
      costPerSecond: 0.05,
      isAvailable: true,
    },
  ];
}

// ============================================
// Selector Hooks
// ============================================

export const useTextGeneration = () => useContentStore(state => ({
  textPrompt: state.textPrompt,
  textSystemPrompt: state.textSystemPrompt,
  textTemperature: state.textTemperature,
  textMaxTokens: state.textMaxTokens,
  textModel: state.textModel,
  textResult: state.textResult,
  textResultMetadata: state.textResultMetadata,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  generateText: state.generateText,
  setTextPrompt: state.setTextPrompt,
  setTextSystemPrompt: state.setTextSystemPrompt,
  setTextTemperature: state.setTextTemperature,
  setTextMaxTokens: state.setTextMaxTokens,
  setTextModel: state.setTextModel,
  clearTextResult: state.clearTextResult,
  copyToClipboard: state.copyToClipboard,
  downloadResult: state.downloadResult,
}));

export const useImageGeneration = () => useContentStore(state => ({
  imagePrompt: state.imagePrompt,
  imageNegativePrompt: state.imageNegativePrompt,
  imageSize: state.imageSize,
  imageQuality: state.imageQuality,
  imageStyle: state.imageStyle,
  imageNumImages: state.imageNumImages,
  imageModel: state.imageModel,
  imageResults: state.imageResults,
  imageResultMetadata: state.imageResultMetadata,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  generateImage: state.generateImage,
  setImagePrompt: state.setImagePrompt,
  setImageNegativePrompt: state.setImageNegativePrompt,
  setImageSize: state.setImageSize,
  setImageQuality: state.setImageQuality,
  setImageStyle: state.setImageStyle,
  setImageNumImages: state.setImageNumImages,
  setImageModel: state.setImageModel,
  clearImageResults: state.clearImageResults,
  copyToClipboard: state.copyToClipboard,
  downloadResult: state.downloadResult,
}));

export const useVideoGeneration = () => useContentStore(state => ({
  videoPrompt: state.videoPrompt,
  videoDuration: state.videoDuration,
  videoResolution: state.videoResolution,
  videoStyle: state.videoStyle,
  videoInitImageUrl: state.videoInitImageUrl,
  videoResult: state.videoResult,
  videoProgress: state.videoProgress,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  generateVideo: state.generateVideo,
  setVideoPrompt: state.setVideoPrompt,
  setVideoDuration: state.setVideoDuration,
  setVideoResolution: state.setVideoResolution,
  setVideoStyle: state.setVideoStyle,
  setVideoInitImageUrl: state.setVideoInitImageUrl,
  clearVideoResult: state.clearVideoResult,
}));

export const useCodeGeneration = () => useContentStore(state => ({
  codePrompt: state.codePrompt,
  codeLanguage: state.codeLanguage,
  codeFramework: state.codeFramework,
  codeIncludeComments: state.codeIncludeComments,
  codeIncludeErrorHandling: state.codeIncludeErrorHandling,
  codeIncludeTests: state.codeIncludeTests,
  codeResult: state.codeResult,
  codeResultMetadata: state.codeResultMetadata,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  generateCode: state.generateCode,
  setCodePrompt: state.setCodePrompt,
  setCodeLanguage: state.setCodeLanguage,
  setCodeFramework: state.setCodeFramework,
  setCodeIncludeComments: state.setCodeIncludeComments,
  setCodeIncludeErrorHandling: state.setCodeIncludeErrorHandling,
  setCodeIncludeTests: state.setCodeIncludeTests,
  clearCodeResult: state.clearCodeResult,
  copyToClipboard: state.copyToClipboard,
  downloadResult: state.downloadResult,
}));

export const useTranslation = () => useContentStore(state => ({
  translationContent: state.translationContent,
  translationTargetLanguage: state.translationTargetLanguage,
  translationSourceLanguage: state.translationSourceLanguage,
  translationFormality: state.translationFormality,
  translationResult: state.translationResult,
  translationOriginalLength: state.translationOriginalLength,
  translationResultLength: state.translationResultLength,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  translateText: state.translateText,
  setTranslationContent: state.setTranslationContent,
  setTranslationTargetLanguage: state.setTranslationTargetLanguage,
  setTranslationSourceLanguage: state.setTranslationSourceLanguage,
  setTranslationFormality: state.setTranslationFormality,
  clearTranslationResult: state.clearTranslationResult,
  copyToClipboard: state.copyToClipboard,
}));

export const useSummarization = () => useContentStore(state => ({
  summarizationContent: state.summarizationContent,
  summarizationMaxLength: state.summarizationMaxLength,
  summarizationFormat: state.summarizationFormat,
  summarizationResult: state.summarizationResult,
  summarizationOriginalLength: state.summarizationOriginalLength,
  summarizationResultLength: state.summarizationResultLength,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  summarizeText: state.summarizeText,
  setSummarizationContent: state.setSummarizationContent,
  setSummarizationMaxLength: state.setSummarizationMaxLength,
  setSummarizationFormat: state.setSummarizationFormat,
  clearSummarizationResult: state.clearSummarizationResult,
  copyToClipboard: state.copyToClipboard,
}));

export const useAnalysis = () => useContentStore(state => ({
  analysisContent: state.analysisContent,
  analysisResult: state.analysisResult,
  moderationResult: state.moderationResult,
  isGenerating: state.isGenerating,
  generationStatus: state.generationStatus,
  error: state.error,
  analyzeContent: state.analyzeContent,
  moderateContent: state.moderateContent,
  setAnalysisContent: state.setAnalysisContent,
  clearAnalysisResult: state.clearAnalysisResult,
  copyToClipboard: state.copyToClipboard,
}));

export const useContentHistory = () => useContentStore(state => ({
  history: state.history,
  templates: state.templates,
  isLoadingHistory: state.isLoadingHistory,
  showingHistory: state.showingHistory,
  showingTemplates: state.showingTemplates,
  selectedTemplate: state.selectedTemplate,
  fetchHistory: state.fetchHistory,
  fetchTemplates: state.fetchTemplates,
  toggleHistory: state.toggleHistory,
  toggleTemplates: state.toggleTemplates,
  applyTemplate: state.applyTemplate,
  clearHistory: state.clearHistory,
  saveToHistory: state.saveToHistory,
}));

export const useContentModels = () => useContentStore(state => ({
  availableModels: state.availableModels,
  isLoadingModels: state.isLoadingModels,
  fetchAvailableModels: state.fetchAvailableModels,
}));