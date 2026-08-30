// enterprise-ai-agent-platform/apps/api/src/agents/web/web.types.ts

/**
 * Search Provider Enum
 */
export enum SearchProvider {
  BRAVE = 'brave',
  PERPLEXITY = 'perplexity',
  GOOGLE = 'google',
}

/**
 * Search Result Interface
 */
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
  familyFriendly?: boolean;
  score?: number;
  citations?: string[];
}

/**
 * Web Search Options
 */
export interface WebSearchOptions {
  query: string;
  count?: number;
  offset?: number;
  safesearch?: 'off' | 'moderate' | 'strict';
  country?: string;
  searchLang?: string;
  freshness?: 'past_day' | 'past_week' | 'past_month' | 'past_year';
  provider?: SearchProvider;
  category?: 'web' | 'news' | 'images' | 'videos' | 'scholar';
}

/**
 * Web Search Response
 */
export interface WebSearchResponse {
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

/**
 * News Search Options
 */
export interface NewsSearchOptions {
  topic: string;
  count?: number;
  freshness?: 'past_day' | 'past_week' | 'past_month';
  country?: string;
  language?: string;
  category?: string;
  sources?: string[];
}

/**
 * News Search Response
 */
export interface NewsSearchResponse {
  success: boolean;
  topic: string;
  articles: NewsArticle[];
  totalResults?: number;
  error?: string;
}

/**
 * News Article Interface
 */
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

/**
 * Weather Unit Type
 */
export type WeatherUnit = 'metric' | 'imperial';

/**
 * Weather Current Conditions
 */
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
  sunrise: number;
  sunset: number;
  icon?: string;
  dewPoint?: number;
  clouds: number;
  rain?: { '1h'?: number; '3h'?: number };
  snow?: { '1h'?: number; '3h'?: number };
}

/**
 * Weather Forecast Item
 */
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
  rain?: number;
  snow?: number;
}

/**
 * Weather Response
 */
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

/**
 * Weather Alert
 */
export interface WeatherAlert {
  senderName: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
}

/**
 * Weather Comparison Item
 */
export interface WeatherComparisonItem {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon?: string;
}

/**
 * Weather Comparison Response
 */
export interface WeatherComparisonResponse {
  success: boolean;
  locations: WeatherComparisonItem[];
  error?: string;
}

/**
 * Air Quality Index Components
 */
export interface AirQualityComponents {
  pm2_5?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  nh3?: number;
}

/**
 * Air Quality Response
 */
export interface AirQualityResponse {
  success: boolean;
  location?: string;
  aqi: number;
  category: string;
  components?: AirQualityComponents;
  timestamp: number;
  error?: string;
}

/**
 * Research Request Options
 */
export interface ResearchRequestOptions {
  query: string;
  detail?: 'concise' | 'detailed' | 'comprehensive';
  temperature?: number;
  maxTokens?: number;
  searchDomainFilter?: string[];
  searchRecencyFilter?: 'month' | 'week' | 'day' | 'hour';
  model?: string;
}

/**
 * Research Response
 */
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

/**
 * Research Source
 */
export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
  relevance?: number;
}

/**
 * Image Search Options
 */
export interface ImageSearchOptions {
  query: string;
  count?: number;
  size?: 'small' | 'medium' | 'large' | 'wallpaper' | 'any';
  color?: string;
  type?: 'photo' | 'clipart' | 'line' | 'animated' | 'any';
  license?: string;
  safesearch?: 'off' | 'moderate' | 'strict';
}

/**
 * Image Search Item
 */
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
  color?: string;
}

/**
 * Image Search Response
 */
export interface ImageSearchResponse {
  success: boolean;
  query: string;
  images: ImageSearchItem[];
  totalResults?: number;
  error?: string;
}

/**
 * Video Search Options
 */
export interface VideoSearchOptions {
  query: string;
  count?: number;
  duration?: 'short' | 'medium' | 'long' | 'any';
  resolution?: '360p' | '480p' | '720p' | '1080p' | '4k' | 'any';
  freshness?: 'past_day' | 'past_week' | 'past_month' | 'past_year';
}

/**
 * Video Search Item
 */
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

/**
 * Video Search Response
 */
