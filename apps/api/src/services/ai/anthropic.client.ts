// enterprise-ai-agent-platform/apps/api/src/services/ai/anthropic.client.ts
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicCompletionOptions {
  messages: AnthropicMessage[];
  system ? : string;
  model ? : string;
  maxTokens ? : number;
  temperature ? : number;
  topP ? : number;
  topK ? : number;
  stopSequences ? : string[];
  stream ? : boolean;
}

export interface AnthropicCompletionResponse {
  id: string;
  type: string;
  role: string;
  content: Array < { type: string;text: string } > ;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicClient {
  private client: AxiosInstance;
  private static instance: AnthropicClient | null = null;
  
  private constructor() {
    this.client = axios.create({
      baseURL: apiConfig.anthropic.apiUrl,
      headers: {
        'x-api-key': apiConfig.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      timeout: apiConfig.anthropic.timeout,
    });
    
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logger.error('Anthropic API key invalid');
        } else if (error.response?.status === 429) {
          logger.warn('Anthropic rate limit exceeded');
        }
        return Promise.reject(error);
      }
    );
  }
  
  static getInstance(): AnthropicClient {
    if (!AnthropicClient.instance) {
      AnthropicClient.instance = new AnthropicClient();
    }
    return AnthropicClient.instance;
  }
  
  async complete(options: AnthropicCompletionOptions): Promise < AnthropicCompletionResponse > {
    const requestBody: any = {
      model: options.model || apiConfig.anthropic.models.claude35,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
    };
    
    if (options.system) requestBody.system = options.system;
    if (options.topP) requestBody.top_p = options.topP;
    if (options.topK) requestBody.top_k = options.topK;
    if (options.stopSequences) requestBody.stop_sequences = options.stopSequences;
    if (options.stream) requestBody.stream = options.stream;
    
    const response = await this.client.post('/messages', requestBody);
    return response.data;
  }
  
  async streamComplete(
    options: AnthropicCompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise < AnthropicCompletionResponse > {
    const requestBody: any = {
      model: options.model || apiConfig.anthropic.models.claude35,
      messages: options.messages,
      max_tokens: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };
    
    if (options.system) requestBody.system = options.system;
    
    const response = await this.client.post('/messages', requestBody, { responseType: 'stream' });
    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let messageId = '';
    let stopReason = '';
    
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
              if (parsed.type === 'message_start') {
                messageId = parsed.message.id;
                inputTokens = parsed.message.usage.input_tokens;
              }
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullContent += parsed.delta.text;
                onChunk(parsed.delta.text);
              }
              if (parsed.type === 'message_stop') {
                outputTokens = parsed.message.usage.output_tokens;
                stopReason = parsed.message.stop_reason;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
      
      response.data.on('end', () => {
        resolve({
          id: messageId,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: fullContent }],
          model: options.model || apiConfig.anthropic.models.claude35,
          stop_reason: stopReason,
          stop_sequence: null,
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
        });
      });
      
      response.data.on('error', reject);
    });
  }
  
  async countTokens(text: string): Promise < number > {
    return Math.ceil(text.length / 4);
  }
  
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record < string, { input: number;output: number } > = {
      'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
      'claude-3-5-sonnet-20241022': { input: 0.000003, output: 0.000015 },
      'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 },
    };
    const rate = pricing[model] || pricing['claude-3-5-sonnet-20241022'];
    return (inputTokens * rate.input) + (outputTokens * rate.output);
  }
}