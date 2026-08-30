// apps/frontend/src/services/web.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type SearchProvider = 'brave' | 'perplexity';
export type SearchFreshness = 'past_day' | 'past_week' | 'past_month' | 'past_year';
export type SafeSearchLevel = 'off' | 'moderate' | 'strict';
export type ResearchDetail = 'concise' | 'detailed' | 'comprehensive';
export type WeatherUnit = 'metric' | 'imperial';
export type AQICategory = 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor';

// ============================================
// Web Search Types
// ============================================

export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  description: string;
  source: string;
  sourceUrl?: string;
  pageAge?: string;
  thumbnail?: {
    src: string;
    width?: number;
    height?: number;
    original?: string;
    logo?: boolean;
  };
  publishedAt?: Date;
  author?: string;
  language?: string;
  isFamilyFriendly?: boolean;
  extraSnippets?: string[];
}

export interface WebSearchOptions {
  query: string;
  provider?: SearchProvider;
  count?: number;
  offset?: number;
  safesearch?: SafeSearchLevel;
  freshness?: SearchFreshness;
  country?: string;
  searchLang?: string;
  uiLang?: string;
  spellcheck?: boolean;
  extraSnippets?: boolean;
  summary?: boolean;
  gogglesId?: string;
  units?: string;
  resultFilter?: 'web' | 'news' | 'videos' | 'images';
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  searchTimeMs?: number;
  provider: SearchProvider;
  nextPageToken?: string;
  correctedQuery?: string;
  spellcheckOff?: boolean;
  error?: string;
}

// ============================================
// News Types
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  sourceUrl?: string;
  publishedAt: Date;
  updatedAt?: Date;
  author?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  category?: string;
  language?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  readingTimeMinutes?: number;
}

export interface NewsOptions {
  topic: string;
  count?: number;
  freshness?: SearchFreshness;
  country?: string;
  language?: string;
  category?: string;
  source?: string;
  offset?: number;
}

export interface NewsResponse {
  success: boolean;
  topic: string;
  articles: NewsArticle[];
  totalResults: number;
  freshness?: string;
  error?: string;
}

// ============================================
// Weather Types
// ============================================

export interface WeatherLocation {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  localNames?: Record<string, string>;
}

export interface WeatherCurrent {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  seaLevel?: number;
  groundLevel?: number;
  visibility: number;
  windSpeed: number;
  windDeg: number;
  windGust?: number;
  clouds: number;
  rain1h?: number;
  rain3h?: number;
  snow1h?: number;
  snow3h?: number;
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  uvi?: number;
  dewPoint?: number;
}

export interface WeatherForecastItem {
  dt: number;
  dtTxt: string;
  main: {
    temp: number;
    feelsLike: number;
    tempMin: number;
    tempMax: number;
    pressure: number;
    seaLevel?: number;
    groundLevel?: number;
    humidity: number;
    tempKf?: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  clouds: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  visibility: number;
  pop: number;
  rain?: { '3h': number };
  snow?: { '3h': number };
  sys?: { pod: string };
}

export interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
  severity: string;
}

export interface WeatherResponse {
  success: boolean;
  location: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  timezoneOffset: number;
  current: WeatherCurrent;
  hourly?: WeatherForecastItem[];
  daily?: Array<{
    dt: number;
    sunrise: number;
    sunset: number;
    moonrise: number;
    moonset: number;
    moonPhase: number;
    summary: string;
    temp: {
      day: number;
      min: number;
      max: number;
      night: number;
      eve: number;
      morn: number;
    };
    feelsLike: {
      day: number;
      night: number;
      eve: number;
      morn: number;
    };
    pressure: number;
    humidity: number;
    dewPoint: number;
    windSpeed: number;
    windDeg: number;
    windGust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: number;
    pop: number;
    rain?: number;
    snow?: number;
    uvi: number;
  }>;
  alerts?: WeatherAlert[];
  error?: string;
}

