// enterprise-ai-agent-platform/apps/api/src/services/ai/gemini.client.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiCompletionOptions {
  contents: GeminiContent[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface GeminiCompletionResponse {
  candidates: Array<{
    content: { parts: Array<{ text: string }>; role: string };
    finishReason: string;
    safetyRatings: Array<{ category: string; probability: string }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

export class GeminiClient {
  private client: AxiosInstance;
  private static instance: GeminiClient | null = null;
  private readonly apiKey: string;

  private constructor() {
    this.apiKey = apiConfig.gemini.apiKey;
    this.client = axios.create({
      baseURL: apiConfig.gemini.apiUrl,
      timeout: apiConfig.gemini.timeout,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logger.error('Gemini API key invalid');
        } else if (error.response?.status === 429) {
          logger.warn('Gemini rate limit exceeded');
        }
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }
    return GeminiClient.instance;
  }

  private buildUrl(model: string): string {
    return `/models/${model}:generateContent?key=${this.apiKey}`;
  }

  private buildStreamUrl(model: string): string {
    return `/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;
  }

  async complete(options: GeminiCompletionOptions): Promise<GeminiCompletionResponse> {
    const model = options.model || apiConfig.gemini.models.pro;
    const requestBody: any = {
      contents: options.contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 1000,
      },
    };
    
    if (options.topP) requestBody.generationConfig.topP = options.topP;
    if (options.topK) requestBody.generationConfig.topK = options.topK;
    if (options.stopSequences) requestBody.generationConfig.stopSequences = options.stopSequences;
    if (options.systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] };
    }

    const response = await this.client.post(this.buildUrl(model), requestBody);
    return response.data;
  }

  async streamComplete(
    options: GeminiCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise<GeminiCompletionResponse> {
    const model = options.model || apiConfig.gemini.models.pro;
    const requestBody: any = {
      contents: options.contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 1000,
      },
    };
    
    if (options.systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: options.systemInstruction }] };
    }

    const response = await this.client.post(this.buildStreamUrl(model), requestBody, { responseType: 'stream' });
    let fullContent = '';
    let finalResponse: GeminiCompletionResponse | null = null;

    return new Promise((resolve, reject) => {
      let buffer = '';
      response.data.on('data', (chunk: Buffer) => {
        const chunkStr = chunk.toString();
        buffer += chunkStr;
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.candidates?.[0]?.content?.parts?.[0]?.text) {
                const newText = parsed.candidates[0].content.parts[0].text;
                const delta = newText.slice(fullContent.length);
                if (delta) {
                  fullContent = newText;
                  onChunk(delta);
                }
              }
              finalResponse = parsed;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      
      response.data.on('end', () => {
        if (finalResponse) {
          resolve(finalResponse);
        } else {
          resolve({
            candidates: [{ content: { parts: [{ text: fullContent }], role: 'model' }, finishReason: 'STOP', safetyRatings: [] }],
            usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
            modelVersion: model,
          });
        }
      });
      
      response.data.on('error', reject);
    });
  }

  async createEmbedding(text: string): Promise<number[]> {
    const model = 'embedding-001';
    const response = await this.client.post(
      `/models/${model}:embedContent?key=${this.apiKey}`,
      { content: { parts: [{ text }] } }
    );
    return response.data.embedding?.values || [];
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-1.5-pro': { input: 0.0000035, output: 0.0000105 },
      'gemini-1.5-flash': { input: 0.00000035, output: 0.00000105 },
      'gemini-1.0-pro': { input: 0.0000005, output: 0.0000015 },
    };
    const rate = pricing[model] || pricing['gemini-1.5-pro'];
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }

  async listModels(): Promise<string[]> {
    const response = await this.client.get(`/models?key=${this.apiKey}`);
    return response.data.models?.map((m: any) => m.name) || [];
  }
}