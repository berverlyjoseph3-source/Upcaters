// enterprise-ai-agent-platform/apps/frontend/src/hooks/useContent.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export type ContentGenerationType = 'text' | 'image' | 'video' | 'code' | 'analysis' | 'translation' | 'summary';
export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'stability' | 'runway';
export type TextTone = 'professional' | 'casual' | 'creative' | 'formal' | 'humorous' | 'technical';
export type ImageSize = '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'vivid' | 'natural';
export type VideoDuration = 4 | 8 | 12;
export type VideoResolution = '720p' | '1080p';
export type GenerationStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  model?: string;
  provider?: ModelProvider;
  tone?: TextTone;
  format?: 'plain' | 'markdown' | 'html' | 'json';
  stopSequences?: string[];
  stream?: boolean;
}

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  numImages?: number;
  model?: string;
  provider?: ModelProvider;
}

export interface VideoGenerationOptions {
  prompt: string;
  duration?: VideoDuration;
  fps?: number;
  resolution?: VideoResolution;
  style?: string;
  initImageUrl?: string;
  negativePrompt?: string;
  model?: string;
}

export interface ContentEditRequest {
  originalContent: string;
  editPrompt: string;
  type: ContentGenerationType;
  temperature?: number;
  maxTokens?: number;
}

export interface ContentTranslationRequest {
  content: string;
  targetLanguage: string;
  sourceLanguage?: string;
  preserveFormatting?: boolean;
}

export interface ContentSummaryRequest {
  content: string;
  maxLength?: number;
  format?: 'paragraph' | 'bullets' | 'key_points';
  focusAreas?: string[];
}

export interface ContentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  readabilityScore?: number;
  toxicityScore?: number;
  suggestedImprovements?: string[];
  entities?: Array<{ name: string; type: string; confidence: number }>;
  language?: string;
  readingTime?: number;
}

export interface ContentGenerationResult {
  id: string;
  type: ContentGenerationType;
  content: string | string[];
  metadata: {
    model: string;
    provider: ModelProvider;
    tokensUsed?: number;
    costUsd: number;
    generationTimeMs: number;
    prompt: string;
    negativePrompt?: string;
    revisedPrompt?: string;
  };
  status: GenerationStatus;
  error?: string;
  createdAt: Date;
}