export interface WeatherForecastResponse {
  success: boolean;
  location: string;
  country: string;
  lat: number;
  lon: number;
  forecasts: WeatherForecastItem[];
  cnt: number;
  error?: string;
}

// ============================================
// Air Quality Types
// ============================================

export interface AirQualityComponents {
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3: number;
}

export interface AirQualityData {
  aqi: number;
  components: AirQualityComponents;
  dt: number;
}

export interface AirQualityResponse {
  success: boolean;
  location: string;
  lat: number;
  lon: number;
  aqi: number;
  category: AQICategory;
  components: AirQualityComponents;
  recommendations?: string[];
  healthImplications?: string;
  dominantPollutant?: string;
  error?: string;
}

// ============================================
// Research Types
// ============================================

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
  favicon?: string;
  publishedAt?: Date;
}

export interface ResearchResult {
  success: boolean;
  query: string;
  answer: string;
  sources: ResearchSource[];
  followUpQuestions: string[];
  citations?: string[];
  images?: string[];
  relatedTopics?: string[];
  modelUsed?: string;
  tokensUsed?: number;
  costUsd?: number;
  processingTimeMs?: number;
  error?: string;
}

export interface ResearchOptions {
  query: string;
  detail?: ResearchDetail;
  maxTokens?: number;
  temperature?: number;
  searchRecencyFilter?: 'month' | 'week' | 'day' | 'hour';
  searchDomainFilter?: string[];
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ============================================
// Weather Compare Types
// ============================================

export interface WeatherComparisonResult {
  location: string;
  country: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  sunrise: number;
  sunset: number;
  error?: string;
}

export interface WeatherCompareResponse {
  success: boolean;
  locations: WeatherComparisonResult[];
  comparison?: {
    warmest: string;
    coldest: string;
    mostHumid: string;
    windiest: string;
    bestOutdoor: string;
    mostUnstable: string;
    cleanestAir: string;
  };
  error?: string;
}

// ============================================
// Image Search Types
// ============================================

export interface ImageSearchResult {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceUrl: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
  thumbnail?: {
    src: string;
    width: number;
    height: number;
  };
  properties?: {
    url: string;
    placeholder?: string;
  };
  dominantColor?: string;
}

export interface ImageSearchOptions {
  query: string;
  count?: number;
  offset?: number;
  size?: 'small' | 'medium' | 'large' | 'wallpaper';
  safesearch?: SafeSearchLevel;
  color?: string;
  imageType?: 'photo' | 'clipart' | 'lineart' | 'animated';
  freshness?: SearchFreshness;
  license?: 'any' | 'public' | 'share' | 'shareCommercially' | 'modify' | 'modifyCommercially';
}

export interface ImageSearchResponse {
  success: boolean;
  query: string;
  images: ImageSearchResult[];
  totalResults: number;
  error?: string;
}

// ============================================
// Video Search Types
// ============================================

export interface VideoSearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  thumbnailUrl?: string;
  duration?: string;
  durationSeconds?: number;
  views?: number;
  publishedAt?: Date;
  source: string;
  author?: string;
}

export interface VideoSearchResponse {
  success: boolean;
  query: string;
  videos: VideoSearchResult[];
  totalResults: number;
  error?: string;
}

// ============================================
// Quick Answer Types
// ============================================

export interface QuickAnswerResponse {
  success: boolean;
  query: string;
  answer: string;
  sourceUrl?: string;
  sourceTitle?: string;
  confidence: number;
  modelUsed?: string;
  processingTimeMs?: number;
  error?: string;
}

// ============================================
// Fact Check Types
// ============================================

export interface FactCheckResult {
  claim: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverifiable' | 'partially_true' | 'mostly_true' | 'mostly_false';
  confidence: number;
  explanation: string;
  sources: Array<{
    title: string;
    url: string;
    publisher?: string;
    date?: Date;
  }>;
  corrections?: string[];
}

// ============================================
// Text Analysis Types
// ============================================