export interface VideoSearchResponse {
  success: boolean;
  query: string;
  videos: VideoSearchItem[];
  totalResults?: number;
  error?: string;
}

/**
 * Brave Search API Response Types
 */
export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  page_age?: string;
  profile?: {
    name: string;
    url: string;
    img: string;
    long_name?: string;
  };
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon: string;
    path: string;
  };
  age?: string;
  family_friendly?: boolean;
  language?: string;
  extra_snippets?: string[];
}

export interface BraveSearchResponse {
  type: string;
  query: {
    original: string;
    show_strict_warning: boolean;
    altered?: string;
    safesearch?: string;
    is_navigational?: boolean;
    is_news_breaking?: boolean;
    spellcheck_off?: boolean;
    country?: string;
    bad_results?: boolean;
    should_fallback?: boolean;
    postal_code?: string;
    city?: string;
    header_country?: string;
    more_results_available?: boolean;
    custom_location_label?: string;
  };
  web?: {
    results: BraveSearchResult[];
    total?: number;
    family_friendly?: boolean;
  };
  news?: {
    results: BraveSearchResult[];
    total?: number;
  };
  videos?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      age: string;
      thumbnail: string;
      duration: string;
      meta_url?: any;
    }>;
    total?: number;
  };
  images?: {
    results: Array<{
      title: string;
      url: string;
      source: string;
      height: number;
      width: number;
      thumbnail: string;
      thumbnail_src?: string;
      properties?: any;
    }>;
    total?: number;
  };
  summarizer?: {
    key: string;
    summary: Array<{ answer: string; query: string }>;
  };
}

export interface BraveSearchOptions {
  query: string;
  count?: number;
  offset?: number;
  safesearch?: 'off' | 'moderate' | 'strict';
  country?: string;
  search_lang?: string;
  ui_lang?: string;
  spellcheck?: boolean;
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
  result_filter?: 'web' | 'news' | 'videos' | 'images';
  goggles_id?: string;
  units?: string;
  extra_snippets?: boolean;
  summary?: boolean;
}

/**
 * Perplexity API Response Types
 */
export interface PerplexityCompletionOptions {
  query: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  searchDomainFilter?: string[];
  returnImages?: boolean;
  returnRelatedQuestions?: boolean;
  searchRecencyFilter?: 'month' | 'week' | 'day' | 'hour';
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface PerplexityCompletionResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  citations: string[];
  related_questions?: string[];
  images?: string[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PerplexityResearchResult {
  answer: string;
  sources: Array<{ title: string; url: string }>;
  followUpQuestions?: string[];
  images?: string[];
  citations?: string[];
}

/**
 * OpenWeather API Response Types
 */
export interface WeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherForecastItemRaw[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface WeatherForecastItemRaw {
  dt: number;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    sea_level?: number;
    grnd_level?: number;
    humidity: number;
    temp_kf?: number;
  };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  visibility: number;
  pop: number;
  rain?: { '3h': number };
  snow?: { '3h': number };
  dt_txt: string;
  sys?: { pod: string };
}

export interface AirQualityData {
  coord: { lon: number; lat: number };
  list: Array<{
    main: { aqi: number };
    components: {
      co: number;
      no: number;
      no2: number;
      o3: number;
      so2: number;
      pm2_5: number;
      pm10: number;
      nh3: number;
    };
    dt: number;
  }>;
}

export interface GeocodingResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  local_names?: Record<string, string>;
}

export interface UVIndexResponse {
  lat: number;
  lon: number;
  date_iso: string;
  date: number;
  value: number;
}

export interface WeatherCurrent {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  wind_speed: number;
  wind_deg: number;
  wind_gust?: number;
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  clouds: number;
  visibility: number;
  dt: number;
  sunrise: number;
  sunset: number;
  uvi?: number;
  dew_point?: number;
}

/**
 * Web Agent Configuration
 */
export interface WebAgentConfig {
  defaultSearchProvider: SearchProvider;
  maxSearchResults: number;
  enableSafeSearch: boolean;
  enableImageSearch: boolean;
  enableVideoSearch: boolean;
  enableNewsSearch: boolean;
  weatherUnit: WeatherUnit;
  researchModel: string;
}