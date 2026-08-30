"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeatherClient = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/web/weather.client.ts
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
const api_config_1 = require("../../config/api.config");
class WeatherClient {
    constructor() {
        this.client = null;
        this.MAX_RETRIES = 3;
        this.BASE_DELAY_MS = 1000;
        this.initializeClient();
    }
    initializeClient() {
        this.client = axios_1.default.create({
            baseURL: api_config_1.apiConfig.openweather.apiUrl,
            params: {
                appid: api_config_1.apiConfig.openweather.apiKey,
                units: 'metric',
            },
            timeout: api_config_1.apiConfig.timeouts.default,
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug({ method: config.method, url: config.url }, 'Weather API request');
            return config;
        }, (error) => Promise.reject(error));
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug({ status: response.status, url: response.config.url }, 'Weather API response');
            return response;
        }, async (error) => {
            if (error.response?.status === 401) {
                logger_1.logger.error('OpenWeather API key invalid');
            }
            else if (error.response?.status === 404) {
                logger_1.logger.warn('Location not found');
            }
            else if (error.response?.status === 429) {
                logger_1.logger.warn('Weather API rate limit exceeded');
            }
            throw error;
        });
    }
    /**
     * Retry wrapper for API calls
     */
    async retryRequest(fn, context) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < this.MAX_RETRIES) {
                    const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    logger_1.logger.warn({ attempt, delay, context, error: lastError.message }, 'Weather API retry');
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError || new Error(`Failed after ${this.MAX_RETRIES} retries: ${context}`);
    }
    async getCurrentWeather(location, units = 'metric') {
        return this.retryRequest(async () => {
            const geo = await this.geocode(location);
            const response = await this.client.get('/weather', {
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
    async getForecast(location, days = 5, units = 'metric') {
        return this.retryRequest(async () => {
            const geo = await this.geocode(location);
            const response = await this.client.get('/forecast', {
                params: { lat: geo.lat, lon: geo.lon, cnt: Math.min(days * 8, 40), units },
            });
            return response.data;
        }, `getForecast(${location})`);
    }
    async getDailyForecast(location, units = 'metric') {
        const forecast = await this.getForecast(location, 5, units);
        const dailyMap = new Map();
        for (const item of forecast.list) {
            const date = item.dt_txt.split(' ')[0];
            if (!dailyMap.has(date)) {
                dailyMap.set(date, { ...item });
            }
        }
        return Array.from(dailyMap.values());
    }
    async getAirQuality(lat, lon) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/air_pollution', {
                params: { lat, lon },
            });
            return response.data;
        }, `getAirQuality(${lat}, ${lon})`);
    }
    async getUVIndex(lat, lon) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/uvi', {
                params: { lat, lon },
            });
            return response.data;
        }, `getUVIndex(${lat}, ${lon})`);
    }
    async geocode(location) {
        return this.retryRequest(async () => {
            const response = await axios_1.default.get('https://api.openweathermap.org/geo/1.0/direct', {
                params: {
                    q: location,
                    limit: 1,
                    appid: api_config_1.apiConfig.openweather.apiKey,
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
    async reverseGeocode(lat, lon) {
        return this.retryRequest(async () => {
            const response = await axios_1.default.get('https://api.openweathermap.org/geo/1.0/reverse', {
                params: {
                    lat,
                    lon,
                    limit: 1,
                    appid: api_config_1.apiConfig.openweather.apiKey,
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
    async getWeatherAlerts(lat, lon) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await this.client.get('/onecall', {
                params: { lat, lon, exclude: 'minutely,hourly,daily', appid: api_config_1.apiConfig.openweather.apiKey },
            });
            return response.data.alerts || [];
        }, `getWeatherAlerts(${lat}, ${lon})`);
    }
    async getHistoricalWeather(lat, lon, dt) {
        return this.retryRequest(async () => {
            if (!this.client)
                throw new Error('Client not initialized');
            const response = await axios_1.default.get('https://api.openweathermap.org/data/3.0/onecall/timemachine', {
                params: {
                    lat,
                    lon,
                    dt,
                    appid: api_config_1.apiConfig.openweather.apiKey,
                },
            });
            return response.data;
        }, `getHistoricalWeather(${lat}, ${lon})`);
    }
    async getHourlyForecast(location, hours = 24, units = 'metric') {
        const forecast = await this.getForecast(location, Math.ceil(hours / 3), units);
        return forecast.list.slice(0, hours);
    }
    async compareWeather(locations, units = 'metric') {
        const results = await Promise.allSettled(locations.map(async (location) => {
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
            }
            catch (error) {
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
        }));
        return results.map(r => r.status === 'fulfilled' ? r.value : {
            location: 'Unknown', country: 'Unknown', temp: 0, feelsLike: 0,
            condition: 'Error', humidity: 0, windSpeed: 0
        });
    }
    async getAirQualityByLocation(location) {
        const geo = await this.geocode(location);
        const airQuality = await this.getAirQuality(geo.lat, geo.lon);
        return {
            location: geo.name,
            aqi: airQuality.list[0]?.main?.aqi || 0,
            components: airQuality.list[0]?.components || {},
        };
    }
    async getWeatherByCoordinates(lat, lon, units = 'metric') {
        return this.retryRequest(async () => {
            const geo = await this.reverseGeocode(lat, lon);
            const response = await this.client.get('/weather', {
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
exports.WeatherClient = WeatherClient;
//# sourceMappingURL=weather.client.js.map