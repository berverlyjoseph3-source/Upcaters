// enterprise-ai-agent-platform/apps/api/src/services/ai/gemini.service.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface GeminiCompletionOptions {
  prompt: string;
  systemPrompt ? : string;
  temperature ? : number;
  maxTokens ? : number;
  topP ? : number;
  topK ? : number;
  model ? : string;
  stopSequences ? : string[];
}

export interface GeminiCompletionResponse {
  content: string;
  model: string;
  finishReason: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd: number;
}

export class GeminiService {
  private static client: AxiosInstance | null = null;
  private static readonly MAX_RETRIES = apiConfig.gemini.maxRetries;
  private static readonly BASE_DELAY_MS = 1000;
  
  static initialize(): void {
    if (!this.client) {
      this.client = axios.create({
        baseURL: apiConfig.gemini.apiUrl,
        timeout: apiConfig.gemini.timeout,
      });
      logger.info('Gemini client initialized');
    }
  }
  
  private static getClient(): AxiosInstance {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) {
      throw new Error('Gemini client not initialized');
    }
    return this.client;
  }
  
  private static buildUrl(model: string): string {
    return `/models/${model}:generateContent?key=${apiConfig.gemini.apiKey}`;
  }
  
  static async createEmbedding(text: string, model?: string): Promise<{ embeddings: number[][]; tokensUsed: number }> {
    const client = this.getClient();
    const embeddingModel = model || 'embedding-001';

    const response = await client.post(
      `/models/${embeddingModel}:embedContent?key=${apiConfig.gemini.apiKey}`,
      {
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] },
      }
    );

    const values: number[] = response.data.embedding?.values || [];
    // Gemini's embedContent response doesn't report token usage directly;
    // approximate using the same heuristic as other providers in this codebase.
    const approxTokens = Math.ceil(text.length / 4);

    return {
      embeddings: [values],
      tokensUsed: approxTokens,
    };
  }

  static async complete(options: GeminiCompletionOptions): Promise < GeminiCompletionResponse > {
    const startTime = Date.now();
    const client = this.getClient();
    let lastError: Error | null = null;
    
    const model = options.model || apiConfig.gemini.models.pro;
    
    const contents: any[] = [];
    if (options.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: options.systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });
    
    const generationConfig: any = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1000,
    };
    if (options.topP) generationConfig.topP = options.topP;
    if (options.topK) generationConfig.topK = options.topK;
    if (options.stopSequences) generationConfig.stopSequences = options.stopSequences;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
      try {
        const response = await client.post(this.buildUrl(model), {
          contents,
          generationConfig,
        });
        
        const candidate = response.data.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text || '';
        const finishReason = candidate?.finishReason || 'STOP';
        const promptTokens = response.data.usageMetadata?.promptTokenCount || 0;
        const completionTokens = response.data.usageMetadata?.candidatesTokenCount || 0;
        const totalTokens = promptTokens + completionTokens;
        const costUsd = this.calculateCost(model, promptTokens, completionTokens);
        
        logger.debug({
          model,
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd,
          finishReason,
          durationMs: Date.now() - startTime,
          attempt,
        }, 'Gemini completion completed');
        
        return {
          content,
          model,
          finishReason: finishReason.toLowerCase(),
          tokensUsed: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
          costUsd,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ error: lastError.message, attempt, model }, 'Gemini completion attempt failed');
        
        if (attempt <= this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Gemini completion failed after retries');
  }
  
  static async completeWithFallback(options: GeminiCompletionOptions): Promise < GeminiCompletionResponse > {
    const models = [apiConfig.gemini.models.pro, apiConfig.gemini.models.flash];
    let lastError: Error | null = null;
    
    for (const model of models) {
      try {
        return await this.complete({ ...options, model });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ error: lastError.message, model }, 'Model failed, trying fallback');
      }
    }
    
    throw lastError || new Error('All Gemini models failed');
  }
  
  static async streamComplete(
    options: GeminiCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise < GeminiCompletionResponse > {
    const client = this.getClient();
    const model = options.model || apiConfig.gemini.models.pro;
    let fullContent = '';
    
    const contents: any[] = [];
    if (options.systemPrompt) {
      contents.push({ role: 'user', parts: [{ text: options.systemPrompt }] });
      contents.push({ role: 'model', parts: [{ text: 'Understood. I will follow these instructions.' }] });
    }
    contents.push({ role: 'user', parts: [{ text: options.prompt }] });
    
    const generationConfig: any = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1000,
    };
    
    try {
      const response = await client.post(this.buildUrl(model), {
        contents,
        generationConfig,
      }, { responseType: 'stream' });
      
      return new Promise((resolve, reject) => {
        let buffer = '';
        response.data.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          buffer += chunkStr;
          
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
              const newContent = parsed.candidates[0].content.parts[0].text;
              const delta = newContent.slice(fullContent.length);
              if (delta) {
                fullContent = newContent;
                onChunk(delta);
              }
            }
            buffer = '';
          } catch (e) {
            // Incomplete JSON, continue buffering
          }
        });
        response.data.on('end', () => {
          const promptTokens = 0; // Not available in streaming
          const completionTokens = Math.ceil(fullContent.length / 4);
          const costUsd = this.calculateCost(model, promptTokens, completionTokens);
          resolve({
            content: fullContent,
            model,
            finishReason: 'stop',
            tokensUsed: { prompt: promptTokens, completion: completionTokens, total: completionTokens },
            costUsd,
          });
        });
        response.data.on('error', reject);
      });
    } catch (error) {
      logger.error({ error }, 'Gemini streaming failed');
      throw error;
    }
  }
  
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record < string, { input: number;output: number } > = {
      'gemini-1.5-pro': { input: 0.0000035, output: 0.0000105 },
      'gemini-1.5-flash': { input: 0.00000035, output: 0.00000105 },
    };
    const rate = pricing[model] || { input: 0.0000035, output: 0.0000105 };
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }
  
  static async listModels(): Promise < string[] > {
    const client = this.getClient();
    try {
      const response = await client.get(`/models?key=${apiConfig.gemini.apiKey}`);
      return response.data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      logger.error({ error }, 'Failed to list models');
      return [];
    }
  }
  
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}