export interface BatchGenerationRequest {
  requests: Array<{
    type: ContentGenerationType;
    prompt: string;
    options?: Record<string, any>;
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
  type: ContentGenerationType;
  template: string;
  variables: string[];
  category: string;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentHistoryEntry {
  id: string;
  type: ContentGenerationType;
  prompt: string;
  result: string;
  model: string;
  provider: ModelProvider;
  costUsd: number;
  createdAt: Date;
  rating?: number;
  bookmarked: boolean;
}

export interface ContentSettings {
  defaultModel: string;
  defaultProvider: ModelProvider;
  defaultTemperature: number;
  defaultMaxTokens: number;
  defaultImageSize: ImageSize;
  defaultImageQuality: ImageQuality;
  enableModeration: boolean;
  enableWatermark: boolean;
  saveHistory: boolean;
  autoFormat: boolean;
  streamingEnabled: boolean;
}

// ============================================
// Hook State
// ============================================

interface UseContentState {
  activeTab: ContentGenerationType;
  currentResult: ContentGenerationResult | null;
  results: ContentGenerationResult[];
  streamingContent: string;
  isStreaming: boolean;
  isProcessing: boolean;
  progress: number;
  templates: ContentTemplate[];
  history: ContentHistoryEntry[];
  settings: ContentSettings;
  totalCost: number;
  totalTokens: number;
  totalGenerations: number;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

// ============================================
// Hook
// ============================================

export function useContent() {
  const { isAuthenticated } = useAuthStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader | null>(null);

  // ============================================
  // State
  // ============================================

  const [state, setState] = useState<UseContentState>({
    activeTab: 'text',
    currentResult: null,
    results: [],
    streamingContent: '',
    isStreaming: false,
    isProcessing: false,
    progress: 0,
    templates: [],
    history: [],
    settings: {
      defaultModel: 'gpt-4',
      defaultProvider: 'openai',
      defaultTemperature: 0.7,
      defaultMaxTokens: 1000,
      defaultImageSize: '1024x1024',
      defaultImageQuality: 'standard',
      enableModeration: true,
      enableWatermark: true,
      saveHistory: true,
      autoFormat: true,
      streamingEnabled: true,
    },
    totalCost: 0,
    totalTokens: 0,
    totalGenerations: 0,
    isLoading: false,
    error: null,
    successMessage: null,
  });

  // ============================================
  // Helpers
  // ============================================

  const updateState = useCallback((partial: Partial<UseContentState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const clearError = useCallback(() => updateState({ error: null }), [updateState]);
  
  const clearSuccess = useCallback(() => updateState({ successMessage: null }), [updateState]);

  const showSuccess = useCallback((message: string) => {
    updateState({ successMessage: message });
    setTimeout(() => updateState({ successMessage: null }), 3000);
  }, [updateState]);

  const setActiveTab = useCallback((tab: ContentGenerationType) => {
    updateState({
      activeTab: tab,
      currentResult: null,
      streamingContent: '',
      isStreaming: false,
      error: null,
    });
  }, [updateState]);

  // ============================================
  // Text Generation
  // ============================================

  const generateText = useCallback(async (
    options: TextGenerationOptions
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/generate/text',
        {
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          temperature: options.temperature ?? state.settings.defaultTemperature,
          maxTokens: options.maxTokens ?? state.settings.defaultMaxTokens,
          topP: options.topP,
          frequencyPenalty: options.frequencyPenalty,
          presencePenalty: options.presencePenalty,
          model: options.model ?? state.settings.defaultModel,
          provider: options.provider ?? state.settings.defaultProvider,
          tone: options.tone,
          format: options.format,
          stopSequences: options.stopSequences,
        }
      );

      if (response.success && response.data) {
        const result = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          status: 'completed' as GenerationStatus,
        };

        updateState({
          currentResult: result,
          totalCost: state.totalCost + result.metadata.costUsd,
          totalTokens: state.totalTokens + (result.metadata.tokensUsed || 0),
          totalGenerations: state.totalGenerations + 1,
        });

        if (state.settings.saveHistory) {
          addToHistory('text', options.prompt, result.content as string, result.metadata);
        }

        showSuccess('Text generated successfully!');
        return result;
      }

      updateState({ error: response.error || 'Failed to generate text' });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate text';
      updateState({ error: message });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [state.settings, updateState, showSuccess]);

  // ============================================
  // Streaming Text Generation
  // ============================================

  const generateTextStream = useCallback(async (
    options: TextGenerationOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> => {
    updateState({ isStreaming: true, streamingContent: '', error: null });

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/agent/content/generate/text/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiClient.getAccessToken()}`,
        },
        body: JSON.stringify({
          ...options,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream reader available');

      streamReaderRef.current = reader;
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                updateState({ streamingContent: fullContent });
                onChunk?.(parsed.content);
              }
            } catch {
              // Partial JSON, skip
            }
          }
        }
      }

      updateState({
        isStreaming: false,
        streamingContent: '',
        totalGenerations: state.totalGenerations + 1,
      });

      return fullContent;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        updateState({ isStreaming: false });
        return state.streamingContent;
      }
      const message = error instanceof Error ? error.message : 'Stream failed';
      updateState({ error: message, isStreaming: false });
      return '';
    }
  }, [state.totalGenerations, updateState]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (streamReaderRef.current) {
      streamReaderRef.current.cancel();
      streamReaderRef.current = null;
    }
    updateState({ isStreaming: false });
  }, [updateState]);

  // ============================================
  // Image Generation
  // ============================================

  const generateImage = useCallback(async (
    options: ImageGenerationOptions
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, progress: 0, error: null });

    try {
      // Simulate progress updates for image generation
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 300);

      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/generate/image',
        {
          prompt: options.prompt,
          negativePrompt: options.negativePrompt,
          size: options.size ?? state.settings.defaultImageSize,
          quality: options.quality ?? state.settings.defaultImageQuality,
          style: options.style,
          numImages: options.numImages ?? 1,
          model: options.model,
          provider: options.provider,
        }
      );

      clearInterval(progressInterval);

      if (response.success && response.data) {
        updateState({ progress: 100 });

        setTimeout(() => {
          updateState({ progress: 0 });
        }, 500);

        const result = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          status: 'completed' as GenerationStatus,
        };

        updateState({
          currentResult: result,
          totalCost: state.totalCost + result.metadata.costUsd,
          totalGenerations: state.totalGenerations + 1,
        });

        showSuccess('Image generated successfully!');
        return result;
      }

      updateState({ error: response.error || 'Failed to generate image', progress: 0 });
      return null;
    } catch (error) {
      updateState({ progress: 0 });
      const message = error instanceof Error ? error.message : 'Failed to generate image';
      updateState({ error: message });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [state.settings, state.totalCost, state.totalGenerations, updateState, showSuccess]);

  // ============================================
  // Video Generation (Enterprise Only)
  // ============================================

  const generateVideo = useCallback(async (
    options: VideoGenerationOptions
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, progress: 0, error: null });

    try {
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 5, 95),
        }));
      }, 500);

      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/generate/video',
        {
          prompt: options.prompt,
          duration: options.duration ?? 4,
          resolution: options.resolution ?? '720p',
          style: options.style,
          initImageUrl: options.initImageUrl,
          negativePrompt: options.negativePrompt,
          model: options.model,
        }
      );

      clearInterval(progressInterval);

      if (response.success && response.data) {
        updateState({ progress: 100 });

        setTimeout(() => updateState({ progress: 0 }), 500);

        const result = {
          ...response.data,
          createdAt: new Date(response.data.createdAt),
          status: 'completed' as GenerationStatus,
        };

        updateState({
          currentResult: result,
          totalCost: state.totalCost + result.metadata.costUsd,
          totalGenerations: state.totalGenerations + 1,
        });

        showSuccess('Video generated successfully!');
        return result;
      }

      updateState({ error: response.error || 'Failed to generate video', progress: 0 });
      return null;
    } catch (error) {
      updateState({ progress: 0 });
      const message = error instanceof Error ? error.message : 'Failed to generate video';
      updateState({ error: message });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [state.totalCost, state.totalGenerations, updateState, showSuccess]);

  // ============================================
  // Content Editing
  // ============================================

  const editContent = useCallback(async (
    request: ContentEditRequest
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/edit',
        {
          originalContent: request.originalContent,
          editPrompt: request.editPrompt,
          type: request.type,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
        }
      );

      if (response.success && response.data) {
        showSuccess('Content edited successfully!');
        return response.data;
      }

      updateState({ error: response.error || 'Failed to edit content' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to edit content' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, showSuccess]);

  // ============================================
  // Translation
  // ============================================

  const translateContent = useCallback(async (
    request: ContentTranslationRequest
  ): Promise<{ original: string; translated: string; language: string } | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<{
        original: string;
        translated: string;
        language: string;
      }>('/api/agent/content/translate', request);

      if (response.success && response.data) {
        showSuccess(`Translated to ${request.targetLanguage}!`);
        return response.data;
      }

      updateState({ error: response.error || 'Failed to translate content' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to translate content' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, showSuccess]);

  // ============================================
  // Summarization
  // ============================================

  const summarizeContent = useCallback(async (
    request: ContentSummaryRequest
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/summarize',
        request
      );

      if (response.success && response.data) {
        showSuccess('Content summarized!');
        return response.data;
      }

      updateState({ error: response.error || 'Failed to summarize content' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to summarize content' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, showSuccess]);

  // ============================================
  // Content Analysis
  // ============================================

  const analyzeContent = useCallback(async (
    content: string,
    type: ContentGenerationType = 'text'
  ): Promise<ContentAnalysisResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<ContentAnalysisResult>(
        '/api/agent/content/analyze',
        { content, type }
      );

      if (response.success && response.data) {
        return response.data;
      }

      updateState({ error: response.error || 'Failed to analyze content' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to analyze content' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState]);

  // ============================================
  // Code Generation
  // ============================================

  const generateCode = useCallback(async (
    prompt: string,
    language: string = 'javascript',
    options?: Partial<TextGenerationOptions>
  ): Promise<ContentGenerationResult | null> => {
    const systemPrompt = `You are an expert ${language} developer. Write clean, well-documented ${language} code with proper error handling, type annotations, and comments. Return ONLY the code.`;

    return generateText({
      prompt,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 2000,
      ...options,
    });
  }, [generateText]);

  // ============================================
  // Batch Generation
  // ============================================

  const batchGenerate = useCallback(async (
    request: BatchGenerationRequest
  ): Promise<BatchGenerationResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<BatchGenerationResult>(
        '/api/agent/content/generate/batch',
        request
      );

      if (response.success && response.data) {
        showSuccess(`Generated ${response.data.succeeded} of ${request.requests.length} items`);
        return response.data;
      }

      updateState({ error: response.error || 'Batch generation failed' });
      return null;
    } catch (error) {
      updateState({ error: 'Batch generation failed' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, showSuccess]);

  // ============================================
  // Resize for Platform
  // ============================================

  const resizeForPlatform = useCallback(async (
    contentUrl: string,
    platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'youtube',
    type: 'image' | 'video' = 'image'
  ): Promise<ContentGenerationResult | null> => {
    updateState({ isProcessing: true, error: null });

    try {
      const response = await apiClient.post<ContentGenerationResult>(
        '/api/agent/content/resize',
        { content: contentUrl, platform, type }
      );

      if (response.success && response.data) {
        showSuccess(`Resized for ${platform}!`);
        return response.data;
      }

      updateState({ error: response.error || 'Failed to resize content' });
      return null;
    } catch (error) {
      updateState({ error: 'Failed to resize content' });
      return null;
    } finally {
      updateState({ isProcessing: false });
    }
  }, [updateState, showSuccess]);

  // ============================================
  // Templates
  // ============================================

  const fetchTemplates = useCallback(async (category?: string): Promise<ContentTemplate[]> => {
    try {
      const params = category ? `?category=${encodeURIComponent(category)}` : '';
      const response = await apiClient.get<ContentTemplate[]>(
        `/api/agent/content/templates${params}`
      );

      if (response.success && response.data) {
        updateState({ templates: response.data });
        return response.data;
      }
      return [];
    } catch (error) {
      updateState({ error: 'Failed to fetch templates' });
      return [];
    }
  }, [updateState]);

  const createTemplate = useCallback(async (
    template: Omit<ContentTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ): Promise<ContentTemplate | null> => {
    try {
      const response = await apiClient.post<ContentTemplate>(
        '/api/agent/content/templates',
        template
      );

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          templates: [...prev.templates, response.data!],
        }));
        showSuccess('Template saved');
        return response.data;
      }
      return null;
    } catch (error) {
      updateState({ error: 'Failed to create template' });
      return null;
    }
  }, [showSuccess, updateState]);

  const deleteTemplate = useCallback(async (templateId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/agent/content/templates/${templateId}`);
      setState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => t.id !== templateId),
      }));
      showSuccess('Template deleted');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to delete template' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // History
  // ============================================

  const fetchHistory = useCallback(async (
    page: number = 1,
    limit: number = 20,
    type?: ContentGenerationType
  ): Promise<{ entries: ContentHistoryEntry[]; total: number }> => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (type) params.append('type', type);

      const response = await apiClient.get<{
        entries: ContentHistoryEntry[];
        total: number;
      }>(`/api/agent/content/history?${params.toString()}`);

      if (response.success && response.data) {
        updateState({ history: response.data.entries });
        return response.data;
      }
      return { entries: [], total: 0 };
    } catch (error) {
      updateState({ error: 'Failed to fetch history' });
      return { entries: [], total: 0 };
    }
  }, [updateState]);

  const addToHistory = useCallback((
    type: ContentGenerationType,
    prompt: string,
    result: string,
    metadata: ContentGenerationResult['metadata']
  ) => {
    const entry: ContentHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      prompt,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      model: metadata.model,
      provider: metadata.provider,
      costUsd: metadata.costUsd,
      createdAt: new Date(),
      bookmarked: false,
    };

    setState(prev => ({
      ...prev,
      history: [entry, ...prev.history],
    }));
  }, []);

  const bookmarkHistoryEntry = useCallback((entryId: string) => {
    setState(prev => ({
      ...prev,
      history: prev.history.map(e =>
        e.id === entryId ? { ...e, bookmarked: !e.bookmarked } : e
      ),
    }));
  }, []);

  const rateHistoryEntry = useCallback((entryId: string, rating: number) => {
    setState(prev => ({
      ...prev,
      history: prev.history.map(e =>
        e.id === entryId ? { ...e, rating } : e
      ),
    }));
  }, []);

  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      await apiClient.delete('/api/agent/content/history');
      updateState({ history: [] });
      showSuccess('History cleared');
      return true;
    } catch (error) {
      updateState({ error: 'Failed to clear history' });
      return false;
    }
  }, [showSuccess, updateState]);

  // ============================================
  // Settings
  // ============================================

  const fetchSettings = useCallback(async (): Promise<ContentSettings | null> => {
    try {
      const response = await apiClient.get<ContentSettings>('/api/agent/content/settings');
      if (response.success && response.data) {
        updateState({ settings: response.data });
        return response.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, [updateState]);

  const updateSettings = useCallback(async (
    settings: Partial<ContentSettings>
  ): Promise<boolean> => {
    try {
      const response = await apiClient.put('/api/agent/content/settings', settings);
      if (response.success) {
        updateState({ settings: { ...state.settings, ...settings } });
        showSuccess('Settings updated');
        return true;
      }
      return false;
    } catch (error) {
      updateState({ error: 'Failed to update settings' });
      return false;
    }
  }, [state.settings, showSuccess, updateState]);

  // ============================================
  // Cost & Usage
  // ============================================

  const getUsageStats = useCallback(async (): Promise<{
    totalCost: number;
    totalTokens: number;
    totalGenerations: number;
    byType: Record<string, number>;
    byProvider: Record<string, number>;
  } | null> => {
    try {
      const response = await apiClient.get('/api/agent/content/stats');
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }, []);

  const getEstimatedCost = useCallback((
    model: string,
    tokensEstimate: number = 1000
  ): number => {
    const pricing: Record<string, number> = {
      'gpt-4-turbo': 0.00001,
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000001,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
      'gemini-1.5-pro': 0.0000035,
      'gemini-1.5-flash': 0.00000035,
      'dall-e-3-1024': 0.04,
      'dall-e-3-hd': 0.08,
    };

    return tokensEstimate * (pricing[model] || 0.00001);
  }, []);

  // ============================================
  // Cleanup
  // ============================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (streamReaderRef.current) {
        streamReaderRef.current.cancel();
      }
    };
  }, []);

  // ============================================
  // Return API
  // ============================================

  return {
    // State
    ...state,

    // Tab management
    setActiveTab,

    // Text generation
    generateText,
    generateTextStream,
    stopStreaming,

    // Image generation
    generateImage,

    // Video generation
    generateVideo,

    // Content editing & transformation
    editContent,
    translateContent,
    summarizeContent,
    analyzeContent,
    resizeForPlatform,

    // Code generation
    generateCode,

    // Batch operations
    batchGenerate,

    // Templates
    fetchTemplates,
    createTemplate,
    deleteTemplate,

    // History
    fetchHistory,
    bookmarkHistoryEntry,
    rateHistoryEntry,
    clearHistory,

    // Settings
    fetchSettings,
    updateSettings,

    // Cost & Usage
    getUsageStats,
    getEstimatedCost,

    // Utilities
    clearError,
    clearSuccess,
    updateState,
  };
}

export default useContent;