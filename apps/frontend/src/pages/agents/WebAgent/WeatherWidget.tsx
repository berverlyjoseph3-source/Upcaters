// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/WebAgent/WeatherWidget.tsx
import React, { useState } from 'react';
import { CloudRain, Sun, Cloud, Wind, Droplets, Thermometer, Search, Loader2, AlertCircle } from 'lucide-react';

interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: string;
  description: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  forecast: Array < {
    date: string;
    highTemp: number;
    lowTemp: number;
    condition: string;
    precipitation: number;
  } > ;
}

export const WeatherWidget: React.FC = () => {
  const [location, setLocation] = useState('');
  const [weather, setWeather] = useState < WeatherData | null > (null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  const handleSearch = async () => {
    if (!location.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call – replace with actual OpenWeatherMap API
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock weather data
      const mockWeather: WeatherData = {
        location: location,
        temperature: 22,
        feelsLike: 21,
        condition: 'Partly Cloudy',
        description: 'partly cloudy skies',
        humidity: 65,
        windSpeed: 12,
        windDirection: 'NW',
        pressure: 1013,
        uvIndex: 5,
        sunrise: '6:32 AM',
        sunset: '7:45 PM',
        forecast: [
          { date: 'Tomorrow', highTemp: 24, lowTemp: 18, condition: 'Sunny', precipitation: 0 },
          { date: 'Day 2', highTemp: 23, lowTemp: 17, condition: 'Cloudy', precipitation: 10 },
          { date: 'Day 3', highTemp: 21, lowTemp: 16, condition: 'Rain', precipitation: 60 },
        ],
      };
      setWeather(mockWeather);
    } catch (err) {
      setError('Failed to fetch weather data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('sun') || lower.includes('clear')) return <Sun className="h-12 w-12 text-yellow-500" />;
    if (lower.includes('cloud')) return <Cloud className="h-12 w-12 text-secondary-500" />;
    if (lower.includes('rain')) return <CloudRain className="h-12 w-12 text-blue-500" />;
    return <Sun className="h-12 w-12 text-yellow-500" />;
  };
  
  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter city name or zip code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !location.trim()}
          className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Weather'}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {weather && (
        <div className="space-y-6">
          {/* Current weather */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">{weather.location}</h2>
                <p className="text-secondary-500">{weather.description}</p>
              </div>
              <div className="flex items-center gap-4">
                {getWeatherIcon(weather.condition)}
                <div>
                  <span className="text-4xl font-bold">{weather.temperature}°C</span>
                  <p className="text-secondary-500">Feels like {weather.feelsLike}°C</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-secondary-200">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-secondary-500">Humidity</p>
                  <p className="font-medium">{weather.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-secondary-500" />
                <div>
                  <p className="text-xs text-secondary-500">Wind</p>
                  <p className="font-medium">{weather.windSpeed} km/h {weather.windDirection}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xs text-secondary-500">Pressure</p>
                  <p className="font-medium">{weather.pressure} hPa</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-xs text-secondary-500">UV Index</p>
                  <p className="font-medium">{weather.uvIndex}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4 text-sm text-secondary-500">
              <span>🌅 Sunrise: {weather.sunrise}</span>
              <span>🌇 Sunset: {weather.sunset}</span>
            </div>
          </div>

          {/* Forecast */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-semibold mb-4">5-Day Forecast</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {weather.forecast.map((day, idx) => (
                <div key={idx} className="text-center p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                  <p className="font-medium">{day.date}</p>
                  {day.condition.includes('Sun') ? <Sun className="h-8 w-8 mx-auto my-2 text-yellow-500" /> : 
                   day.condition.includes('Cloud') ? <Cloud className="h-8 w-8 mx-auto my-2 text-secondary-500" /> :
                   <CloudRain className="h-8 w-8 mx-auto my-2 text-blue-500" />}
                  <p className="text-sm">{day.highTemp}° / {day.lowTemp}°</p>
                  <p className="text-xs text-secondary-500">{day.precipitation}% rain</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default WeatherWidget;
