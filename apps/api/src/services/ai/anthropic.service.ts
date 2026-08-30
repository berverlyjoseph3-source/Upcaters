// enterprise-ai-agent-platform/apps/api/src/services/ai/anthropic.service.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface AnthropicCompletionOptions {
  prompt: string;
  systemPrompt ? : string;
  temperature ? : number;
  maxTokens ? : number;
  topP ? : number;
  topK ? : number;
  model ? : string;
  stopSequences ? : string[];
}

export interface AnthropicCompletionResponse {
  content: string;
  model: string;
  stopReason: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUsd: number;
}

export class AnthropicService {
  private static client: AxiosInstance | null = null;
  private static readonly MAX_RETRIES = apiConfig.anthropic.maxRetries;
  private static readonly BASE_DELAY_MS = 1000;
  
  static initialize(): void {
    if (!this.client) {
      this.client = axios.create({
        baseURL: apiConfig.anthropic.apiUrl,
        headers: {
          'x-api-key': apiConfig.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        timeout: apiConfig.anthropic.timeout,
      });
      logger.info('Anthropic client initialized');
    }
  }
  
  private static getClient(): AxiosInstance {
    if (!this.client) {
      this.initialize();
    }
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }
    return this.client;
  }
  
  static async complete(options: AnthropicCompletionOptions): Promise < AnthropicCompletionResponse > {
    const startTime = Date.now();
    const client = this.getClient();
    let lastError: Error | null = null;
    
    const model = options.model || apiConfig.anthropic.models.claude35;
    const messages = [{ role: 'user', content: options.prompt }];
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES + 1; attempt++) {
      try {
        const requestBody: any = {
          model,
          messages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature ?? 0.7,
        };
        if (options.systemPrompt) requestBody.system = options.systemPrompt;
        if (options.topP) requestBody.top_p = options.topP;
        if (options.topK) requestBody.top_k = options.topK;
        if (options.stopSequences) requestBody.stop_sequences = options.stopSequences;
        
        const response = await client.post('/messages', requestBody);
        
        const content = response.data.content[0]?.text || '';
        const inputTokens = response.data.usage?.input_tokens || 0;
        const outputTokens = response.data.usage?.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        const costUsd = this.calculateCost(model, inputTokens, outputTokens);
        
        logger.debug({
          model: response.data.model,
          inputTokens,
          outputTokens,
          totalTokens,
          costUsd,
          durationMs: Date.now() - startTime,
          attempt,
        }, 'Anthropic completion completed');
        
        return {
          content,
          model: response.data.model,
          stopReason: response.data.stop_reason || 'stop',
          tokensUsed: { input: inputTokens, output: outputTokens, total: totalTokens },
          costUsd,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ error: lastError.message, attempt, model }, 'Anthropic completion attempt failed');
        
        if (attempt <= this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Anthropic completion failed after retries');
  }
  
  static async completeWithFallback(options: AnthropicCompletionOptions): Promise < AnthropicCompletionResponse > {
    const models = [apiConfig.anthropic.models.claude35, apiConfig.anthropic.models.claude3];
    let lastError: Error | null = null;
    
    for (const model of models) {
      try {
        return await this.complete({ ...options, model });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ error: lastError.message, model }, 'Model failed, trying fallback');
      }
    }
    
    throw lastError || new Error('All Anthropic models failed');
  }
  
  static async streamComplete(
    options: AnthropicCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise < AnthropicCompletionResponse > {
    const client = this.getClient();
    const model = options.model || apiConfig.anthropic.models.claude35;
    const messages = [{ role: 'user', content: options.prompt }];
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    
    try {
      const requestBody: any = {
        model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        stream: true,
      };
      if (options.systemPrompt) requestBody.system = options.systemPrompt;
      
      const response = await client.post('/messages', requestBody, { responseType: 'stream' });
      
      return new Promise((resolve, reject) => {
        let buffer = '';
        response.data.on('data', (chunk: Buffer) => {
          const chunkStr = chunk.toString();
          const lines = chunkStr.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullContent += parsed.delta.text;
                  onChunk(parsed.delta.text);
                }
                if (parsed.type === 'message_stop') {
                  const costUsd = this.calculateCost(model, inputTokens, outputTokens);
                  resolve({
                    content: fullContent,
                    model,
                    stopReason: 'stop',
                    tokensUsed: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
                    costUsd,
                  });
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        });
        response.data.on('error', reject);
      });
    } catch (error) {
      logger.error({ error }, 'Anthropic streaming failed');
      throw error;
    }
  }
  
  static calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record < string, { input: number;output: number } > = {
      'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
      'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
    };
    const rate = pricing[model] || { input: 0.000003, output: 0.000015 };
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }
  
  static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}