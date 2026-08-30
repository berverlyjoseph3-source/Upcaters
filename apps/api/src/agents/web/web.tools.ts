// enterprise-ai-agent-platform/apps/api/src/agents/web/web.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { BraveSearchClient } from './brave.client';
import { WeatherClient } from './weather.client';
import { PerplexityClient } from './perplexity.client';
import { logger } from '../../utils/logger';

export class WebTools {
  /**
   * Search web tool
   */
  static searchWebTool(): AgentTool {
    return {
      name: 'search_web',
      description: 'Search the web using Brave Search',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
        { name: 'count', type: 'number', required: false, description: 'Number of results (default: 10)' },
        { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
        { name: 'safesearch', type: 'string', required: false, description: 'Safe search (off, moderate, strict)' },
        { name: 'freshness', type: 'string', required: false, description: 'Result freshness (past_day, past_week, past_month)' },
      ],
      execute: async (params, context) => {
        if (!params.query || params.query.trim().length === 0) {
          throw new Error('Search query is required');
        }
        
        return await this.searchWeb(
          params.query,
          params.count || 10,
          params.offset,
          params.safesearch as any,
          params.freshness as any,
        );
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get weather tool
   */
  static getWeatherTool(): AgentTool {
    return {
      name: 'get_weather',
      description: 'Get current weather and forecast for a location',
      parameters: [
        { name: 'location', type: 'string', required: true, description: 'City name or zip code' },
        { name: 'days', type: 'number', required: false, description: 'Number of forecast days (default: 5)' },
        { name: 'units', type: 'string', required: false, description: 'Units (metric, imperial)' },
      ],
      execute: async (params, context) => {
        if (!params.location || params.location.trim().length < 2) {
          throw new Error('Location is required (minimum 2 characters)');
        }
        
        return await this.getWeather(params.location, params.days || 5, params.units || 'metric');
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Research tool
   */
  static researchTool(): AgentTool {
    return {
      name: 'research',
      description: 'Deep research using Perplexity AI with citations',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Research question' },
        { name: 'detail', type: 'string', required: false, description: 'Detail level (concise, detailed, comprehensive)' },
      ],
      execute: async (params, context) => {
        if (!params.query || params.query.trim().length < 5) {
          throw new Error('Research query is required (minimum 5 characters)');
        }
        
        return await this.research(params.query, params.detail || 'detailed');
      },
      requiresApiCall: true,
      cost: 5,
    };
  }

  /**
   * Get news tool
   */
  static getNewsTool(): AgentTool {
    return {
      name: 'get_news',
      description: 'Get latest news on a topic',
      parameters: [
        { name: 'topic', type: 'string', required: true, description: 'News topic' },
        { name: 'count', type: 'number', required: false, description: 'Number of articles (default: 10)' },
        { name: 'freshness', type: 'string', required: false, description: 'News freshness (past_day, past_week, past_month)' },
        { name: 'country', type: 'string', required: false, description: 'Country code for news (e.g., us, gb, in)' },
      ],
      execute: async (params, context) => {
        if (!params.topic || params.topic.trim().length < 2) {
          throw new Error('News topic is required (minimum 2 characters)');
        }
        
        return await this.getNews(
          params.topic,
          params.count || 10,
          params.freshness as any,
          params.country,
        );
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get air quality tool
   */
  static getAirQualityTool(): AgentTool {
    return {
      name: 'get_air_quality',
      description: 'Get air quality information for a location',
      parameters: [
        { name: 'location', type: 'string', required: true, description: 'City name or zip code' },
      ],
      execute: async (params, context) => {
        if (!params.location || params.location.trim().length < 2) {
          throw new Error('Location is required (minimum 2 characters)');
        }
        
        return await this.getAirQuality(params.location);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  /**
   * Compare weather tool
   */
  static compareWeatherTool(): AgentTool {
    return {
      name: 'compare_weather',
      description: 'Compare weather across multiple locations',
      parameters: [
        { name: 'locations', type: 'array', required: true, description: 'Array of city names' },
      ],
      execute: async (params, context) => {
        if (!params.locations || !Array.isArray(params.locations) || params.locations.length < 2) {
          throw new Error('At least 2 locations are required for comparison');
        }
        
        return await this.compareWeather(params.locations);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Search images tool
   */
  static searchImagesTool(): AgentTool {
    return {
      name: 'search_images',
      description: 'Search for images on the web',
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Image search query' },
        { name: 'count', type: 'number', required: false, description: 'Number of results (default: 10)' },
        { name: 'size', type: 'string', required: false, description: 'Image size (small, medium, large, wallpaper)' },
      ],
      execute: async (params, context) => {
        if (!params.query || params.query.trim().length === 0) {
          throw new Error('Search query is required');
        }
        
        return await this.searchImages(params.query, params.count || 10);
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  private static braveClient: BraveSearchClient | null = null;
  private static weatherClient: WeatherClient | null = null;
  private static perplexityClient: PerplexityClient | null = null;

  /**
   * Get Brave Search client (singleton)
   */
  private static getBraveClient(): BraveSearchClient {
    if (!this.braveClient) {
      this.braveClient = new BraveSearchClient();
    }
    return this.braveClient;
  }

  /**
   * Get Weather client (singleton)
   */
  private static getWeatherClient(): WeatherClient {
    if (!this.weatherClient) {
      this.weatherClient = new WeatherClient();
    }
    return this.weatherClient;
  }

  /**
   * Get Perplexity client (singleton)
   */
  private static getPerplexityClient(): PerplexityClient {
    if (!this.perplexityClient) {
      this.perplexityClient = new PerplexityClient();
    }
    return this.perplexityClient;
  }

  /**
   * Search web
   */
  static async searchWeb(
    query: string,
    count: number = 10,
    offset?: number,
    safesearch?: 'off' | 'moderate' | 'strict',
    freshness?: 'past_day' | 'past_week' | 'past_month',
  ): Promise<{
    success: boolean;
    query: string;
    results: Array<{ title: string; url: string; snippet: string; source: string }>;
    totalResults?: number;
    error?: string;
  }> {
    try {
      const client = this.getBraveClient();
      
      logger.info({ query, count, offset, safesearch }, 'Performing web search');
      
      const response = await client.searchWeb({
        query,
        count,
        offset,
        safesearch: safesearch || 'moderate',
        search_lang: 'en',
      });

      const results = (response.web?.results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        source: r.profile?.name || new URL(r.url).hostname || 'Unknown',
      }));

      return {
        success: true,
        query,
        results,
        totalResults: response.web?.total,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Search failed';
      logger.error({ error, query }, 'Web search failed');
      
      return {
        success: false,
        query,
        results: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get weather
   */
  static async getWeather(
    location: string,
    days: number = 5,
    units: string = 'metric',
  ): Promise<{
    success: boolean;
    location?: string;
    current?: {
      temperature: number;
      feelsLike: number;
      condition: string;
      humidity: number;
      windSpeed: number;
      pressure: number;
      visibility: number;
      uvIndex: number;
      sunrise: number;
      sunset: number;
    };
    forecast?: Array<{
      date: string;
      highTemp: number;
      lowTemp: number;
      condition: string;
      precipitation: number;
      humidity: number;
      windSpeed: number;
    }>;
    error?: string;
  }> {
    try {
      const client = this.getWeatherClient();
      
      logger.info({ location, days, units }, 'Getting weather');
      
      // Get current weather and forecast
      const [current, forecast] = await Promise.all([
        client.getCurrentWeather(location).catch(() => null),
        client.getForecast(location, Math.min(days, 7)).catch(() => null),
      ]);

      if (!current) {
        return {
          success: false,
          location,
          error: `Could not find weather for "${location}"`,
        };
      }

      // Process forecast
      const dailyForecast: Array<{
        date: string;
        highTemp: number;
        lowTemp: number;
        condition: string;
        precipitation: number;
        humidity: number;
        windSpeed: number;
      }> = [];

      if (forecast?.list) {
        const dailyMap = new Map<string, any>();
        
        for (const item of forecast.list) {
          const date = item.dt_txt.split(' ')[0];
          
          if (!dailyMap.has(date)) {
            dailyMap.set(date, {
              date,
              highTemp: item.main.temp_max,
              lowTemp: item.main.temp_min,
              condition: item.weather[0]?.description || 'Unknown',
              precipitation: item.pop * 100,
              humidity: item.main.humidity,
              windSpeed: item.wind.speed,
            });
          } else {
            const existing = dailyMap.get(date);
            existing.highTemp = Math.max(existing.highTemp, item.main.temp_max);
            existing.lowTemp = Math.min(existing.lowTemp, item.main.temp_min);
            existing.precipitation = Math.max(existing.precipitation, item.pop * 100);
            existing.humidity = Math.round((existing.humidity + item.main.humidity) / 2);
            existing.windSpeed = Math.round((existing.windSpeed + item.wind.speed) / 2);
          }
        }

        for (const [date, data] of dailyMap) {
          dailyForecast.push(data);
        }
      }

      return {
        success: true,
        location: current.location,
        current: {
          temperature: current.current.temp,
          feelsLike: current.current.feels_like,
          condition: current.current.weather[0]?.description || 'Unknown',
          humidity: current.current.humidity,
          windSpeed: current.current.wind_speed,
          pressure: current.current.pressure,
          visibility: current.current.visibility,
          uvIndex: current.current.uvi || 0,
          sunrise: current.current.sunrise,
          sunset: current.current.sunset,
        },
        forecast: dailyForecast.slice(0, days),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Weather fetch failed';
      logger.error({ error, location }, 'Weather fetch failed');
      
      return {
        success: false,
        location,
        error: errorMessage,
      };
    }
  }

  /**
   * Research with Perplexity
   */
  static async research(
    query: string,
    detail: string = 'detailed',
  ): Promise<{
    success: boolean;
    query?: string;
    answer?: string;
    sources?: Array<{ title: string; url: string }>;
    followUpQuestions?: string[];
    error?: string;
  }> {
    try {
      const client = this.getPerplexityClient();
      
      logger.info({ query, detail }, 'Performing research');
      
      const maxTokens = detail === 'comprehensive' ? 4000 : detail === 'concise' ? 1000 : 2000;
      
      const result = await client.research(query);
      
      return {
        success: true,
        query,
        answer: result.answer,
        sources: (result.sources || []).map(s => ({
          title: s.title,
          url: s.url,
        })),
        followUpQuestions: result.followUpQuestions,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Research failed';
      logger.error({ error, query }, 'Research failed');
      
      return {
        success: false,
        query,
        error: errorMessage,
      };
    }
  }

  /**
   * Get news
   */
  static async getNews(
    topic: string,
    count: number = 10,
    freshness?: 'past_day' | 'past_week' | 'past_month',
    country?: string,
  ): Promise<{
    success: boolean;
    topic?: string;
    articles?: Array<{
      title: string;
      url: string;
      snippet: string;
      source: string;
      publishedAt?: string;
    }>;
    totalResults?: number;
    error?: string;
  }> {
    try {
      const client = this.getBraveClient();
      
      logger.info({ topic, count, freshness, country }, 'Getting news');
      
      const searchQuery = `${topic} news${freshness ? ` when:${freshness.replace('past_', '')}` : ''}`;
      
      const results = await client.searchNews(searchQuery, count);
      
      const articles = (results || []).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
        source: r.profile?.name || 'Unknown',
        publishedAt: r.page_age,
      }));

      return {
        success: true,
        topic,
        articles,
        totalResults: articles.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'News search failed';
      logger.error({ error, topic }, 'News search failed');
      
      return {
        success: false,
        topic,
        articles: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Get air quality
   */
  static async getAirQuality(
    location: string,
  ): Promise<{
    success: boolean;
    location?: string;
    aqi?: number;
    category?: string;
    components?: {
      pm2_5?: number;
      pm10?: number;
      o3?: number;
      no2?: number;
      so2?: number;
      co?: number;
    };
    error?: string;
  }> {
    try {
      const client = this.getWeatherClient();
      
      logger.info({ location }, 'Getting air quality');
      
      const geo = await client.geocode(location);
      const airQuality = await client.getAirQuality(geo.lat, geo.lon).catch(() => null);
      
      if (!airQuality || !airQuality.list || airQuality.list.length === 0) {
        return {
          success: false,
          location: geo.name,
          error: `Air quality data not available for "${location}"`,
        };
      }

      const aqi = airQuality.list[0]?.main?.aqi || 0;
      const components = airQuality.list[0]?.components || {};

      const getAQICategory = (value: number): string => {
        if (value === 1) return 'Good';
        if (value === 2) return 'Fair';
        if (value === 3) return 'Moderate';
        if (value === 4) return 'Poor';
        if (value === 5) return 'Very Poor';
        return 'Unknown';
      };

      return {
        success: true,
        location: geo.name,
        aqi,
        category: getAQICategory(aqi),
        components: {
          pm2_5: components.pm2_5,
          pm10: components.pm10,
          o3: components.o3,
          no2: components.no2,
          so2: components.so2,
          co: components.co,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Air quality fetch failed';
      logger.error({ error, location }, 'Air quality fetch failed');
      
      return {
        success: false,
        location,
        error: errorMessage,
      };
    }
  }

  /**
   * Compare weather across locations
   */
  static async compareWeather(
    locations: string[],
  ): Promise<{
    success: boolean;
    locations?: Array<{
      location: string;
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
    }>;
    error?: string;
  }> {
    try {
      const client = this.getWeatherClient();
      
      logger.info({ locations }, 'Comparing weather');
      
      const results = await Promise.allSettled(
        locations.map(async (location) => {
          try {
            const weather = await client.getCurrentWeather(location);
            return {
              location: weather.location,
              temperature: weather.current.temp,
              condition: weather.current.weather[0]?.description || 'Unknown',
              humidity: weather.current.humidity,
              windSpeed: weather.current.wind_speed,
            };
          } catch (error) {
            return {
              location,
              temperature: 0,
              condition: 'Error',
              humidity: 0,
              windSpeed: 0,
              error: error instanceof Error ? error.message : 'Fetch failed',
            };
          }
        })
      );

      const weatherData = results.map(r => 
        r.status === 'fulfilled' ? r.value : { location: 'Unknown', temperature: 0, condition: 'Error', humidity: 0, windSpeed: 0 }
      );

      return {
        success: true,
        locations: weatherData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Weather comparison failed';
      logger.error({ error, locations }, 'Weather comparison failed');
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Search images
   */
  static async searchImages(
    query: string,
    count: number = 10,
  ): Promise<{
    success: boolean;
    query?: string;
    images?: Array<{
      title: string;
      url: string;
      source: string;
      width: number;
      height: number;
      thumbnailUrl?: string;
    }>;
    totalResults?: number;
    error?: string;
  }> {
    try {
      const client = this.getBraveClient();
      
      logger.info({ query, count }, 'Searching images');
      
      const results = await client.searchImages(query, count);
      
      const images = (results || []).map(r => ({
        title: r.title || '',
        url: r.url,
        source: r.source || 'Unknown',
        width: r.width || 0,
        height: r.height || 0,
        thumbnailUrl: r.thumbnail,
      }));

      return {
        success: true,
        query,
        images,
        totalResults: images.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Image search failed';
      logger.error({ error, query }, 'Image search failed');
      
      return {
        success: false,
        query,
        images: [],
        error: errorMessage,
      };
    }
  }
}