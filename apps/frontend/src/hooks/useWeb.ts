// apps/frontend/src/hooks/useWeb.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';

// ============================================
// Types
// ============================================

export type WebSearchProvider = 'brave' | 'perplexity';
export type SearchFreshness = 'past_day' | 'past_week' | 'past_month' | 'past_year';
export type SafeSearchLevel = 'off' | 'moderate' | 'strict';
export type ResearchDetail = 'concise' | 'detailed' | 'comprehensive';
export type WeatherUnit = 'metric' | 'imperial';
export type WebTab = 'search' | 'weather' | 'news' | 'research' | 'air_quality' | 'compare';

export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  description: string;
  source: string;
  pageAge?: string;
  thumbnail?: {
    src: string;
    width?: number;
    height?: number;
  };
  publishedAt?: Date;
  author?: string;
  language?: string;
  isFamilyFriendly?: boolean;
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  results: WebSearchResult[];
  totalResults: number;
  searchTime?: number;
  provider: WebSearchProvider;
  nextPageToken?: string;
  error?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt: Date;
  author?: string;
  imageUrl?: string;
  category?: string;
}

export interface NewsResponse {
  success: boolean;
  topic: string;
  articles: NewsArticle[];
  totalResults: number;
  freshness?: string;
  error?: string;
}

export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

export interface WeatherCurrent {
  location: string;
  country: string;
  lat: number;
  lon: number;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  visibility: number;
  windSpeed: number;
  windDeg: number;
  windGust?: number;
  clouds: number;
  rain?: number;
  snow?: number;
  condition: string;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  timezone: number;
  dt: number;
}

export interface WeatherForecastItem {
  dt: number;
  date: string;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  pressure: number;
  humidity: number;
  condition: string;
  description: string;
  icon: string;
  windSpeed: number;
  windDeg: number;
  clouds: number;
  rain?: number;
  snow?: number;
  pop: number;
}

export interface WeatherResponse {
  success: boolean;
  location: string;
  country: string;
  lat: number;
  lon: number;
  current: WeatherCurrent;
  forecast: WeatherForecastItem[];
  alerts?: Array<{
    event: string;
    description: string;
    start: Date;
    end: Date;
    severity: string;
  }>;
  error?: string;
}

export interface AirQualityData {
  aqi: number;
  co: number;
  no: number;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3: number;
}

export interface AirQualityResponse {
  success: boolean;
  location: string;
  aqi: number;
  category: 'Good' | 'Fair' | 'Moderate' | 'Poor' | 'Very Poor';
  components: AirQualityData;
  recommendations?: string[];
  error?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
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
  error?: string;
}

export interface WeatherComparisonResult {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  icon: string;
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
  };
  error?: string;
}

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
}

export interface ImageSearchResponse {
  success: boolean;
  query: string;
  images: ImageSearchResult[];
  totalResults: number;
  error?: string;
}

export interface SearchHistoryEntry {
  id: string;
  query: string;
  type: WebTab;
  timestamp: Date;
  resultCount?: number;
}

export interface WebAgentState {
  activeTab: WebTab;
  searchQuery: string;
  weatherLocation: string;
  newsTopic: string;
  researchQuery: string;
  airQualityLocation: string;
  searchResults: WebSearchResult[] | null;
  newsResults: NewsArticle[] | null;
  weatherData: WeatherResponse | null;
  researchResult: ResearchResult | null;
  airQualityData: AirQualityResponse | null;
  searchHistory: SearchHistoryEntry[];
  isLoading: boolean;
  isSearching: boolean;
  isFetching: boolean;
  error: string | null;
}

// ============================================
// Hook
// ============================================

