// enterprise-ai-agent-platform/apps/api/src/agents/web/weather.client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { apiConfig } from '../../config/api.config';

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

export interface WeatherForecastItem {
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
  pop: number; // Probability of precipitation
  rain?: { '3h': number };
  snow?: { '3h': number };
  dt_txt: string;
  sys?: { pod: string };
}

export interface WeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: WeatherForecastItem[];
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

export interface WeatherAlert {
  sender_name: string;
  event: string;
  start: number;
  end: number;
  description: string;
  tags: string[];
}

export class WeatherClient {
  private client: AxiosInstance | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = axios.create({
      baseURL: apiConfig.openweather.apiUrl,
      params: {
        appid: apiConfig.openweather.apiKey,
        units: 'metric',
      },
      timeout: apiConfig.timeouts.default,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ method: config.method, url: config.url }, 'Weather API request');
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug({ status: response.status, url: response.config.url }, 'Weather API response');
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          logger.error('OpenWeather API key invalid');
        } else if (error.response?.status === 404) {
          logger.warn('Location not found');
        } else if (error.response?.status === 429) {
          logger.warn('Weather API rate limit exceeded');
        }
        throw error;
      }
    );
  }

  /**
   * Retry wrapper for API calls
   */
  private async retryRequest<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.MAX_RETRIES) {
          const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.warn({ attempt, delay, context, error: lastError.message }, 'Weather API retry');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
  }

  async getCurrentWeather(location: string, units: string = 'metric'): Promise<{ location: string; country: string; current: WeatherCurrent }> {
    return this.retryRequest(async () => {
      const geo = await this.geocode(location);
      
      const response = await this.client!.get('/weather', {
        params: { lat: geo.lat, lon: geo.lon, units },
      });
      
      return {
        location: geo.name,
        country: geo.country,
        current: {
          temp: response.data.main.temp,
          feels_like: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          pressure: response.data.main.pressure,
          wind_speed: response.data.wind.speed,
          wind_deg: response.data.wind.deg,
          wind_gust: response.data.wind.gust,
          weather: response.data.weather,
          clouds: response.data.clouds?.all || 0,
          visibility: response.data.visibility,
          dt: response.data.dt,
          sunrise: response.data.sys?.sunrise,
          sunset: response.data.sys?.sunset,
        },
      };
    }, `getCurrentWeather(${location})`);
  }

  async getForecast(location: string, days: number = 5, units: string = 'metric'): Promise<WeatherForecastResponse> {
    return this.retryRequest(async () => {
      const geo = await this.geocode(location);
      
      const response = await this.client!.get('/forecast', {
        params: { lat: geo.lat, lon: geo.lon, cnt: Math.min(days * 8, 40), units },
      });
      
      return response.data;
    }, `getForecast(${location})`);
  }

  async getDailyForecast(location: string, units: string = 'metric'): Promise<WeatherForecastItem[]> {
    const forecast = await this.getForecast(location, 5, units);
    const dailyMap = new Map<string, WeatherForecastItem>();
    
    for (const item of forecast.list) {
      const date = item.dt_txt.split(' ')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { ...item });
      }
    }
    
    return Array.from(dailyMap.values());
  }

  async getAirQuality(lat: number, lon: number): Promise<AirQualityData> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/air_pollution', {
        params: { lat, lon },
      });
      
      return response.data;
    }, `getAirQuality(${lat}, ${lon})`);
  }

  async getUVIndex(lat: number, lon: number): Promise<UVIndexResponse> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/uvi', {
        params: { lat, lon },
      });
      
      return response.data;
    }, `getUVIndex(${lat}, ${lon})`);
  }

  async geocode(location: string): Promise<GeocodingResult> {
    return this.retryRequest(async () => {
      const response = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
        params: {
          q: location,
          limit: 1,
          appid: apiConfig.openweather.apiKey,
        },
      });
      
      if (!response.data || response.data.length === 0) {
        throw new Error(`Location not found: "${location}"`);
      }
      
      const result = response.data[0];
      return {
        name: result.name,
        lat: result.lat,
        lon: result.lon,
        country: result.country,
        state: result.state,
        local_names: result.local_names,
      };
    }, `geocode(${location})`);
  }

  async reverseGeocode(lat: number, lon: number): Promise<GeocodingResult> {
    return this.retryRequest(async () => {
      const response = await axios.get('https://api.openweathermap.org/geo/1.0/reverse', {
        params: {
          lat,
          lon,
          limit: 1,
          appid: apiConfig.openweather.apiKey,
        },
      });
      
      if (!response.data || response.data.length === 0) {
        throw new Error(`Location not found for coordinates: ${lat}, ${lon}`);
      }
      
      const result = response.data[0];
      return {
        name: result.name,
        lat: result.lat,
        lon: result.lon,
        country: result.country,
        state: result.state,
      };
    }, `reverseGeocode(${lat}, ${lon})`);
  }

  async getWeatherAlerts(lat: number, lon: number): Promise<WeatherAlert[]> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await this.client.get('/onecall', {
        params: { lat, lon, exclude: 'minutely,hourly,daily', appid: apiConfig.openweather.apiKey },
      });
      
      return response.data.alerts || [];
    }, `getWeatherAlerts(${lat}, ${lon})`);
  }

  async getHistoricalWeather(lat: number, lon: number, dt: number): Promise<any> {
    return this.retryRequest(async () => {
      if (!this.client) throw new Error('Client not initialized');
      
      const response = await axios.get('https://api.openweathermap.org/data/3.0/onecall/timemachine', {
        params: {
          lat,
          lon,
          dt,
          appid: apiConfig.openweather.apiKey,
        },
      });
      
      return response.data;
    }, `getHistoricalWeather(${lat}, ${lon})`);
  }

  async getHourlyForecast(location: string, hours: number = 24, units: string = 'metric'): Promise<WeatherForecastItem[]> {
    const forecast = await this.getForecast(location, Math.ceil(hours / 3), units);
    return forecast.list.slice(0, hours);
  }

  async compareWeather(locations: string[], units: string = 'metric'): Promise<Array<{ location: string; country: string; temp: number; feelsLike: number; condition: string; humidity: number; windSpeed: number }>> {
    const results = await Promise.allSettled(
      locations.map(async (location) => {
        try {
          const weather = await this.getCurrentWeather(location, units);
          return {
            location: weather.location,
            country: weather.country,
            temp: weather.current.temp,
            feelsLike: weather.current.feels_like,
            condition: weather.current.weather[0]?.description || 'Unknown',
            humidity: weather.current.humidity,
            windSpeed: weather.current.wind_speed,
          };
        } catch (error) {
          return {
            location,
            country: 'Unknown',
            temp: 0,
            feelsLike: 0,
            condition: 'Error',
            humidity: 0,
            windSpeed: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results.map(r => r.status === 'fulfilled' ? r.value : { 
      location: 'Unknown', country: 'Unknown', temp: 0, feelsLike: 0, 
      condition: 'Error', humidity: 0, windSpeed: 0 
    });
  }

  async getAirQualityByLocation(location: string): Promise<{ location: string; aqi: number; components: AirQualityData['list'][0]['components'] }> {
    const geo = await this.geocode(location);
    const airQuality = await this.getAirQuality(geo.lat, geo.lon);
    
    return {
      location: geo.name,
      aqi: airQuality.list[0]?.main?.aqi || 0,
      components: airQuality.list[0]?.components || {},
    };
  }

  async getWeatherByCoordinates(lat: number, lon: number, units: string = 'metric'): Promise<{ location: string; current: WeatherCurrent }> {
    return this.retryRequest(async () => {
      const geo = await this.reverseGeocode(lat, lon);
      
      const response = await this.client!.get('/weather', {
        params: { lat, lon, units },
      });
      
      return {
        location: geo.name,
        current: {
          temp: response.data.main.temp,
          feels_like: response.data.main.feels_like,
          humidity: response.data.main.humidity,
          pressure: response.data.main.pressure,
          wind_speed: response.data.wind.speed,
          wind_deg: response.data.wind.deg,
          weather: response.data.weather,
          clouds: response.data.clouds?.all || 0,
          visibility: response.data.visibility,
          dt: response.data.dt,
          sunrise: response.data.sys?.sunrise,
          sunset: response.data.sys?.sunset,
        },
      };
    }, `getWeatherByCoordinates(${lat}, ${lon})`);
  }
}