export interface SummarizeOptions {
  text: string;
  maxLength?: number;
  format?: 'paragraph' | 'bullet_points' | 'key_points' | 'headline';
  preserveQuotes?: boolean;
  language?: string;
}

export interface SummarizeResponse {
  success: boolean;
  summary: string;
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
  keyPoints?: string[];
  error?: string;
}

export interface SentimentResponse {
  success: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    negative: number;
    neutral: number;
    compound?: number;
  };
  explanation?: string;
  error?: string;
}

export interface EntityExtractionResponse {
  success: boolean;
  entities: {
    people: Array<{ name: string; count: number }>;
    organizations: Array<{ name: string; count: number }>;
    locations: Array<{ name: string; count: number }>;
    dates: string[];
    emails: string[];
    urls: string[];
    phoneNumbers: string[];
    money?: Array<{ amount: number; currency: string }>;
    products?: string[];
    events?: string[];
  };
  error?: string;
}

// ============================================
// Web Service
// ============================================

class WebService {
  // ============================================
  // Web Search
  // ============================================

  static async searchWeb(options: WebSearchOptions): Promise<WebSearchResponse> {
    const params: Record<string, any> = {
      query: options.query,
      provider: options.provider || 'brave',
      count: options.count || 20,
      offset: options.offset || 0,
      safesearch: options.safesearch || 'moderate',
      freshness: options.freshness,
      country: options.country,
      searchLang: options.searchLang,
      uiLang: options.uiLang,
      spellcheck: options.spellcheck !== false,
      extraSnippets: options.extraSnippets,
      summary: options.summary,
      gogglesId: options.gogglesId,
      units: options.units,
      resultFilter: options.resultFilter,
    };

    // Clean undefined params
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    const response = await apiClient.get<WebSearchResponse>(
      '/api/agent/web/search',
      { params }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        results: (response.data.results || []).map(WebService.transformSearchResult),
      };
    }