export function useWeb() {
  const { isAuthenticated } = useAuthStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [state, setState] = useState<WebAgentState>({
    activeTab: 'search',
    searchQuery: '',
    weatherLocation: '',
    newsTopic: '',
    researchQuery: '',
    airQualityLocation: '',
    searchResults: null,
    newsResults: null,
    weatherData: null,
    researchResult: null,
    airQualityData: null,
    searchHistory: [],
    isLoading: false,
    isSearching: false,
    isFetching: false,
    error: null,
  });

  // ============================================
  // Web Search
  // ============================================

  const searchWeb = useCallback(async (
    query: string,
    options?: {
      provider?: WebSearchProvider;
      count?: number;
      offset?: number;
      safesearch?: SafeSearchLevel;
      freshness?: SearchFreshness;
      searchLang?: string;
      country?: string;
    }
  ): Promise<WebSearchResponse> => {
    if (!isAuthenticated) {
      return { success: false, query, results: [], totalResults: 0, provider: 'brave', error: 'Not authenticated' };
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState(prev => ({ ...prev, searchQuery: query, isSearching: true, isFetching: true, error: null }));

    try {
      const response = await apiClient.get<WebSearchResponse>('/api/agent/web/search', {
        params: {
          query,
          provider: options?.provider || 'brave',
          count: options?.count || 20,
          offset: options?.offset || 0,
          safesearch: options?.safesearch || 'moderate',
          freshness: options?.freshness,
          searchLang: options?.searchLang,
          country: options?.country,
        },
        signal: controller.signal,
      });

      if (response.success && response.data) {
        const results = response.data.results.map((r: any, idx: number) => ({
          ...r,
          id: r.id || `search-${Date.now()}-${idx}`,
          publishedAt: r.publishedAt ? new Date(r.publishedAt) : undefined,
        }));

        setState(prev => ({
          ...prev,
          searchResults: results,
          isSearching: false,
          isFetching: false,
          searchHistory: [
            {
              id: `history-${Date.now()}`,
              query,
              type: 'search' as WebTab,
              timestamp: new Date(),
              resultCount: results.length,
            },
            ...prev.searchHistory.slice(0, 49),
          ],
        }));

        return { ...response.data, results };
      }

      setState(prev => ({ ...prev, isSearching: false, isFetching: false, error: response.error || 'Search failed' }));
      return { success: false, query, results: [], totalResults: 0, provider: options?.provider || 'brave', error: response.error };
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
        setState(prev => ({ ...prev, isSearching: false, isFetching: false }));
        return { success: false, query, results: [], totalResults: 0, provider: options?.provider || 'brave', error: 'Search cancelled' };
      }

      const message = err instanceof Error ? err.message : 'Search failed';
      setState(prev => ({ ...prev, isSearching: false, isFetching: false, error: message }));
      return { success: false, query, results: [], totalResults: 0, provider: options?.provider || 'brave', error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Get News
  // ============================================

  const getNews = useCallback(async (
    topic: string,
    options?: {
      count?: number;
      freshness?: SearchFreshness;
      country?: string;
      category?: string;
    }
  ): Promise<NewsResponse> => {
    if (!isAuthenticated) {
      return { success: false, topic, articles: [], totalResults: 0, error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, newsTopic: topic, isFetching: true, error: null }));

    try {
      const response = await apiClient.get<NewsResponse>('/api/agent/web/news', {
        params: {
          topic,
          count: options?.count || 20,
          freshness: options?.freshness,
          country: options?.country,
          category: options?.category,
        },
      });

      if (response.success && response.data) {
        const articles = response.data.articles.map((a: any) => ({
          ...a,
          publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
        }));

        setState(prev => ({
          ...prev,
          newsResults: articles,
          isFetching: false,
          searchHistory: [
            {
              id: `history-${Date.now()}`,
              query: topic,
              type: 'news' as WebTab,
              timestamp: new Date(),
              resultCount: articles.length,
            },
            ...prev.searchHistory.slice(0, 49),
          ],
        }));

        return { ...response.data, articles };
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Failed to fetch news' }));
      return { success: false, topic, articles: [], totalResults: 0, error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch news';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, topic, articles: [], totalResults: 0, error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Get Weather
  // ============================================

  const getWeather = useCallback(async (
    location: string,
    options?: {
      days?: number;
      units?: WeatherUnit;
      lang?: string;
    }
  ): Promise<WeatherResponse> => {
    if (!isAuthenticated) {
      return { success: false, location, lat: 0, lon: 0, current: {} as any, forecast: [], error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, weatherLocation: location, isFetching: true, error: null }));

    try {
      const response = await apiClient.get<WeatherResponse>('/api/agent/web/weather', {
        params: {
          location,
          days: options?.days || 7,
          units: options?.units || 'metric',
          lang: options?.lang || 'en',
        },
      });

      if (response.success && response.data) {
        const weatherData: WeatherResponse = {
          ...response.data,
          current: {
            ...response.data.current,
            sunrise: response.data.current.sunrise * 1000,
            sunset: response.data.current.sunset * 1000,
          },
          forecast: response.data.forecast.map((f: any) => ({
            ...f,
            dt: f.dt * 1000,
          })),
          alerts: response.data.alerts?.map((a: any) => ({
            ...a,
            start: new Date(a.start),
            end: new Date(a.end),
          })),
        };

        setState(prev => ({ ...prev, weatherData, isFetching: false }));

        return weatherData;
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Failed to fetch weather' }));
      return { success: false, location, lat: 0, lon: 0, current: {} as any, forecast: [], error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, location, lat: 0, lon: 0, current: {} as any, forecast: [], error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Get Air Quality
  // ============================================

  const getAirQuality = useCallback(async (
    location: string
  ): Promise<AirQualityResponse> => {
    if (!isAuthenticated) {
      return { success: false, location, aqi: 0, category: 'Good', components: {} as AirQualityData, error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, airQualityLocation: location, isFetching: true, error: null }));

    try {
      const response = await apiClient.get<AirQualityResponse>('/api/agent/web/air-quality', {
        params: { location },
      });

      if (response.success && response.data) {
        setState(prev => ({ ...prev, airQualityData: response.data!, isFetching: false }));
        return response.data!;
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Failed to fetch air quality' }));
      return { success: false, location, aqi: 0, category: 'Good', components: {} as any, error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch air quality';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, location, aqi: 0, category: 'Good', components: {} as any, error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Research (Perplexity AI)
  // ============================================

  const research = useCallback(async (
    query: string,
    options?: {
      detail?: ResearchDetail;
      maxTokens?: number;
      temperature?: number;
      searchRecencyFilter?: string;
      returnImages?: boolean;
      returnRelatedQuestions?: boolean;
    }
  ): Promise<ResearchResult> => {
    if (!isAuthenticated) {
      return { success: false, query, answer: '', sources: [], followUpQuestions: [], error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, researchQuery: query, isFetching: true, error: null }));

    try {
      const response = await apiClient.post<ResearchResult>('/api/agent/web/research', {
        query,
        detail: options?.detail || 'detailed',
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        searchRecencyFilter: options?.searchRecencyFilter,
        returnImages: options?.returnImages,
        returnRelatedQuestions: options?.returnRelatedQuestions !== false,
      });

      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          researchResult: response.data!,
          isFetching: false,
          searchHistory: [
            {
              id: `history-${Date.now()}`,
              query,
              type: 'research' as WebTab,
              timestamp: new Date(),
              resultCount: response.data!.sources?.length || 0,
            },
            ...prev.searchHistory.slice(0, 49),
          ],
        }));

        return response.data!;
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Research failed' }));
      return { success: false, query, answer: '', sources: [], followUpQuestions: [], error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Research failed';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, query, answer: '', sources: [], followUpQuestions: [], error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Quick Answer (Concise)
  // ============================================

  const quickAnswer = useCallback(async (
    query: string
  ): Promise<{ answer: string; success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, answer: '', error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const response = await apiClient.post<{ answer: string }>('/api/agent/web/quick-answer', {
        query,
      });

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isFetching: false }));
        return { success: true, answer: response.data.answer };
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Failed to get answer' }));
      return { success: false, answer: '', error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get answer';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, answer: '', error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Search Images
  // ============================================

  const searchImages = useCallback(async (
    query: string,
    options?: {
      count?: number;
      size?: 'small' | 'medium' | 'large' | 'wallpaper';
      safesearch?: SafeSearchLevel;
      offset?: number;
    }
  ): Promise<ImageSearchResponse> => {
    if (!isAuthenticated) {
      return { success: false, query, images: [], totalResults: 0, error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const response = await apiClient.get<ImageSearchResponse>('/api/agent/web/images', {
        params: {
          query,
          count: options?.count || 30,
          size: options?.size,
          safesearch: options?.safesearch || 'moderate',
          offset: options?.offset || 0,
        },
      });

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isFetching: false }));
        return response.data;
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Image search failed' }));
      return { success: false, query, images: [], totalResults: 0, error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image search failed';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, query, images: [], totalResults: 0, error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Compare Weather
  // ============================================

  const compareWeather = useCallback(async (
    locations: string[],
    units: WeatherUnit = 'metric'
  ): Promise<WeatherCompareResponse> => {
    if (!isAuthenticated) {
      return { success: false, locations: [], error: 'Not authenticated' };
    }

    setState(prev => ({ ...prev, isFetching: true, error: null }));

    try {
      const response = await apiClient.post<WeatherCompareResponse>('/api/agent/web/weather-compare', {
        locations,
        units,
      });

      if (response.success && response.data) {
        setState(prev => ({ ...prev, isFetching: false }));
        return response.data;
      }

      setState(prev => ({ ...prev, isFetching: false, error: response.error || 'Weather comparison failed' }));
      return { success: false, locations: [], error: response.error };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Weather comparison failed';
      setState(prev => ({ ...prev, isFetching: false, error: message }));
      return { success: false, locations: [], error: message };
    }
  }, [isAuthenticated]);

  // ============================================
  // Spellcheck / Query Suggestions
  // ============================================

  const getSpellcheck = useCallback(async (
    query: string
  ): Promise<{ original: string; corrected?: string; suggestions?: string[] }> => {
    if (!isAuthenticated) {
      return { original: query };
    }

    try {
      const response = await apiClient.post<{
        original: string;
        corrected?: string;
        suggestions?: string[];
      }>('/api/agent/web/spellcheck', { query });

      if (response.success && response.data) {
        return response.data;
      }

      return { original: query };
    } catch (err) {
      return { original: query };
    }
  }, [isAuthenticated]);

  // ============================================
  // Fact Check
  // ============================================

  const factCheck = useCallback(async (
    claim: string
  ): Promise<{
    claim: string;
    verdict: 'true' | 'false' | 'misleading' | 'unverifiable';
    confidence: number;
    explanation: string;
    sources: string[];
  }> => {
    if (!isAuthenticated) {
      return { claim, verdict: 'unverifiable', confidence: 0, explanation: '', sources: [] };
    }

    try {
      const response = await apiClient.post('/api/agent/web/fact-check', { claim });

      if (response.success && response.data) {
        return response.data;
      }

      return { claim, verdict: 'unverifiable', confidence: 0, explanation: '', sources: [] };
    } catch (err) {
      return { claim, verdict: 'unverifiable', confidence: 0, explanation: '', sources: [] };
    }
  }, [isAuthenticated]);

  // ============================================
  // Summarize Text
  // ============================================

  const summarizeText = useCallback(async (
    text: string,
    maxLength: number = 200
  ): Promise<{ summary: string; originalLength: number; summaryLength: number }> => {
    if (!isAuthenticated) {
      return { summary: text.substring(0, maxLength), originalLength: text.length, summaryLength: Math.min(text.length, maxLength) };
    }

    try {
      const response = await apiClient.post('/api/agent/web/summarize', {
        text,
        maxLength,
      });

      if (response.success && response.data) {
        return response.data;
      }

      return { summary: text.substring(0, maxLength), originalLength: text.length, summaryLength: Math.min(text.length, maxLength) };
    } catch (err) {
      return { summary: text.substring(0, maxLength), originalLength: text.length, summaryLength: Math.min(text.length, maxLength) };
    }
  }, [isAuthenticated]);

  // ============================================
  // Analyze Sentiment
  // ============================================

  const analyzeSentiment = useCallback(async (
    text: string
  ): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; confidence: number; explanation: string }> => {
    if (!isAuthenticated) {
      return { sentiment: 'neutral', confidence: 50, explanation: 'Not authenticated' };
    }

    try {
      const response = await apiClient.post('/api/agent/web/sentiment', { text });

      if (response.success && response.data) {
        return response.data;
      }

      return { sentiment: 'neutral', confidence: 50, explanation: 'Analysis failed' };
    } catch (err) {
      return { sentiment: 'neutral', confidence: 50, explanation: 'Analysis failed' };
    }
  }, [isAuthenticated]);

  // ============================================
  // Tab Management
  // ============================================

  const setActiveTab = useCallback((tab: WebTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  // ============================================
  // Clear Results
  // ============================================

  const clearSearchResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchResults: null,
      searchQuery: '',
    }));
  }, []);

  const clearNewsResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      newsResults: null,
      newsTopic: '',
    }));
  }, []);

  const clearWeatherData = useCallback(() => {
    setState(prev => ({
      ...prev,
      weatherData: null,
      weatherLocation: '',
    }));
  }, []);

  const clearResearchResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      researchResult: null,
      researchQuery: '',
    }));
  }, []);

  const clearAirQualityData = useCallback(() => {
    setState(prev => ({
      ...prev,
      airQualityData: null,
      airQualityLocation: '',
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState({
      activeTab: 'search',
      searchQuery: '',
      weatherLocation: '',
      newsTopic: '',
      researchQuery: '',
      airQualityLocation: '',
      searchResults: null,
      newsResults: null,
      weatherData: null,
      researchResult: null,
      airQualityData: null,
      searchHistory: [],
      isLoading: false,
      isSearching: false,
      isFetching: false,
      error: null,
    });
  }, []);

  // ============================================
  // Clear History
  // ============================================

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, searchHistory: [] }));
  }, []);

  const removeFromHistory = useCallback((historyId: string) => {
    setState(prev => ({
      ...prev,
      searchHistory: prev.searchHistory.filter(h => h.id !== historyId),
    }));
  }, []);

  // ============================================
  // Cancel Request
  // ============================================

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isSearching: false, isFetching: false }));
  }, []);

  // ============================================
  // Cleanup
  // ============================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // Get AQI Category
  // ============================================

  const getAQICategory = useCallback((aqi: number): AirQualityResponse['category'] => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Fair';
    if (aqi <= 150) return 'Moderate';
    if (aqi <= 200) return 'Poor';
    return 'Very Poor';
  }, []);

  // ============================================
  // Get Weather Icon URL
  // ============================================

  const getWeatherIconUrl = useCallback((icon: string, size: '2x' | '4x' = '2x'): string => {
    return `https://openweathermap.org/img/wn/${icon}@${size}.png`;
  }, []);

  // ============================================
  // Format Weather Descriptions
  // ============================================

  const formatWeatherDescription = useCallback((weather: WeatherResponse): string => {
    const temp = weather.current.temperature.toFixed(0);
    const feelsLike = weather.current.feelsLike.toFixed(0);
    const humidity = weather.current.humidity;
    const windSpeed = weather.current.windSpeed.toFixed(0);
    const condition = weather.current.description;
    const units = weather.current.temperature > 50 ? '°F' : '°C';

    return `${condition} • ${temp}${units} (feels like ${feelsLike}${units}) • Humidity: ${humidity}% • Wind: ${windSpeed} m/s`;
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    // State
    ...state,

    // Actions
    searchWeb,
    getNews,
    getWeather,
    getAirQuality,
    research,
    quickAnswer,
    searchImages,
    compareWeather,
    getSpellcheck,
    factCheck,
    summarizeText,
    analyzeSentiment,

    // Tab Management
    setActiveTab,

    // Clear functions
    clearSearchResults,
    clearNewsResults,
    clearWeatherData,
    clearResearchResult,
    clearAirQualityData,
    clearAll,
    cancelRequest,

    // History
    clearHistory,
    removeFromHistory,

    // Utilities
    getAQICategory,
    getWeatherIconUrl,
    formatWeatherDescription,
  };
}

export default useWeb;