// enterprise-ai-agent-platform/apps/frontend/src/store/web.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export type SearchProvider = 'brave' | 'perplexity' | 'google';
export type WebTab = 'search' | 'weather' | 'news' | 'research' | 'images' | 'videos';
export type WeatherUnit = 'metric' | 'imperial';
export type ResearchDetail = 'concise' | 'detailed' | 'comprehensive';
export type SafeSearch = 'off' | 'moderate' | 'strict';
export type Freshness = 'past_day' | 'past_week' | 'past_month' | 'past_year';
export type ImageSize = 'small' | 'medium' | 'large' | 'wallpaper' | 'any';
export type ImageType = 'photo' | 'clipart' | 'line' | 'animated' | 'any';
export type VideoDuration = 'short' | 'medium' | 'long' | 'any';
export type VideoResolution = '360p' | '480p' | '720p' | '1080p' | '4k' | 'any';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: Date;
  author?: string;
  thumbnail?: string;
  favicon?: string;
  language?: string;
  score?: number;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalResults?: number;
  nextPageToken?: string;
  searchTimeMs?: number;
  provider: SearchProvider;
  correctedQuery?: string;
  error?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: Date;
  author?: string;
  imageUrl?: string;
  category?: string;
}

export interface NewsResponse {
  success: boolean;
  topic: string;
  articles: NewsArticle[];
  totalResults?: number;
  error?: string;
}

export interface WeatherCurrent {
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  windGust?: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  icon?: string;
  clouds: number;
}

export interface WeatherForecastItem {
  date: string;
  timestamp: number;
  highTemp: number;
  lowTemp: number;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  icon?: string;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  clouds: number;
}

export interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

export interface WeatherResponse {
  success: boolean;
  location?: string;
  country?: string;
  coordinates?: { lat: number; lon: number };
  current?: WeatherCurrent;
  forecast?: WeatherForecastItem[];
  alerts?: WeatherAlert[];
  error?: string;
}

export interface AirQualityResponse {
  success: boolean;
  location?: string;
  aqi: number;
  category: string;
  components?: {
    pm2_5?: number;
    pm10?: number;
    o3?: number;
    no2?: number;
    so2?: number;
    co?: number;
  };
  error?: string;
}

export interface WeatherComparisonItem {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon?: string;
}

export interface WeatherComparisonResponse {
  success: boolean;
  locations: WeatherComparisonItem[];
  error?: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  relevance?: number;
}

export interface ResearchResponse {
  success: boolean;
  query: string;
  answer: string;
  sources: ResearchSource[];
  followUpQuestions?: string[];
  images?: string[];
  citations?: string[];
  confidence?: number;
  error?: string;
}

export interface ImageSearchItem {
  id: string;
  title: string;
  url: string;
  source: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  size?: number;
  format?: string;
}

export interface ImageSearchResponse {
  success: boolean;
  query: string;
  images: ImageSearchItem[];
  totalResults?: number;
  error?: string;
}

export interface VideoSearchItem {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  source: string;
  duration: string;
  publishedAt?: Date;
  description?: string;
  views?: number;
}

export interface VideoSearchResponse {
  success: boolean;
  query: string;
  videos: VideoSearchItem[];
  totalResults?: number;
  error?: string;
}

export interface WeatherLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  isFavorite: boolean;
}

export interface SearchHistory {
  id: string;
  query: string;
  type: WebTab;
  timestamp: Date;
  provider: SearchProvider;
}

export interface WebViewerState {
  url: string;
  title: string;
  isOpen: boolean;
  isLoading: boolean;
}

// ============================================
// Store State Interface
// ============================================

interface WebState {
  // ============================================
  // Tab State
  // ============================================
  activeTab: WebTab;
  previousTab: WebTab | null;

  // ============================================
  // Search State
  // ============================================
  searchQuery: string;
  searchProvider: SearchProvider;
  searchSafeSearch: SafeSearch;
  searchFreshness: Freshness;
  searchResults: SearchResult[];
  searchTotalResults: number;
  searchNextPageToken: string | null;
  isSearching: boolean;
  searchError: string | null;
  searchHistory: SearchHistory[];

