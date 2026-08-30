// enterprise-ai-agent-platform/apps/api/src/services/ai/openai.client.ts
import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAICompletionOptions {
  messages: OpenAIMessage[];
  model ? : string;
  maxTokens ? : number;
  temperature ? : number;
  topP ? : number;
  frequencyPenalty ? : number;
  presencePenalty ? : number;
  stop ? : string | string[];
  stream ? : boolean;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array < {
    index: number;
    message: { role: string;content: string };
    finish_reason: string;
  } > ;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIEmbeddingOptions {
  input: string | string[];
  model ? : string;
}

export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array < { object: string;index: number;embedding: number[] } > ;
  usage: { prompt_tokens: number;total_tokens: number };
}

export class OpenAIClient {
  private client: OpenAI;
  private static instance: OpenAIClient | null = null;
  
  private constructor() {
    this.client = new OpenAI({
      apiKey: apiConfig.openai.apiKey,
      timeout: apiConfig.openai.timeout,
      maxRetries: apiConfig.openai.maxRetries,
    });
    logger.info('OpenAI client initialized');
  }
  
  static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }
  
  async complete(options: OpenAICompletionOptions): Promise < OpenAICompletionResponse > {
    const response = await this.client.chat.completions.create({
      model: options.model || apiConfig.openai.models.gpt4,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stop: options.stop,
      stream: false,
    });
    
    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      choices: response.choices.map(c => ({
        index: c.index,
        message: { role: c.message.role, content: c.message.content || '' },
        finish_reason: c.finish_reason || 'stop',
      })),
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  }
  
  async streamComplete(
    options: OpenAICompletionOptions,
    onChunk: (chunk: string) => void
  ): Promise < OpenAICompletionResponse > {
    const stream = await this.client.chat.completions.create({
      model: options.model || apiConfig.openai.models.gpt4,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 1000,
      temperature: options.temperature ?? 0.7,
      stream: true,
    });
    
    let fullContent = '';
    let responseId = '';
    let responseModel = '';
    
    for await (const chunk of stream) {
      responseId = chunk.id;
      responseModel = chunk.model;
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        onChunk(content);
      }
    }
    
    return {
      id: responseId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: responseModel,
      choices: [{ index: 0, message: { role: 'assistant', content: fullContent }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
  
  async createEmbedding(options: OpenAIEmbeddingOptions): Promise < OpenAIEmbeddingResponse > {
    const response = await this.client.embeddings.create({
      model: options.model || apiConfig.openai.models.embedding,
      input: options.input,
    });
    
    return {
      object: response.object,
      data: response.data.map(d => ({
        object: d.object,
        index: d.index,
        embedding: d.embedding,
      })),
      usage: {
        prompt_tokens: response.usage.prompt_tokens,
        total_tokens: response.usage.total_tokens,
      },
    };
  }
  
  async createImage(prompt: string, size: string = '1024x1024', quality: string = 'standard'): Promise < string > {
    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: size as any,
      quality: quality as any,
    });
    const url = response.data?.[0]?.url;
    if (!url) {
      throw new Error('OpenAI image generation returned no image URL');
    }
    return url;
  }
  
  calculateCost(model: string, tokensUsed: number): number {
    const pricing: Record < string, number > = {
      'gpt-4-turbo-preview': 0.00001,
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000001,
      'text-embedding-3-small': 0.00000002,
      'dall-e-3': 0.04,
    };
    const rate = pricing[model] || 0.00001;
    return tokensUsed * rate;
  }
  
  async listModels(): Promise < string[] > {
    const response = await this.client.models.list();
    return response.data.map(m => m.id);
  }
}