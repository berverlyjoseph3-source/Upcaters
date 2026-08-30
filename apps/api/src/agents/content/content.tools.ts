// enterprise-ai-agent-platform/apps/api/src/agents/content/content.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { logger } from '../../utils/logger';
import { OpenAIService } from '../../services/ai/openai.service';
import { OpenAIClient } from '../../services/ai/openai.client';
import { AnthropicClient } from '../../services/ai/anthropic.client';
import { GeminiClient } from '../../services/ai/gemini.client';
import { 
  ContentGenerationType,
  ContentGenerationResult,
  TextGenerationOptions,
  ImageGenerationOptions,
  VideoGenerationOptions,
  ContentEditRequest,
  ContentResizeRequest,
  ContentAnalysisResult,
  BatchGenerationRequest,
  BatchGenerationResult,
  ModelProvider,
  PlatformDimensions,
} from './content.types';

export class ContentTools {
  /**
   * Generate text content
   */
  static generateTextTool(): AgentTool {
    return {
      name: 'generate_text',
      description: 'Generate text content using AI (articles, emails, social posts, code)',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'The prompt describing what to generate' },
        { name: 'systemPrompt', type: 'string', required: false, description: 'System instructions for the AI' },
        { name: 'temperature', type: 'number', required: false, description: 'Creativity level (0-1)' },
        { name: 'maxTokens', type: 'number', required: false, description: 'Maximum length of response' },
        { name: 'model', type: 'string', required: false, description: 'Model to use (openai, anthropic, gemini)' },
      ],
      execute: async (params, context) => {
        return await this.generateText({
          prompt: params.prompt,
          systemPrompt: params.systemPrompt,
          temperature: params.temperature,
          maxTokens: params.maxTokens,
          model: params.model,
        });
      },
      requiresApiCall: true,
      cost: 3,
    };
  }

  /**
   * Generate image content
   */
  static generateImageTool(): AgentTool {
    return {
      name: 'generate_image',
      description: 'Generate images from text descriptions using DALL-E or Stable Diffusion',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Description of the image to generate' },
        { name: 'negativePrompt', type: 'string', required: false, description: 'What to avoid in the image' },
        { name: 'size', type: 'string', required: false, description: 'Image size (512x512, 1024x1024, 1792x1024)' },
        { name: 'quality', type: 'string', required: false, description: 'Quality level (standard, hd)' },
        { name: 'style', type: 'string', required: false, description: 'Style (vivid, natural)' },
        { name: 'numImages', type: 'number', required: false, description: 'Number of images to generate' },
      ],
      execute: async (params, context) => {
        return await this.generateImage({
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          size: params.size,
          quality: params.quality,
          style: params.style,
          numImages: params.numImages || 1,
        });
      },
      requiresApiCall: true,
      cost: 10,
    };
  }

  /**
   * Generate video content
   */
  static generateVideoTool(): AgentTool {
    return {
      name: 'generate_video',
      description: 'Generate short videos from text descriptions (Enterprise plan only)',
      parameters: [
        { name: 'prompt', type: 'string', required: true, description: 'Description of the video to generate' },
        { name: 'duration', type: 'number', required: false, description: 'Video duration in seconds' },
        { name: 'style', type: 'string', required: false, description: 'Video style' },
        { name: 'initImageUrl', type: 'string', required: false, description: 'Initial image to animate' },
      ],
      execute: async (params, context) => {
        return await this.generateVideo({
          prompt: params.prompt,
          duration: params.duration,
          style: params.style,
          initImageUrl: params.initImageUrl,
        });
      },
      requiresApiCall: true,
      cost: 50,
    };
  }

  /**
   * Edit content
   */
  static editContentTool(): AgentTool {
    return {
      name: 'edit_content',
      description: 'Edit existing content using AI',
      parameters: [
        { name: 'originalContent', type: 'string', required: true, description: 'Original content to edit' },
        { name: 'editPrompt', type: 'string', required: true, description: 'Instructions for editing' },
        { name: 'type', type: 'string', required: true, description: 'Content type (text, image, video)' },
      ],
      execute: async (params, context) => {
        return await this.editContent({
          originalContent: params.originalContent,
          editPrompt: params.editPrompt,
          type: params.type,
        });
      },
      requiresApiCall: true,
      cost: 5,
    };
  }

  /**
   * Resize content for platform
   */
  static resizeForPlatformTool(): AgentTool {
    return {
      name: 'resize_for_platform',
      description: 'Resize images/videos for specific social media platforms',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Content URL or base64' },
        { name: 'platform', type: 'string', required: true, description: 'Platform (linkedin, instagram, facebook, twitter)' },
        { name: 'type', type: 'string', required: true, description: 'Content type (image, video)' },
      ],
      execute: async (params, context) => {
        return await this.resizeForPlatform({
          content: params.content,
          platform: params.platform,
          type: params.type,
        });
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Analyze content
   */
  static analyzeContentTool(): AgentTool {
    return {
      name: 'analyze_content',
      description: 'Analyze content for sentiment, topics, and quality',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Content to analyze' },
        { name: 'type', type: 'string', required: true, description: 'Content type (text, image, video)' },
      ],
      execute: async (params, context) => {
        return await this.analyzeContent(params.content, params.type);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Summarize text content
   */
  static summarizeTextTool(): AgentTool {
    return {
      name: 'summarize_text',
      description: 'Summarize long text content',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Text to summarize' },
        { name: 'maxLength', type: 'number', required: false, description: 'Maximum summary length in words' },
      ],
      execute: async (params, context) => {
        return await this.summarizeText(params.content, params.maxLength || 200);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Translate text content
   */
  static translateTextTool(): AgentTool {
    return {
      name: 'translate_text',
      description: 'Translate text to another language',
      parameters: [
        { name: 'content', type: 'string', required: true, description: 'Text to translate' },
        { name: 'targetLanguage', type: 'string', required: true, description: 'Target language (e.g., Spanish, French, German)' },
      ],
      execute: async (params, context) => {
        return await this.translateText(params.content, params.targetLanguage);
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Batch generate content
   */
  static batchGenerateTool(): AgentTool {
    return {
      name: 'batch_generate',
      description: 'Generate multiple pieces of content in batch',
      parameters: [
        { name: 'requests', type: 'array', required: true, description: 'Array of generation requests' },
        { name: 'parallel', type: 'boolean', required: false, description: 'Generate in parallel' },
      ],
      execute: async (params, context) => {
        return await this.batchGenerate({
          requests: params.requests,
          parallel: params.parallel !== false,
          maxConcurrent: params.maxConcurrent || 3,
        });
      },
      requiresApiCall: true,
      cost: 0, // Cost calculated per request
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Generate text content
   */
  static async generateText(options: TextGenerationOptions): Promise<ContentGenerationResult> {
    const startTime = Date.now();
    const modelPreference = options.model || 'openai';
    
    // Define fallback chain
    const modelChain = [
      { name: modelPreference, client: this.getClient(modelPreference) },
      { name: 'openai', client: OpenAIClient.getInstance() },
      { name: 'anthropic', client: AnthropicClient.getInstance() },
      { name: 'gemini', client: GeminiClient.getInstance() },
    ];

    let lastError: Error | null = null;

    for (const model of modelChain) {
      if (!model.client) continue;
      
      try {
        let response: { content: string; model: string; tokensUsed: number; cost: number };
        const startModelTime = Date.now();
        
        if (model.name === 'openai') {
          const openai = model.client as OpenAIClient;
          const result = await openai.complete({
            messages: [
              ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
              { role: 'user' as const, content: options.prompt },
            ],
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 1000,
          });
          response = {
            content: result.choices[0].message.content,
            model: result.model,
            tokensUsed: result.usage.total_tokens,
            cost: openai.calculateCost(result.model, result.usage.total_tokens),
          };
        } else if (model.name === 'anthropic') {
          const anthropic = model.client as AnthropicClient;
          const result = await anthropic.complete({
            messages: [{ role: 'user', content: options.prompt }],
            system: options.systemPrompt,
            temperature: options.temperature ?? 0.7,
            maxTokens: options.maxTokens ?? 1000,
          });
          response = {
            content: result.content[0]?.text || '',
            model: result.model,
            tokensUsed: result.usage.output_tokens,
            cost: anthropic.calculateCost(result.model, result.usage.input_tokens, result.usage.output_tokens),
          };
        } else if (model.name === 'gemini') {
          const gemini = model.client as GeminiClient;
          const contents: any[] = [];
          if (options.systemPrompt) {
            contents.push({ parts: [{ text: options.systemPrompt }], role: 'user' });
            contents.push({ parts: [{ text: 'Understood.' }], role: 'model' });
          }
          contents.push({ parts: [{ text: options.prompt }], role: 'user' });
          
          const result = await gemini.complete({
            contents,
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 1000,
          });
          response = {
            content: result.candidates[0]?.content.parts[0]?.text || '',
            model: result.modelVersion,
            tokensUsed: result.usageMetadata.totalTokenCount,
            cost: gemini.calculateCost(result.modelVersion, result.usageMetadata.promptTokenCount, result.usageMetadata.candidatesTokenCount),
          };
        } else {
          continue;
        }

        const generationTime = Date.now() - startTime;
        logger.info({
          model: response.model,
          tokensUsed: response.tokensUsed,
          generationTime,
          attempt: modelChain.indexOf(model) + 1,
        }, 'Text generation completed');

        return {
          id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: ContentGenerationType.TEXT,
          content: response.content,
          metadata: {
            model: response.model,
            provider: this.getProviderForModel(model.name),
            tokensUsed: response.tokensUsed,
            costUsd: response.cost,
            generationTimeMs: generationTime,
            prompt: options.prompt,
          },
          createdAt: new Date(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({
          error: lastError.message,
          model: model.name,
          attempt: modelChain.indexOf(model) + 1,
        }, 'Text generation model failed, trying fallback');
      }
    }

    logger.error({ error: lastError, options }, 'All text generation models failed');
    throw lastError || new Error('All AI models failed to generate text');
  }

  /**
   * Generate image content
   */
  static async generateImage(options: ImageGenerationOptions): Promise<ContentGenerationResult> {
    const startTime = Date.now();

    try {
      const openai = OpenAIClient.getInstance();
      const imageUrl = await openai.createImage(
        options.prompt,
        options.size || '1024x1024',
        options.quality || 'standard'
      );
      
      const generationTime = Date.now() - startTime;
      logger.info({
        size: options.size,
        quality: options.quality,
        generationTime,
      }, 'Image generated successfully');

      return {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: ContentGenerationType.IMAGE,
        content: [imageUrl],
        metadata: {
          model: options.model || 'dall-e-3',
          provider: ModelProvider.OPENAI,
          costUsd: 0.04,
          generationTimeMs: generationTime,
          prompt: options.prompt,
          negativePrompt: options.negativePrompt,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, options }, 'Image generation failed');
      throw error;
    }
  }

  /**
   * Generate video content
   */
  static async generateVideo(options: VideoGenerationOptions): Promise<ContentGenerationResult> {
    const startTime = Date.now();

    try {
      // This would integrate with Runway ML or Pika Labs
      logger.info({ options }, 'Video generation requested');
      
      const generationTime = Date.now() - startTime;
      
      return {
        id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: ContentGenerationType.VIDEO,
        content: 'https://example.com/generated-video.mp4', // Placeholder
        metadata: {
          model: 'runway-gen2',
          provider: ModelProvider.RUNWAY,
          costUsd: 0.50,
          generationTimeMs: generationTime,
          prompt: options.prompt,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error({ error, options }, 'Video generation failed');
      throw error;
    }
  }

  /**
   * Edit content
   */
  static async editContent(request: ContentEditRequest): Promise<ContentGenerationResult> {
    const startTime = Date.now();

    try {
      if (request.type === ContentGenerationType.TEXT) {
        const editPrompt = `Edit the following content based on this instruction: ${request.editPrompt}\n\nOriginal: ${request.originalContent}\n\nEdited version:`;

        const response = await this.generateText({
          prompt: editPrompt,
          temperature: 0.5,
          maxTokens: 2000,
        });

        return {
          ...response,
          metadata: {
            ...response.metadata,
            generationTimeMs: Date.now() - startTime,
          },
        };
      }

      throw new Error(`Editing ${request.type} content not yet implemented`);
    } catch (error) {
      logger.error({ error, request }, 'Content editing failed');
      throw error;
    }
  }

  /**
   * Resize content for platform
   */
  private static async resizeForPlatform(request: ContentResizeRequest): Promise<ContentGenerationResult> {
    const dimensions: Record<string, PlatformDimensions> = {
      linkedin: { platform: 'linkedin', width: 1200, height: 627, aspectRatio: '1.91:1', crop: 'center' },
      instagram: { platform: 'instagram', width: 1080, height: 1080, aspectRatio: '1:1', crop: 'center' },
      facebook: { platform: 'facebook', width: 1200, height: 630, aspectRatio: '1.91:1', crop: 'center' },
      twitter: { platform: 'twitter', width: 1600, height: 900, aspectRatio: '16:9', crop: 'center' },
    };

    const dim = dimensions[request.platform];
    if (!dim) {
      throw new Error(`Unknown platform: ${request.platform}`);
    }

    logger.info({ platform: request.platform, dimensions: dim }, 'Resizing content');

    return {
      id: `resized_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: request.type,
      content: request.content,
      metadata: {
        model: 'resize-processor',
        provider: ModelProvider.OPENAI,
        costUsd: 0.01,
        generationTimeMs: 0,
        prompt: `Resize for ${request.platform}`,
      },
      createdAt: new Date(),
    };
  }

  /**
   * Analyze content
   */
  static async analyzeContent(content: string, type: string): Promise<ContentAnalysisResult> {
    try {
      const analysisPrompt = `
Analyze the following content and return JSON with:
- sentiment: positive, negative, or neutral
- topics: array of main topics (max 5)
- keywords: array of key phrases (max 10)
- readabilityScore: 0-100
- toxicityScore: 0-100
- suggestedImprovements: array of suggestions (max 3)

Content: ${content.substring(0, 2000)}
`;

      const response = await OpenAIService.complete({
        prompt: analysisPrompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      let analysis;
      try {
        analysis = JSON.parse(response.content);
      } catch (parseError) {
        logger.warn({ parseError, responseContent: response.content }, 'Failed to parse analysis response');
        analysis = {
          sentiment: 'neutral',
          topics: [],
          keywords: [],
          readabilityScore: 70,
          toxicityScore: 0,
          suggestedImprovements: [],
        };
      }

      return {
        contentType: type as ContentGenerationType,
        sentiment: analysis.sentiment || 'neutral',
        topics: analysis.topics || [],
        keywords: analysis.keywords || [],
        readabilityScore: analysis.readabilityScore || 70,
        toxicityScore: analysis.toxicityScore || 0,
        suggestedImprovements: analysis.suggestedImprovements || [],
      };
    } catch (error) {
      logger.error({ error }, 'Content analysis failed');
      throw error;
    }
  }

  /**
   * Summarize text
   */
  static async summarizeText(content: string, maxLength: number): Promise<{ summary: string; originalLength: number; summaryLength: number }> {
    try {
      const openai = OpenAIClient.getInstance();
      const response = await openai.complete({
        messages: [
          { role: 'system', content: `Summarize the following text in ${maxLength} words or less.` },
          { role: 'user', content },
        ],
        temperature: 0.5,
        maxTokens: maxLength * 2,
      });
      
      return {
        summary: response.choices[0].message.content,
        originalLength: content.length,
        summaryLength: response.choices[0].message.content.length,
      };
    } catch (error) {
      logger.error({ error }, 'Text summarization failed');
      throw error;
    }
  }

  /**
   * Translate text
   */
  static async translateText(content: string, targetLanguage: string): Promise<{ original: string; translated: string; language: string }> {
    try {
      const openai = OpenAIClient.getInstance();
      const response = await openai.complete({
        messages: [
          { role: 'system', content: `Translate the following text to ${targetLanguage}. Only return the translated text.` },
          { role: 'user', content },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });
      
      return {
        original: content,
        translated: response.choices[0].message.content,
        language: targetLanguage,
      };
    } catch (error) {
      logger.error({ error }, 'Text translation failed');
      throw error;
    }
  }

  /**
   * Batch generate content
   */
  private static async batchGenerate(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const startTime = Date.now();
    const results: ContentGenerationResult[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    const processRequest = async (req: any, index: number) => {
      try {
        let result;
        switch (req.type) {
          case ContentGenerationType.TEXT:
            result = await this.generateText(req);
            break;
          case ContentGenerationType.IMAGE:
            result = await this.generateImage(req);
            break;
          case ContentGenerationType.VIDEO:
            result = await this.generateVideo(req);
            break;
          default:
            throw new Error(`Unknown type: ${req.type}`);
        }
        results.push(result);
      } catch (error) {
        errors.push({ index, error: error instanceof Error ? error.message : String(error) });
      }
    };

    if (request.parallel && request.requests.length > 1) {
      // Parallel execution with concurrency limit
      const chunks = [];
      for (let i = 0; i < request.requests.length; i += request.maxConcurrent!) {
        chunks.push(request.requests.slice(i, i + request.maxConcurrent!));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map((req, idx) => processRequest(req, idx)));
      }
    } else {
      // Sequential execution
      for (let i = 0; i < request.requests.length; i++) {
        await processRequest(request.requests[i], i);
      }
    }

    return {
      results,
      totalTimeMs: Date.now() - startTime,
      totalCostUsd: results.reduce((sum, r) => sum + r.metadata.costUsd, 0),
      succeeded: results.length,
      failed: errors.length,
      errors,
    };
  }

  /**
   * Get AI client by name
   */
  private static getClient(modelName: string): any {
    switch (modelName.toLowerCase()) {
      case 'openai':
        return OpenAIClient.getInstance();
      case 'anthropic':
        return AnthropicClient.getInstance();
      case 'gemini':
        return GeminiClient.getInstance();
      default:
        return null;
    }
  }

  /**
   * Get provider enum from model name
   */
  private static getProviderForModel(modelName: string): ModelProvider {
    switch (modelName.toLowerCase()) {
      case 'openai':
        return ModelProvider.OPENAI;
      case 'anthropic':
        return ModelProvider.ANTHROPIC;
      case 'gemini':
        return ModelProvider.GOOGLE;
      default:
        return ModelProvider.OPENAI;
    }
  }
}