  // ============================================
  // Weather State
  // ============================================
  weatherLocation: string;
  weatherUnit: WeatherUnit;
  weatherData: WeatherResponse | null;
  weatherForecastDays: number;
  airQualityData: AirQualityResponse | null;
  weatherLocations: WeatherLocation[];
  weatherComparisonLocations: string[];
  weatherComparisonData: WeatherComparisonResponse | null;
  isLoadingWeather: boolean;
  weatherError: string | null;

  // ============================================
  // News State
  // ============================================
  newsTopic: string;
  newsFreshness: Freshness;
  newsCountry: string;
  newsArticles: NewsArticle[];
  newsTotalResults: number;
  isLoadingNews: boolean;
  newsError: string | null;

  // ============================================
  // Research State
  // ============================================
  researchQuery: string;
  researchDetail: ResearchDetail;
  researchData: ResearchResponse | null;
  isResearching: boolean;
  researchError: string | null;

  // ============================================
  // Image Search State
  // ============================================
  imageQuery: string;
  imageSize: ImageSize;
  imageType: ImageType;
  imageResults: ImageSearchItem[];
  imageTotalResults: number;
  isSearchingImages: boolean;
  imageError: string | null;

  // ============================================
  // Video Search State
  // ============================================
  videoQuery: string;
  videoDuration: VideoDuration;
  videoResolution: VideoResolution;
  videoResults: VideoSearchItem[];
  videoTotalResults: number;
  isSearchingVideos: boolean;
  videoError: string | null;

  // ============================================
  // Web Viewer State
  // ============================================
  webViewer: WebViewerState;

  // ============================================
  // UI State
  // ============================================
  isLoading: boolean;
  error: string | null;
  showHistory: boolean;
  showSettings: boolean;

  // ============================================
  // Computed
  // ============================================
  getSearchResultCount: () => number;
  getNewsArticleCount: () => number;
  getWeatherComparisonCount: () => number;
  getFavoriteLocations: () => WeatherLocation[];
  getRecentSearches: (limit?: number) => SearchHistory[];

  // ============================================
  // Actions - Tab Management
  // ============================================
  setActiveTab: (tab: WebTab) => void;
  switchToPreviousTab: () => void;

  // ============================================
  // Actions - Web Search
  // ============================================
  searchWeb: (query?: string) => Promise<void>;
  searchMoreResults: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchProvider: (provider: SearchProvider) => void;
  setSearchSafeSearch: (safeSearch: SafeSearch) => void;
  setSearchFreshness: (freshness: Freshness) => void;
  clearSearchResults: () => void;

  // ============================================
  // Actions - Weather
  // ============================================
  fetchWeather: (location?: string) => Promise<void>;
  fetchAirQuality: (location?: string) => Promise<void>;
  fetchWeatherComparison: (locations: string[]) => Promise<void>;
  setWeatherLocation: (location: string) => void;
  setWeatherUnit: (unit: WeatherUnit) => void;
  setWeatherForecastDays: (days: number) => void;
  addWeatherLocation: (location: WeatherLocation) => void;
  removeWeatherLocation: (locationId: string) => void;
  toggleFavoriteLocation: (locationId: string) => void;
  addComparisonLocation: (location: string) => void;
  removeComparisonLocation: (location: string) => void;
  clearWeather: () => void;

  // ============================================
  // Actions - News
  // ============================================
  fetchNews: (topic?: string) => Promise<void>;
  setNewsTopic: (topic: string) => void;
  setNewsFreshness: (freshness: Freshness) => void;
  setNewsCountry: (country: string) => void;
  clearNews: () => void;

  // ============================================
  // Actions - Research
  // ============================================
  researchTopic: (query?: string) => Promise<void>;
  setResearchQuery: (query: string) => void;
  setResearchDetail: (detail: ResearchDetail) => void;
  clearResearch: () => void;

  // ============================================
  // Actions - Image Search
  // ============================================
  searchImages: (query?: string) => Promise<void>;
  setImageQuery: (query: string) => void;
  setImageSize: (size: ImageSize) => void;
  setImageType: (type: ImageType) => void;
  clearImageResults: () => void;