    throw new Error(response.error || 'Failed to search');
  }

  static async quickSearch(query: string, count: number = 5): Promise<WebSearchResult[]> {
    const response = await this.searchWeb({ query, count });
    return response.results.slice(0, count);
  }

  static async searchWithSnippets(query: string, count: number = 10): Promise<WebSearchResult[]> {
    const response = await this.searchWeb({ query, count, extraSnippets: true });
    return response.results;
  }

  // ============================================
  // News
  // ============================================

  static async getNews(options: NewsOptions): Promise<NewsResponse> {
    const response = await apiClient.get<NewsResponse>(
      '/api/agent/web/news',
      {
        params: {
          topic: options.topic,
          count: options.count || 20,
          freshness: options.freshness,
          country: options.country,
          language: options.language,
          category: options.category,
          source: options.source,
          offset: options.offset,
        },
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        articles: (response.data.articles || []).map(WebService.transformNewsArticle),
      };
    }

    throw new Error(response.error || 'Failed to get news');
  }

  static async getLatestHeadlines(count: number = 10, country?: string): Promise<NewsArticle[]> {
    const response = await this.getNews({ topic: 'headlines', count, country });
    return response.articles;
  }

  static async getNewsByCategory(category: string, count: number = 10): Promise<NewsArticle[]> {
    const response = await this.getNews({ topic: '', category, count });
    return response.articles;
  }

  // ============================================
  // Weather
  // ============================================

  static async getWeather(
    location: string,
    options?: {
      units?: WeatherUnit;
      lang?: string;
    }
  ): Promise<WeatherResponse> {
    const response = await apiClient.get<WeatherResponse>(
      '/api/agent/web/weather',
      {
        params: {
          location,
          units: options?.units || 'metric',
          lang: options?.lang || 'en',
        },
      }
    );

    if (response.success && response.data) {
      return WebService.transformWeatherResponse(response.data);
    }

    throw new Error(response.error || 'Failed to get weather');
  }

  static async getWeatherByCoordinates(
    lat: number,
    lon: number,
    options?: { units?: WeatherUnit; lang?: string }
  ): Promise<WeatherResponse> {
    const response = await apiClient.get<WeatherResponse>(
      '/api/agent/web/weather/coordinates',
      {
        params: {
          lat,
          lon,
          units: options?.units || 'metric',
          lang: options?.lang || 'en',
        },
      }
    );

    if (response.success && response.data) {
      return WebService.transformWeatherResponse(response.data);
    }

    throw new Error(response.error || 'Failed to get weather');
  }

  static async getWeatherForecast(
    location: string,
    days: number = 5,
    units: WeatherUnit = 'metric'
  ): Promise<WeatherForecastResponse> {
    const response = await apiClient.get<WeatherForecastResponse>(
      '/api/agent/web/weather/forecast',
      {
        params: {
          location,
          days: Math.min(days, 16),
          units,
        },
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        forecasts: response.data.forecasts.map(f => ({
          ...f,
          dt: f.dt * 1000,
        })),
      };
    }

    throw new Error(response.error || 'Failed to get forecast');
  }

  static async getWeatherAlerts(location: string): Promise<WeatherAlert[]> {
    try {
      const response = await apiClient.get<{ alerts: WeatherAlert[] }>(
        '/api/agent/web/weather/alerts',
        { params: { location } }
      );

      if (response.success && response.data) {
        return response.data.alerts;
      }
      return [];
    } catch {
      return [];
    }
  }

  // ============================================
  // Air Quality
  // ============================================

  static async getAirQuality(location: string): Promise<AirQualityResponse> {
    const response = await apiClient.get<AirQualityResponse>(
      '/api/agent/web/air-quality',
      { params: { location } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get air quality');
  }

  static async getAirQualityByCoords(
    lat: number,
    lon: number
  ): Promise<AirQualityResponse> {
    const response = await apiClient.get<AirQualityResponse>(
      '/api/agent/web/air-quality/coordinates',
      { params: { lat, lon } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get air quality');
  }

  // ============================================
  // Research (Perplexity AI)
  // ============================================

  static async research(options: ResearchOptions): Promise<ResearchResult> {
    const response = await apiClient.post<ResearchResult>(
      '/api/agent/web/research',
      {
        query: options.query,
        detail: options.detail || 'detailed',
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        searchRecencyFilter: options.searchRecencyFilter,
        searchDomainFilter: options.searchDomainFilter,
        returnImages: options.returnImages,
        returnRelatedQuestions: options.returnRelatedQuestions !== false,
        topP: options.topP,
        frequencyPenalty: options.frequencyPenalty,
        presencePenalty: options.presencePenalty,
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to research');
  }

  static async researchWithStream(
    options: ResearchOptions,
    onChunk: (chunk: string) => void
  ): Promise<ResearchResult> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${apiUrl}/api/agent/web/research/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...options, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Research stream failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let finalResult: ResearchResult | null = null;

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
          } catch (e) {}
        }
      }
    }

    if (finalResult) return finalResult;
    throw new Error('Stream ended without completion');
  }

  static async quickAnswer(query: string): Promise<QuickAnswerResponse> {
    const response = await apiClient.post<QuickAnswerResponse>(
      '/api/agent/web/quick-answer',
      { query }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get quick answer');
  }

  static async factCheck(claim: string): Promise<FactCheckResult> {
    const response = await apiClient.post<FactCheckResult>(
      '/api/agent/web/fact-check',
      { claim }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to fact check');
  }

  // ============================================
  // Weather Comparison
  // ============================================

  static async compareWeather(
    locations: string[],
    units: WeatherUnit = 'metric'
  ): Promise<WeatherCompareResponse> {
    const response = await apiClient.post<WeatherCompareResponse>(
      '/api/agent/web/weather/compare',
      { locations, units }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to compare weather');
  }

  // ============================================
  // Image Search
  // ============================================

  static async searchImages(options: ImageSearchOptions): Promise<ImageSearchResponse> {
    const response = await apiClient.get<ImageSearchResponse>(
      '/api/agent/web/images',
      {
        params: {
          query: options.query,
          count: options.count || 30,
          offset: options.offset || 0,
          size: options.size,
          safesearch: options.safesearch || 'moderate',
          color: options.color,
          imageType: options.imageType,
          freshness: options.freshness,
          license: options.license,
        },
      }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to search images');
  }

  // ============================================
  // Video Search
  // ============================================

  static async searchVideos(
    query: string,
    count: number = 20
  ): Promise<VideoSearchResponse> {
    const response = await apiClient.get<VideoSearchResponse>(
      '/api/agent/web/videos',
      { params: { query, count } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to search videos');
  }

  // ============================================
  // Text Analysis
  // ============================================

  static async summarizeText(options: SummarizeOptions): Promise<SummarizeResponse> {
    const response = await apiClient.post<SummarizeResponse>(
      '/api/agent/web/summarize',
      options
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to summarize');
  }

  static async analyzeSentiment(text: string): Promise<SentimentResponse> {
    const response = await apiClient.post<SentimentResponse>(
      '/api/agent/web/sentiment',
      { text }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to analyze sentiment');
  }

  static async extractEntities(text: string): Promise<EntityExtractionResponse> {
    const response = await apiClient.post<EntityExtractionResponse>(
      '/api/agent/web/extract-entities',
      { text }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to extract entities');
  }

  // ============================================
  // Spellcheck
  // ============================================

  static async checkSpelling(
    query: string
  ): Promise<{ original: string; corrected?: string; suggestions: string[] }> {
    const response = await apiClient.post<{
      original: string;
      corrected?: string;
      suggestions: string[];
    }>('/api/agent/web/spellcheck', { query });

    if (response.success && response.data) {
      return response.data;
    }

    return { original: query, suggestions: [] };
  }

  // ============================================
  // Geocoding
  // ============================================

  static async geocode(location: string): Promise<WeatherLocation[]> {
    const response = await apiClient.get<WeatherLocation[]>(
      '/api/agent/web/geocode',
      { params: { location } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to geocode');
  }

  static async reverseGeocode(
    lat: number,
    lon: number
  ): Promise<WeatherLocation> {
    const response = await apiClient.get<WeatherLocation>(
      '/api/agent/web/reverse-geocode',
      { params: { lat, lon } }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to reverse geocode');
  }

  // ============================================
  // URL Preview
  // ============================================

  static async getUrlPreview(url: string): Promise<{
    title: string;
    description: string;
    imageUrl?: string;
    favicon?: string;
    siteName?: string;
    type?: string;
  }> {
    const response = await apiClient.post<{
      title: string;
      description: string;
      imageUrl?: string;
      favicon?: string;
      siteName?: string;
      type?: string;
    }>('/api/agent/web/url-preview', { url });

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get URL preview');
  }

  // ============================================
  // History
  // ============================================

  static async getSearchHistory(
    limit: number = 50
  ): Promise<Array<{
    id: string;
    query: string;
    type: string;
    timestamp: Date;
    resultCount?: number;
  }>> {
    const response = await apiClient.get<{
      history: Array<{
        id: string;
        query: string;
        type: string;
        timestamp: string;
        resultCount?: number;
      }>;
    }>('/api/agent/web/history', { params: { limit } });

    if (response.success && response.data) {
      return response.data.history.map(h => ({
        ...h,
        timestamp: new Date(h.timestamp),
      }));
    }

    throw new Error(response.error || 'Failed to get search history');
  }

  static async clearSearchHistory(): Promise<void> {
    const response = await apiClient.delete('/api/agent/web/history');
    if (!response.success) {
      throw new Error(response.error || 'Failed to clear history');
    }
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformSearchResult(result: any): WebSearchResult {
    return {
      id: result.id || `result-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: result.title || '',
      url: result.url || '',
      snippet: result.snippet || result.description || '',
      description: result.description || result.snippet || '',
      source: result.source || result.profile?.name || new URL(result.url || 'https://example.com').hostname || 'Unknown',
      sourceUrl: result.sourceUrl || result.profile?.url,
      pageAge: result.pageAge || result.age,
      thumbnail: result.thumbnail,
      publishedAt: result.publishedAt ? new Date(result.publishedAt) : undefined,
      author: result.author,
      language: result.language,
      isFamilyFriendly: result.isFamilyFriendly,
      extraSnippets: result.extraSnippets || result.extra_snippets,
    };
  }

  private static transformNewsArticle(article: any): NewsArticle {
    return {
      id: article.id || `news-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: article.title || '',
      url: article.url || '',
      snippet: article.snippet || article.description || '',
      source: article.source || 'Unknown',
      sourceUrl: article.sourceUrl,
      publishedAt: new Date(article.publishedAt || Date.now()),
      updatedAt: article.updatedAt ? new Date(article.updatedAt) : undefined,
      author: article.author,
      imageUrl: article.imageUrl || article.thumbnail?.src,
      thumbnailUrl: article.thumbnailUrl || article.thumbnail?.src,
      category: article.category,
      language: article.language,
      sentiment: article.sentiment,
      readingTimeMinutes: article.readingTimeMinutes || Math.ceil((article.snippet?.length || 0) / 1000),
    };
  }

  private static transformWeatherResponse(data: any): WeatherResponse {
    return {
      ...data,
      current: {
        ...data.current,
        sunrise: data.current.sunrise * 1000,
        sunset: data.current.sunset * 1000,
      },
      hourly: data.hourly?.map((h: any) => ({
        ...h,
        dt: h.dt * 1000,
        sunrise: h.sunrise ? h.sunrise * 1000 : undefined,
        sunset: h.sunset ? h.sunset * 1000 : undefined,
      })),
      daily: data.daily?.map((d: any) => ({
        ...d,
        dt: d.dt * 1000,
        sunrise: d.sunrise * 1000,
        sunset: d.sunset * 1000,
        moonrise: d.moonrise * 1000,
        moonset: d.moonset * 1000,
      })),
      alerts: data.alerts?.map((a: any) => ({
        ...a,
        start: a.start * 1000,
        end: a.end * 1000,
      })),
    };
  }

  // ============================================
  // Utility
  // ============================================

  static getAQICategory(aqi: number): AQICategory {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Fair';
    if (aqi <= 150) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    return 'Very Poor';
  }

  static getAQIColor(aqi: number): string {
    if (aqi <= 50) return '#10b981';
    if (aqi <= 100) return '#f59e0b';
    if (aqi <= 150) return '#f97316';
    if (aqi <= 200) return '#ef4444';
    return '#7f1d1d';
  }

  static getAQIDescription(category: AQICategory): string {
    const descriptions: Record<AQICategory, string> = {
      'Good': 'Air quality is satisfactory, and air pollution poses little or no risk.',
      'Fair': 'Air quality is acceptable. However, there may be a risk for some people.',
      'Moderate': 'Members of sensitive groups may experience health effects.',
      'Poor': 'Some members of the general public may experience health effects.',
      'Very Poor': 'Health alert: The risk of health effects is increased for everyone.',
    };
    return descriptions[category];
  }

  static getWeatherIconUrl(icon: string, size: '2x' | '4x' = '2x'): string {
    return `https://openweathermap.org/img/wn/${icon}@${size}.png`;
  }

  static getWindDirection(deg: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
  }

  static formatTemperature(temp: number, units: WeatherUnit): string {
    const symbol = units === 'imperial' ? '°F' : '°C';
    return `${Math.round(temp)}${symbol}`;
  }

  static getUVIndexDescription(uvi: number): string {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Moderate';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'Very High';
    return 'Extreme';
  }

  static getUVIndexColor(uvi: number): string {
    if (uvi <= 2) return '#10b981';
    if (uvi <= 5) return '#f59e0b';
    if (uvi <= 7) return '#f97316';
    if (uvi <= 10) return '#ef4444';
    return '#7f1d1d';
  }

  static extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  static isUrl(text: string): boolean {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  }
}

export default WebService;