"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAgent = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/web/web.agent.ts
const base_agent_1 = require("../core/base.agent");
const brave_client_1 = require("./brave.client");
const weather_client_1 = require("./weather.client");
const perplexity_client_1 = require("./perplexity.client");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
const web_tools_1 = require("./web.tools");
class WebAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(agent_types_1.AgentType.WEB, 'Web Agent', 'Web search, research, weather, and data extraction', '1.0.0');
        this.braveClient = new brave_client_1.BraveSearchClient();
        this.weatherClient = new weather_client_1.WeatherClient();
        this.perplexityClient = new perplexity_client_1.PerplexityClient();
    }
    registerTools() {
        this.registerTool(web_tools_1.WebTools.searchWebTool());
        this.registerTool(web_tools_1.WebTools.getWeatherTool());
        this.registerTool(web_tools_1.WebTools.researchTool());
        this.registerTool(web_tools_1.WebTools.getNewsTool());
        this.registerTool(web_tools_1.WebTools.getAirQualityTool());
        this.registerTool(web_tools_1.WebTools.compareWeatherTool());
        this.registerTool(web_tools_1.WebTools.searchImagesTool());
    }
    /**
     * Check if agent can handle the request
     */
    canHandle(request) {
        const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
        const webKeywords = [
            'search', 'google', 'weather', 'news', 'browse', 'lookup',
            'find', 'research', 'perplexity', 'temperature', 'forecast',
            'climate', 'humidity', 'air quality', 'pollution', 'aqi',
            'headlines', 'latest news', 'breaking', 'articles',
            'what is', 'who is', 'when is', 'where is', 'how to',
            'search for', 'look up', 'tell me about', 'information on',
            'compare weather', 'image search', 'pictures of', 'photos of'
        ];
        return webKeywords.some(keyword => input.includes(keyword));
    }
    /**
     * Execute web agent logic
     */
    async doExecute(request, context) {
        const startTime = Date.now();
        const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
        const lowerInput = input.toLowerCase();
        try {
            // Handle weather
            if (this.isWeatherRequest(lowerInput)) {
                return await this.handleWeather(input);
            }
            // Handle research
            if (this.isResearchRequest(lowerInput)) {
                return await this.handleResearch(input);
            }
            // Handle news
            if (this.isNewsRequest(lowerInput)) {
                return await this.handleNews(input);
            }
            // Handle air quality
            if (this.isAirQualityRequest(lowerInput)) {
                return await this.handleAirQuality(input);
            }
            // Handle weather comparison
            if (this.isWeatherComparisonRequest(lowerInput)) {
                return await this.handleWeatherComparison(input);
            }
            // Handle image search
            if (this.isImageSearchRequest(lowerInput)) {
                return await this.handleImageSearch(input);
            }
            // Default: web search
            return await this.handleWebSearch(input);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Web agent execution failed');
            return {
                success: false,
                message: `Web search failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    isWeatherRequest(input) {
        const keywords = ['weather', 'temperature', 'forecast', 'climate', 'humidity', 'wind', 'precipitation', 'rain', 'snow', 'sunny', 'cloudy'];
        return keywords.some(k => input.includes(k));
    }
    isResearchRequest(input) {
        const keywords = ['research', 'deep dive', 'analyze', 'investigate', 'comprehensive', 'in depth', 'detailed analysis'];
        return keywords.some(k => input.includes(k));
    }
    isNewsRequest(input) {
        const keywords = ['news', 'headlines', 'latest', 'breaking', 'articles', 'current events', 'top stories'];
        return keywords.some(k => input.includes(k));
    }
    isAirQualityRequest(input) {
        const keywords = ['air quality', 'pollution', 'aqi', 'air pollution', 'pm2', 'pm10', 'ozone'];
        return keywords.some(k => input.includes(k));
    }
    isWeatherComparisonRequest(input) {
        return (input.includes('weather') || input.includes('temperature')) &&
            (input.includes('compare') || input.includes('vs') || input.includes('versus') || input.includes('and'));
    }
    isImageSearchRequest(input) {
        const keywords = ['image', 'picture', 'photo', 'pic', 'images of', 'pictures of', 'photos of', 'image search'];
        return keywords.some(k => input.includes(k));
    }
    /**
     * Extract a clean query from input
     */
    extractQuery(input) {
        let query = input;
        const actionWords = [
            'search', 'find', 'look up', 'google', 'web search', 'search for',
            'look for', 'tell me about', 'what is', 'who is', 'where is',
            'information on', 'info on', 'details on'
        ];
        for (const word of actionWords) {
            query = query.replace(new RegExp(`^${word}\\s+`, 'i'), '');
        }
        return query.trim();
    }
    /**
     * Extract location from input
     */
    extractLocation(input) {
        let location = input;
        const removeWords = [
            'weather', 'temperature', 'forecast', 'in', 'at', 'for',
            'what is the', 'what\'s the', 'how is the', 'how\'s the',
            'air quality', 'pollution', 'aqi', 'climate', 'humidity',
            'wind', 'rain', 'snow', 'sunny', 'cloudy', 'precipitation'
        ];
        for (const word of removeWords) {
            location = location.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
        }
        return location.trim();
    }
    /**
     * Handle weather request
     */
    async handleWeather(input) {
        try {
            const location = this.extractLocation(input);
            if (!location || location.length < 2) {
                return {
                    success: false,
                    message: 'Please specify a location for weather information.',
                    action: 'provide_location',
                };
            }
            const daysMatch = input.match(/(\d+)\s*day/);
            const days = daysMatch ? parseInt(daysMatch[1]) : 5;
            const units = input.includes('fahrenheit') || input.includes('°f') ? 'imperial' : 'metric';
            const result = await web_tools_1.WebTools.getWeather(location, Math.min(days, 7), units);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Weather for ${result.location}: ${result.current?.temperature}°${units === 'imperial' ? 'F' : 'C'}, ${result.current?.condition}`,
                weather: {
                    location: result.location,
                    current: result.current,
                    forecast: result.forecast,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Weather fetch failed';
            logger_1.logger.error({ error, input }, 'Weather handling failed');
            return {
                success: false,
                message: `Failed to get weather: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle research request
     */
    async handleResearch(input) {
        try {
            let query = input;
            const researchWords = ['research', 'deep dive', 'analyze', 'investigate'];
            for (const word of researchWords) {
                query = query.replace(new RegExp(word, 'gi'), '');
            }
            query = query.trim();
            if (!query || query.length < 5) {
                return {
                    success: false,
                    message: 'Please provide a research query (minimum 5 characters).',
                    action: 'provide_query',
                };
            }
            const result = await web_tools_1.WebTools.research(query, 'detailed');
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Research completed for: "${query}"`,
                research: {
                    answer: result.answer,
                    sources: result.sources,
                    followUpQuestions: result.followUpQuestions,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Research failed';
            logger_1.logger.error({ error, input }, 'Research handling failed');
            return {
                success: false,
                message: `Research failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle news request
     */
    async handleNews(input) {
        try {
            let topic = input;
            const newsWords = ['news', 'headlines', 'latest', 'breaking', 'articles', 'current events', 'top stories'];
            for (const word of newsWords) {
                topic = topic.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
            }
            topic = topic.trim();
            if (!topic || topic.length < 2) {
                topic = 'top stories';
            }
            const result = await web_tools_1.WebTools.getNews(topic, 10);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Latest news about "${topic}"`,
                articles: result.articles,
                totalResults: result.totalResults,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'News fetch failed';
            logger_1.logger.error({ error, input }, 'News handling failed');
            return {
                success: false,
                message: `Failed to get news: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle air quality request
     */
    async handleAirQuality(input) {
        try {
            const location = this.extractLocation(input);
            if (!location || location.length < 2) {
                return {
                    success: false,
                    message: 'Please specify a location for air quality information.',
                    action: 'provide_location',
                };
            }
            const result = await web_tools_1.WebTools.getAirQuality(location);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Air quality for ${result.location}: ${result.category} (AQI: ${result.aqi})`,
                airQuality: {
                    location: result.location,
                    aqi: result.aqi,
                    category: result.category,
                    components: result.components,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Air quality fetch failed';
            logger_1.logger.error({ error, input }, 'Air quality handling failed');
            return {
                success: false,
                message: `Failed to get air quality: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle weather comparison
     */
    async handleWeatherComparison(input) {
        try {
            // Extract locations
            const locationMatch = input.match(/(?:compare|vs|versus|and)\s+([^,]+)(?:,|\s+and\s+|\s+vs\s+|\s+versus\s+)([^,]+)/i);
            let locations;
            if (locationMatch) {
                locations = [locationMatch[1].trim(), locationMatch[2].trim()];
            }
            else {
                // Try to extract from the full input
                const parts = input.split(/\s+(?:and|vs|versus|compare)\s+/i);
                locations = parts
                    .map(p => p.replace(/(?:weather|temperature|compare)/gi, '').trim())
                    .filter(p => p.length > 0);
            }
            if (locations.length < 2) {
                return {
                    success: false,
                    message: 'Please specify at least 2 locations to compare weather.',
                    action: 'provide_locations',
                };
            }
            const result = await web_tools_1.WebTools.compareWeather(locations);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Weather comparison for ${locations.join(' vs ')}`,
                comparison: result.locations,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Weather comparison failed';
            logger_1.logger.error({ error, input }, 'Weather comparison handling failed');
            return {
                success: false,
                message: `Failed to compare weather: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle image search
     */
    async handleImageSearch(input) {
        try {
            let query = input;
            const imageWords = ['image', 'picture', 'photo', 'pic', 'images of', 'pictures of', 'photos of', 'image search'];
            for (const word of imageWords) {
                query = query.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
            }
            query = query.trim();
            if (!query || query.length < 2) {
                return {
                    success: false,
                    message: 'Please specify what images to search for.',
                    action: 'provide_query',
                };
            }
            const result = await web_tools_1.WebTools.searchImages(query, 10);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Found ${result.images?.length || 0} image(s) for "${query}"`,
                images: result.images,
                totalResults: result.totalResults,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Image search failed';
            logger_1.logger.error({ error, input }, 'Image search handling failed');
            return {
                success: false,
                message: `Image search failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle web search
     */
    async handleWebSearch(input) {
        try {
            const query = this.extractQuery(input);
            if (!query || query.length < 3) {
                return {
                    success: false,
                    message: 'Please provide a search query (minimum 3 characters).',
                    action: 'provide_query',
                };
            }
            const result = await web_tools_1.WebTools.searchWeb(query, 10);
            if (!result.success) {
                return result;
            }
            return {
                success: true,
                message: `Found ${result.results.length} result(s) for "${query}"`,
                results: result.results,
                totalResults: result.totalResults,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Web search failed';
            logger_1.logger.error({ error, input }, 'Web search handling failed');
            return {
                success: false,
                message: `Web search failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Execute with streaming support
     */
    async executeStream(request, context, onChunk) {
        const startTime = Date.now();
        try {
            onChunk({
                type: 'thought',
                content: 'Searching the web...',
                timestamp: new Date(),
            });
            const result = await this.doExecute(request, context);
            onChunk({
                type: 'output',
                content: result.message || JSON.stringify(result),
                timestamp: new Date(),
            });
            return {
                id: `web_${Date.now()}`,
                success: result.success !== false,
                output: result,
                metadata: {
                    agentType: this.agentType,
                    executionTimeMs: Date.now() - startTime,
                    tokensUsed: 0,
                    costUsd: 0,
                    retryCount: 0,
                },
                timestamp: new Date(),
            };
        }
        catch (error) {
            onChunk({
                type: 'error',
                content: error instanceof Error ? error.message : 'Execution failed',
                timestamp: new Date(),
            });
            return {
                id: `web_${Date.now()}`,
                success: false,
                output: null,
                error: error instanceof Error ? error.message : 'Execution failed',
                metadata: {
                    agentType: this.agentType,
                    executionTimeMs: Date.now() - startTime,
                    tokensUsed: 0,
                    costUsd: 0,
                    retryCount: 0,
                },
                timestamp: new Date(),
            };
        }
    }
}
exports.WebAgent = WebAgent;
//# sourceMappingURL=web.agent.js.map