  // ============================================
  // Actions - Video Search
  // ============================================
  searchVideos: (query?: string) => Promise<void>;
  setVideoQuery: (query: string) => void;
  setVideoDuration: (duration: VideoDuration) => void;
  setVideoResolution: (resolution: VideoResolution) => void;
  clearVideoResults: () => void;

  // ============================================
  // Actions - Web Viewer
  // ============================================
  openWebViewer: (url: string, title?: string) => void;
  closeWebViewer: () => void;
  setWebViewerLoading: (loading: boolean) => void;

  // ============================================
  // Actions - History
  // ============================================
  fetchSearchHistory: () => Promise<void>;
  clearSearchHistory: () => Promise<void>;
  deleteHistoryItem: (historyId: string) => Promise<void>;
  toggleHistory: () => void;

  // ============================================
  // Actions - UI State
  // ============================================
  toggleSettings: () => void;
  clearAllResults: () => void;
  clearError: () => void;
  resetState: () => void;
}

// ============================================
// Helper Functions
// ============================================

const generateId = (): string => {
  return `web_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// ============================================
// Initial State
// ============================================

const initialState = {
  activeTab: 'search' as WebTab,
  previousTab: null as WebTab | null,

  // Search
  searchQuery: '',
  searchProvider: 'brave' as SearchProvider,
  searchSafeSearch: 'moderate' as SafeSearch,
  searchFreshness: 'past_month' as Freshness,
  searchResults: [] as SearchResult[],
  searchTotalResults: 0,
  searchNextPageToken: null as string | null,
  isSearching: false,
  searchError: null as string | null,
  searchHistory: [] as SearchHistory[],

  // Weather
  weatherLocation: 'New York',
  weatherUnit: 'metric' as WeatherUnit,
  weatherData: null as WeatherResponse | null,
  weatherForecastDays: 5,
  airQualityData: null as AirQualityResponse | null,
  weatherLocations: [
    { id: '1', name: 'New York', lat: 40.7128, lon: -74.006, country: 'US', isFavorite: true },
    { id: '2', name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB', isFavorite: false },
    { id: '3', name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP', isFavorite: false },
  ] as WeatherLocation[],
  weatherComparisonLocations: [] as string[],
  weatherComparisonData: null as WeatherComparisonResponse | null,
  isLoadingWeather: false,
  weatherError: null as string | null,

  // News
  newsTopic: 'technology',
  newsFreshness: 'past_day' as Freshness,
  newsCountry: 'us',
  newsArticles: [] as NewsArticle[],
  newsTotalResults: 0,
  isLoadingNews: false,
  newsError: null as string | null,

  // Research
  researchQuery: '',
  researchDetail: 'detailed' as ResearchDetail,
  researchData: null as ResearchResponse | null,
  isResearching: false,
  researchError: null as string | null,

  // Image Search
  imageQuery: '',
  imageSize: 'any' as ImageSize,
  imageType: 'any' as ImageType,
  imageResults: [] as ImageSearchItem[],
  imageTotalResults: 0,
  isSearchingImages: false,
  imageError: null as string | null,

  // Video Search
  videoQuery: '',
  videoDuration: 'any' as VideoDuration,
  videoResolution: 'any' as VideoResolution,
  videoResults: [] as VideoSearchItem[],
  videoTotalResults: 0,
  isSearchingVideos: false,
  videoError: null as string | null,

  // Web Viewer
  webViewer: {
    url: '',
    title: '',
    isOpen: false,
    isLoading: false,
  } as WebViewerState,

  // UI
  isLoading: false,
  error: null as string | null,
  showHistory: false,
  showSettings: false,
};

// ============================================
// Store Implementation
// ============================================

export const useWebStore = create<WebState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // Computed Getters
        // ============================================

        getSearchResultCount: () => get().searchResults.length,
        getNewsArticleCount: () => get().newsArticles.length,
        getWeatherComparisonCount: () => get().weatherComparisonLocations.length,
        getFavoriteLocations: () => get().weatherLocations.filter(l => l.isFavorite),
        getRecentSearches: (limit: number = 10) => {
          return get().searchHistory
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        },

        // ============================================
        // Tab Management Actions
        // ============================================

        setActiveTab: (tab: WebTab) => {
          set(state => ({
            activeTab: tab,
            previousTab: state.activeTab,
          }));
        },

        switchToPreviousTab: () => {
          const { previousTab } = get();
          if (previousTab) {
            set({ activeTab: previousTab, previousTab: null });
          }
        },

        // ============================================
        // Web Search Actions
        // ============================================

        searchWeb: async (query?: string) => {
          const state = get();
          const searchQuery = query || state.searchQuery;

          if (!searchQuery.trim()) {
            set({ searchError: 'Please enter a search query' });
            return;
          }

          set({ isSearching: true, searchError: null, searchResults: [] });

          try {
            const response = await apiClient.get<SearchResponse>('/api/agent/web/search', {
              query: searchQuery,
              count: 20,
              safesearch: state.searchSafeSearch,
              freshness: state.searchFreshness,
              provider: state.searchProvider,
            });

            if (response.success && response.data) {
              set({
                searchResults: response.data.results || [],
                searchTotalResults: response.data.totalResults || 0,
                searchNextPageToken: response.data.nextPageToken || null,
                searchQuery,
                isSearching: false,
              });

              // Save to history
              set(state => ({
                searchHistory: [
                  {
                    id: generateId(),
                    query: searchQuery,
                    type: 'search',
                    timestamp: new Date(),
                    provider: state.searchProvider,
                  },
                  ...state.searchHistory.slice(0, 99),
                ],
              }));
            } else {
              set({
                isSearching: false,
                searchError: response.error || 'Failed to search',
              });
            }
          } catch (err) {
            set({
              isSearching: false,
              searchError: err instanceof Error ? err.message : 'Failed to search',
            });
          }
        },

        searchMoreResults: async () => {
          const { searchNextPageToken, isSearching, searchProvider, searchQuery } = get();
          if (!searchNextPageToken || isSearching) return;

          set({ isSearching: true });

          try {
            const response = await apiClient.get<SearchResponse>('/api/agent/web/search', {
              query: searchQuery,
              count: 20,
              pageToken: searchNextPageToken,
              provider: searchProvider,
            });

            if (response.success && response.data) {
              set(state => ({
                searchResults: [...state.searchResults, ...(response.data?.results || [])],
                searchNextPageToken: response.data?.nextPageToken || null,
                searchTotalResults: response.data?.totalResults || state.searchTotalResults,
                isSearching: false,
              }));
            } else {
              set({ isSearching: false });
            }
          } catch (err) {
            set({ isSearching: false });
          }
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),
        setSearchProvider: (provider: SearchProvider) => set({ searchProvider: provider }),
        setSearchSafeSearch: (safeSearch: SafeSearch) => set({ searchSafeSearch: safeSearch }),
        setSearchFreshness: (freshness: Freshness) => set({ searchFreshness: freshness }),
        clearSearchResults: () => set({
          searchResults: [],
          searchTotalResults: 0,
          searchNextPageToken: null,
          searchQuery: '',
          searchError: null,
        }),

        // ============================================
        // Weather Actions
        // ============================================

        fetchWeather: async (location?: string) => {
          const state = get();
          const loc = location || state.weatherLocation;

          if (!loc.trim()) {
            set({ weatherError: 'Please enter a location' });
            return;
          }

          set({ isLoadingWeather: true, weatherError: null, weatherLocation: loc });

          try {
            const response = await apiClient.get<WeatherResponse>('/api/agent/web/weather', {
              location: loc,
              days: state.weatherForecastDays,
              units: state.weatherUnit,
            });

            if (response.success && response.data) {
              set({
                weatherData: response.data,
                isLoadingWeather: false,
              });
            } else {
              set({
                isLoadingWeather: false,
                weatherError: response.error || 'Failed to fetch weather',
              });
            }
          } catch (err) {
            set({
              isLoadingWeather: false,
              weatherError: err instanceof Error ? err.message : 'Failed to fetch weather',
            });
          }
        },

        fetchAirQuality: async (location?: string) => {
          const state = get();
          const loc = location || state.weatherLocation;

          try {
            const response = await apiClient.get<AirQualityResponse>('/api/agent/web/air-quality', {
              location: loc,
            });

            if (response.success && response.data) {
              set({ airQualityData: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch air quality:', err);
          }
        },

        fetchWeatherComparison: async (locations: string[]) => {
          set({ isLoadingWeather: true, weatherError: null });

          try {
            const response = await apiClient.post<WeatherComparisonResponse>(
              '/api/agent/web/weather/compare',
              { locations }
            );

            if (response.success && response.data) {
              set({
                weatherComparisonData: response.data,
                isLoadingWeather: false,
              });
            } else {
              set({
                isLoadingWeather: false,
                weatherError: response.error || 'Failed to compare weather',
              });
            }
          } catch (err) {
            set({
              isLoadingWeather: false,
              weatherError: err instanceof Error ? err.message : 'Failed to compare weather',
            });
          }
        },

        setWeatherLocation: (location: string) => set({ weatherLocation: location }),
        setWeatherUnit: (unit: WeatherUnit) => set({ weatherUnit: unit }),
        setWeatherForecastDays: (days: number) => set({ weatherForecastDays: days }),

        addWeatherLocation: (location: WeatherLocation) => {
          set(state => ({
            weatherLocations: [...state.weatherLocations, location],
          }));
        },

        removeWeatherLocation: (locationId: string) => {
          set(state => ({
            weatherLocations: state.weatherLocations.filter(l => l.id !== locationId),
          }));
        },

        toggleFavoriteLocation: (locationId: string) => {
          set(state => ({
            weatherLocations: state.weatherLocations.map(l =>
              l.id === locationId ? { ...l, isFavorite: !l.isFavorite } : l
            ),
          }));
        },

        addComparisonLocation: (location: string) => {
          set(state => ({
            weatherComparisonLocations: [...state.weatherComparisonLocations, location],
          }));
        },

        removeComparisonLocation: (location: string) => {
          set(state => ({
            weatherComparisonLocations: state.weatherComparisonLocations.filter(l => l !== location),
          }));
        },

        clearWeather: () => set({
          weatherData: null,
          airQualityData: null,
          weatherComparisonData: null,
          weatherComparisonLocations: [],
          weatherError: null,
        }),

        // ============================================
        // News Actions
        // ============================================

        fetchNews: async (topic?: string) => {
          const state = get();
          const newsTopic = topic || state.newsTopic;

          if (!newsTopic.trim()) {
            set({ newsError: 'Please enter a topic' });
            return;
          }

          set({ isLoadingNews: true, newsError: null, newsArticles: [], newsTopic });

          try {
            const response = await apiClient.get<NewsResponse>('/api/agent/web/news', {
              topic: newsTopic,
              count: 20,
              freshness: state.newsFreshness,
              country: state.newsCountry,
            });

            if (response.success && response.data) {
              set({
                newsArticles: response.data.articles || [],
                newsTotalResults: response.data.totalResults || 0,
                isLoadingNews: false,
              });

              // Save to history
              set(state => ({
                searchHistory: [
                  {
                    id: generateId(),
                    query: newsTopic,
                    type: 'news',
                    timestamp: new Date(),
                    provider: 'brave',
                  },
                  ...state.searchHistory.slice(0, 99),
                ],
              }));
            } else {
              set({
                isLoadingNews: false,
                newsError: response.error || 'Failed to fetch news',
              });
            }
          } catch (err) {
            set({
              isLoadingNews: false,
              newsError: err instanceof Error ? err.message : 'Failed to fetch news',
            });
          }
        },

        setNewsTopic: (topic: string) => set({ newsTopic: topic }),
        setNewsFreshness: (freshness: Freshness) => set({ newsFreshness: freshness }),
        setNewsCountry: (country: string) => set({ newsCountry: country }),
        clearNews: () => set({ newsArticles: [], newsTotalResults: 0, newsError: null }),

        // ============================================
        // Research Actions
        // ============================================

        researchTopic: async (query?: string) => {
          const state = get();
          const researchQuery = query || state.researchQuery;

          if (!researchQuery.trim()) {
            set({ researchError: 'Please enter a research question' });
            return;
          }

          set({ isResearching: true, researchError: null, researchData: null, researchQuery });

          try {
            const response = await apiClient.post<ResearchResponse>('/api/agent/web/research', {
              query: researchQuery,
              detail: state.researchDetail,
            });

            if (response.success && response.data) {
              set({
                researchData: response.data,
                isResearching: false,
              });

              // Save to history
              set(state => ({
                searchHistory: [
                  {
                    id: generateId(),
                    query: researchQuery,
                    type: 'research',
                    timestamp: new Date(),
                    provider: 'perplexity',
                  },
                  ...state.searchHistory.slice(0, 99),
                ],
              }));
            } else {
              set({
                isResearching: false,
                researchError: response.error || 'Failed to research topic',
              });
            }
          } catch (err) {
            set({
              isResearching: false,
              researchError: err instanceof Error ? err.message : 'Failed to research topic',
            });
          }
        },

        setResearchQuery: (query: string) => set({ researchQuery: query }),
        setResearchDetail: (detail: ResearchDetail) => set({ researchDetail: detail }),
        clearResearch: () => set({ researchData: null, researchQuery: '', researchError: null }),

        // ============================================
        // Image Search Actions
        // ============================================

        searchImages: async (query?: string) => {
          const state = get();
          const imageQuery = query || state.imageQuery;

          if (!imageQuery.trim()) {
            set({ imageError: 'Please enter an image search query' });
            return;
          }

          set({ isSearchingImages: true, imageError: null, imageResults: [], imageQuery });

          try {
            const response = await apiClient.get<ImageSearchResponse>('/api/agent/web/images', {
              query: imageQuery,
              count: 30,
              size: state.imageSize !== 'any' ? state.imageSize : undefined,
              type: state.imageType !== 'any' ? state.imageType : undefined,
            });

            if (response.success && response.data) {
              set({
                imageResults: response.data.images || [],
                imageTotalResults: response.data.totalResults || 0,
                isSearchingImages: false,
              });

              // Save to history
              set(state => ({
                searchHistory: [
                  {
                    id: generateId(),
                    query: imageQuery,
                    type: 'images',
                    timestamp: new Date(),
                    provider: 'brave',
                  },
                  ...state.searchHistory.slice(0, 99),
                ],
              }));
            } else {
              set({
                isSearchingImages: false,
                imageError: response.error || 'Failed to search images',
              });
            }
          } catch (err) {
            set({
              isSearchingImages: false,
              imageError: err instanceof Error ? err.message : 'Failed to search images',
            });
          }
        },

        setImageQuery: (query: string) => set({ imageQuery: query }),
        setImageSize: (size: ImageSize) => set({ imageSize: size }),
        setImageType: (type: ImageType) => set({ imageType: type }),
        clearImageResults: () => set({ imageResults: [], imageTotalResults: 0, imageQuery: '', imageError: null }),

        // ============================================
        // Video Search Actions
        // ============================================

        searchVideos: async (query?: string) => {
          const state = get();
          const videoQuery = query || state.videoQuery;

          if (!videoQuery.trim()) {
            set({ videoError: 'Please enter a video search query' });
            return;
          }

          set({ isSearchingVideos: true, videoError: null, videoResults: [], videoQuery });

          try {
            const response = await apiClient.get<VideoSearchResponse>('/api/agent/web/videos', {
              query: videoQuery,
              count: 20,
              duration: state.videoDuration !== 'any' ? state.videoDuration : undefined,
              resolution: state.videoResolution !== 'any' ? state.videoResolution : undefined,
            });

            if (response.success && response.data) {
              set({
                videoResults: response.data.videos || [],
                videoTotalResults: response.data.totalResults || 0,
                isSearchingVideos: false,
              });

              // Save to history
              set(state => ({
                searchHistory: [
                  {
                    id: generateId(),
                    query: videoQuery,
                    type: 'videos',
                    timestamp: new Date(),
                    provider: 'brave',
                  },
                  ...state.searchHistory.slice(0, 99),
                ],
              }));
            } else {
              set({
                isSearchingVideos: false,
                videoError: response.error || 'Failed to search videos',
              });
            }
          } catch (err) {
            set({
              isSearchingVideos: false,
              videoError: err instanceof Error ? err.message : 'Failed to search videos',
            });
          }
        },

        setVideoQuery: (query: string) => set({ videoQuery: query }),
        setVideoDuration: (duration: VideoDuration) => set({ videoDuration: duration }),
        setVideoResolution: (resolution: VideoResolution) => set({ videoResolution: resolution }),
        clearVideoResults: () => set({ videoResults: [], videoTotalResults: 0, videoQuery: '', videoError: null }),

        // ============================================
        // Web Viewer Actions
        // ============================================

        openWebViewer: (url: string, title?: string) => {
          set({
            webViewer: {
              url,
              title: title || url,
              isOpen: true,
              isLoading: true,
            },
          });
        },

        closeWebViewer: () => {
          set({
            webViewer: {
              url: '',
              title: '',
              isOpen: false,
              isLoading: false,
            },
          });
        },

        setWebViewerLoading: (loading: boolean) => {
          set(state => ({
            webViewer: { ...state.webViewer, isLoading: loading },
          }));
        },

        // ============================================
        // History Actions
        // ============================================

        fetchSearchHistory: async () => {
          try {
            const response = await apiClient.get<SearchHistory[]>('/api/agent/web/history', { limit: 100 });
            if (response.success && response.data) {
              set({ searchHistory: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch search history:', err);
          }
        },

        clearSearchHistory: async () => {
          try {
            await apiClient.delete('/api/agent/web/history');
            set({ searchHistory: [] });
          } catch (err) {
            console.error('Failed to clear search history:', err);
          }
        },

        deleteHistoryItem: async (historyId: string) => {
          try {
            await apiClient.delete(`/api/agent/web/history/${historyId}`);
            set(state => ({
              searchHistory: state.searchHistory.filter(h => h.id !== historyId),
            }));
          } catch (err) {
            console.error('Failed to delete history item:', err);
          }
        },

        toggleHistory: () => {
          set(state => ({ showHistory: !state.showHistory }));
        },

        // ============================================
        // UI State Actions
        // ============================================

        toggleSettings: () => {
          set(state => ({ showSettings: !state.showSettings }));
        },

        clearAllResults: () => {
          set({
            searchResults: [],
            searchTotalResults: 0,
            newsArticles: [],
            newsTotalResults: 0,
            imageResults: [],
            imageTotalResults: 0,
            videoResults: [],
            videoTotalResults: 0,
            researchData: null,
            weatherData: null,
            weatherComparisonData: null,
            searchError: null,
            newsError: null,
            imageError: null,
            videoError: null,
            researchError: null,
            weatherError: null,
          });
        },

        clearError: () => {
          set({ error: null });
        },

        resetState: () => {
          set({
            ...initialState,
            weatherLocations: initialState.weatherLocations,
            searchHistory: [],
          });
        },
      }),
      {
        name: 'web-agent-store',
        partialize: (state) => ({
          activeTab: state.activeTab,
          searchProvider: state.searchProvider,
          searchSafeSearch: state.searchSafeSearch,
          weatherUnit: state.weatherUnit,
          weatherForecastDays: state.weatherForecastDays,
          weatherLocations: state.weatherLocations,
          researchDetail: state.researchDetail,
          imageSize: state.imageSize,
          imageType: state.imageType,
          videoDuration: state.videoDuration,
          videoResolution: state.videoResolution,
        }),
      }
    )
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useWebSearch = () => useWebStore(state => ({
  searchQuery: state.searchQuery,
  searchProvider: state.searchProvider,
  searchSafeSearch: state.searchSafeSearch,
  searchFreshness: state.searchFreshness,
  searchResults: state.searchResults,
  searchTotalResults: state.searchTotalResults,
  searchNextPageToken: state.searchNextPageToken,
  isSearching: state.isSearching,
  searchError: state.searchError,
  searchWeb: state.searchWeb,
  searchMoreResults: state.searchMoreResults,
  setSearchQuery: state.setSearchQuery,
  setSearchProvider: state.setSearchProvider,
  setSearchSafeSearch: state.setSearchSafeSearch,
  setSearchFreshness: state.setSearchFreshness,
  clearSearchResults: state.clearSearchResults,
  getSearchResultCount: state.getSearchResultCount,
}));

export const useWeather = () => useWebStore(state => ({
  weatherLocation: state.weatherLocation,
  weatherUnit: state.weatherUnit,
  weatherData: state.weatherData,
  weatherForecastDays: state.weatherForecastDays,
  airQualityData: state.airQualityData,
  weatherLocations: state.weatherLocations,
  weatherComparisonLocations: state.weatherComparisonLocations,
  weatherComparisonData: state.weatherComparisonData,
  isLoadingWeather: state.isLoadingWeather,
  weatherError: state.weatherError,
  fetchWeather: state.fetchWeather,
  fetchAirQuality: state.fetchAirQuality,
  fetchWeatherComparison: state.fetchWeatherComparison,
  setWeatherLocation: state.setWeatherLocation,
  setWeatherUnit: state.setWeatherUnit,
  setWeatherForecastDays: state.setWeatherForecastDays,
  addWeatherLocation: state.addWeatherLocation,
  removeWeatherLocation: state.removeWeatherLocation,
  toggleFavoriteLocation: state.toggleFavoriteLocation,
  addComparisonLocation: state.addComparisonLocation,
  removeComparisonLocation: state.removeComparisonLocation,
  clearWeather: state.clearWeather,
  getFavoriteLocations: state.getFavoriteLocations,
  getWeatherComparisonCount: state.getWeatherComparisonCount,
}));

export const useNews = () => useWebStore(state => ({
  newsTopic: state.newsTopic,
  newsFreshness: state.newsFreshness,
  newsCountry: state.newsCountry,
  newsArticles: state.newsArticles,
  newsTotalResults: state.newsTotalResults,
  isLoadingNews: state.isLoadingNews,
  newsError: state.newsError,
  fetchNews: state.fetchNews,
  setNewsTopic: state.setNewsTopic,
  setNewsFreshness: state.setNewsFreshness,
  setNewsCountry: state.setNewsCountry,
  clearNews: state.clearNews,
  getNewsArticleCount: state.getNewsArticleCount,
}));

export const useResearch = () => useWebStore(state => ({
  researchQuery: state.researchQuery,
  researchDetail: state.researchDetail,
  researchData: state.researchData,
  isResearching: state.isResearching,
  researchError: state.researchError,
  researchTopic: state.researchTopic,
  setResearchQuery: state.setResearchQuery,
  setResearchDetail: state.setResearchDetail,
  clearResearch: state.clearResearch,
}));

export const useImageSearch = () => useWebStore(state => ({
  imageQuery: state.imageQuery,
  imageSize: state.imageSize,
  imageType: state.imageType,
  imageResults: state.imageResults,
  imageTotalResults: state.imageTotalResults,
  isSearchingImages: state.isSearchingImages,
  imageError: state.imageError,
  searchImages: state.searchImages,
  setImageQuery: state.setImageQuery,
  setImageSize: state.setImageSize,
  setImageType: state.setImageType,
  clearImageResults: state.clearImageResults,
}));

export const useVideoSearch = () => useWebStore(state => ({
  videoQuery: state.videoQuery,
  videoDuration: state.videoDuration,
  videoResolution: state.videoResolution,
  videoResults: state.videoResults,
  videoTotalResults: state.videoTotalResults,
  isSearchingVideos: state.isSearchingVideos,
  videoError: state.videoError,
  searchVideos: state.searchVideos,
  setVideoQuery: state.setVideoQuery,
  setVideoDuration: state.setVideoDuration,
  setVideoResolution: state.setVideoResolution,
  clearVideoResults: state.clearVideoResults,
}));

export const useWebViewer = () => useWebStore(state => ({
  webViewer: state.webViewer,
  openWebViewer: state.openWebViewer,
  closeWebViewer: state.closeWebViewer,
  setWebViewerLoading: state.setWebViewerLoading,
}));

export const useWebHistory = () => useWebStore(state => ({
  searchHistory: state.searchHistory,
  showHistory: state.showHistory,
  fetchSearchHistory: state.fetchSearchHistory,
  clearSearchHistory: state.clearSearchHistory,
  deleteHistoryItem: state.deleteHistoryItem,
  toggleHistory: state.toggleHistory,
  getRecentSearches: state.getRecentSearches,
}));

export const useWebUI = () => useWebStore(state => ({
  activeTab: state.activeTab,
  showSettings: state.showSettings,
  setActiveTab: state.setActiveTab,
  switchToPreviousTab: state.switchToPreviousTab,
  toggleSettings: state.toggleSettings,
  clearAllResults: state.clearAllResults,
}));