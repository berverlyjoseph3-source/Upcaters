// enterprise-ai-agent-platform/apps/api/src/agents/web/brave.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  page_age ? : string;
  profile ? : {
    name: string;
    url: string;
    img: string;
    long_name ? : string;
  };
  meta_url ? : {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
  age ? : string;
  family_friendly ? : boolean;
  language ? : string;
  extra_snippets ? : string[];
}

export interface BraveSearchResponse {
  type: string;
  query: {
    original: string;
    show_strict_warning: boolean;
    altered ? : string;
    safesearch ? : string;
    is_navigational ? : boolean;
    is_news_breaking ? : boolean;
    spellcheck_off ? : boolean;
    country ? : string;
    bad_results ? : boolean;
    should_fallback ? : boolean;
    postal_code ? : string;
    city ? : string;
    header_country ? : string;
    more_results_available ? : boolean;
    custom_location_label ? : string;
  };
  web ? : {
    results: BraveSearchResult[];
    total ? : number;
    family_friendly ? : boolean;
  };
  news ? : {
    results: BraveSearchResult[];
    total ? : number;
  };
  videos ? : {
    results: Array < {
      title: string;
      url: string;
      description: string;
      age: string;
      thumbnail: string;
      duration: string;
      meta_url ? : any;
    } > ;
    total ? : number;
  };
  images ? : {
    results: Array < {
      title: string;
      url: string;
      source: string;
      height: number;
      width: number;
      thumbnail: string;
      thumbnail_src ? : string;
      properties ? : any;
    } > ;
    total ? : number;
  };
  summarizer ? : {
    key: string;
    summary: Array < { answer: string;query: string } > ;
  };
}

export interface BraveSearchOptions {
  query: string;
  count ? : number;
  offset ? : number;
  safesearch ? : 'off' | 'moderate' | 'strict';
  country ? : string;
  search_lang ? : string;
  ui_lang ? : string;
  spellcheck ? : boolean;
  freshness ? : 'pd' | 'pw' | 'pm' | 'py';
  result_filter ? : 'web' | 'news' | 'videos' | 'images';
  goggles_id ? : string;
  units ? : string;
  extra_snippets ? : boolean;
  summary ? : boolean;
}

export class BraveSearchClient {
  private client: AxiosInstance | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;
  
  constructor() {
    this.initializeClient();
  }
  
  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.brave.apiUrl,
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiConfig.brave.apiKey,
      },
      timeout: apiConfig.timeouts.default,
    });
    
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url, query: config.params?.q }, 'Brave Search API request');
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, query: response.config.params?.q }, 'Brave Search API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('Brave Search API key invalid or expired');
        } else if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          logger.warn({ retryAfter }, 'Brave Search rate limit exceeded');
        }
        throw error;
      }
    );
  }
  
  /**
   * Retry wrapper for API calls
   */
  private async retryRequest < T > (fn: () => Promise < T > , context: string): Promise < T > {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const axiosError = error as AxiosError;
          let delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          
          // Check for rate limit
          if (axiosError.response?.status === 429) {
            const retryAfter = axiosError.response.headers['retry-after'];
            delay = retryAfter ? parseInt(retryAfter) * 1000 : delay * 2;
          }
          
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Brave Search API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }
  
  async searchWeb(options: BraveSearchOptions): Promise < BraveSearchResponse > {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const params: any = {
        q: options.query,
        count: options.count || 10,
        safesearch: options.safesearch || 'moderate',
      };
      
      if (options.offset) params.offset = options.offset;
      if (options.country) params.country = options.country;
      if (options.search_lang) params.search_lang = options.search_lang;
      if (options.ui_lang) params.ui_lang = options.ui_lang;
      if (options.spellcheck !== undefined) params.spellcheck = options.spellcheck;
      if (options.freshness) params.freshness = options.freshness;
      if (options.goggles_id) params.goggles_id = options.goggles_id;
      if (options.units) params.units = options.units;
      if (options.extra_snippets) params.extra_snippets = options.extra_snippets;
      if (options.summary) params.summary = options.summary;
      
      const response = await this.client.get('/web/search', { params });
      return response.data;
    }, `searchWeb(${options.query})`);
  }
  
  async searchNews(query: string, count: number = 10, freshness ? : 'pd' | 'pw' | 'pm'): Promise < BraveSearchResult[] > {
    return this.retryRequest(async () => {
      const params: any = { q: query, count, safesearch: 'moderate' };
      if (freshness) params.freshness = freshness;
      
      const response = await this.searchWeb({ query, count, freshness, result_filter: 'news' });
      return response.news?.results || [];
    }, `searchNews(${query})`);
  }
  
  async searchVideos(query: string, count: number = 10): Promise < any[] > {
    return this.retryRequest(async () => {
      const response = await this.searchWeb({ query, count, result_filter: 'videos' });
      return response.videos?.results || [];
    }, `searchVideos(${query})`);
  }
  
  async searchImages(query: string, count: number = 10, size ? : 'small' | 'medium' | 'large' | 'wallpaper'): Promise < any[] > {
    return this.retryRequest(async () => {
      const response = await this.searchWeb({ query, count, result_filter: 'images' });
      return response.images?.results || [];
    }, `searchImages(${query})`);
  }
  
  async getFirstResult(query: string): Promise < BraveSearchResult | null > {
    const results = await this.searchWeb({ query, count: 1 });
    return results.web?.results?.[0] || null;
  }
  
  async getTopResults(query: string, limit: number = 5): Promise < BraveSearchResult[] > {
    const results = await this.searchWeb({ query, count: limit });
    return results.web?.results || [];
  }
  
  async searchWithSnippet(query: string, count: number = 10): Promise < Array < { title: string;url: string;snippet: string;source: string } >> {
    const results = await this.searchWeb({ query, count, extra_snippets: true });
    return (results.web?.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
      source: r.profile?.name || r.meta_url?.hostname || 'Unknown',
    }));
  }
  
  async quickAnswer(query: string): Promise < { answer: string;url ? : string } | null > {
    try {
      const results = await this.searchWeb({ query, count: 1, summary: true });
      if (results.summarizer?.summary?.[0]) {
        return {
          answer: results.summarizer.summary[0].answer,
          url: results.web?.results?.[0]?.url,
        };
      }
      return null;
    } catch (error) {
      logger.warn({ error, query }, 'Quick answer search failed');
      return null;
    }
  }
  
  async searchGoggles(query: string, gogglesId: string, count: number = 10): Promise < BraveSearchResponse > {
    return this.searchWeb({ query, count, goggles_id: gogglesId });
  }
  
  async getSpellcheck(query: string): Promise < string | null > {
    try {
      const results = await this.searchWeb({ query, count: 1, spellcheck: true });
      return results.query?.altered || null;
    } catch (error) {
      return null;
    }
  }
}