"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAgent = void 0;
// enterprise-ai-agent-platform/apps/api/src/agents/content/content.agent.ts
const base_agent_1 = require("../core/base.agent");
const agent_types_1 = require("../../types/agent.types");
const logger_1 = require("../../utils/logger");
const content_tools_1 = require("./content.tools");
const content_types_1 = require("./content.types");
class ContentAgent extends base_agent_1.BaseAgent {
    constructor() {
        super(agent_types_1.AgentType.CONTENT, 'Content Agent', 'Generates text, images, and videos using state-of-the-art AI models', '1.0.0');
    }
    registerTools() {
        this.registerTool(content_tools_1.ContentTools.generateTextTool());
        this.registerTool(content_tools_1.ContentTools.generateImageTool());
        this.registerTool(content_tools_1.ContentTools.generateVideoTool());
        this.registerTool(content_tools_1.ContentTools.editContentTool());
        this.registerTool(content_tools_1.ContentTools.resizeForPlatformTool());
        this.registerTool(content_tools_1.ContentTools.analyzeContentTool());
        this.registerTool(content_tools_1.ContentTools.summarizeTextTool());
        this.registerTool(content_tools_1.ContentTools.translateTextTool());
        this.registerTool(content_tools_1.ContentTools.batchGenerateTool());
    }
    /**
     * Check if agent can handle the request
     */
    canHandle(request) {
        const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
        const contentKeywords = [
            'generate', 'create', 'write', 'image', 'video', 'article',
            'blog', 'content', 'text', 'code', 'function', 'script',
            'story', 'poem', 'essay', 'summary', 'translate',
            'analyze', 'edit', 'revise', 'improve', 'rewrite',
            'dall-e', 'stable diffusion', 'midjourney', 'picture',
            'animation', 'clip', 'movie', 'film'
        ];
        return contentKeywords.some(keyword => input.includes(keyword));
    }
    /**
     * Execute content agent logic
     */
    async doExecute(request, context) {
        const startTime = Date.now();
        const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
        const lowerInput = input.toLowerCase();
        try {
            // Handle image generation
            if (this.isImageRequest(lowerInput)) {
                return await this.handleImageGeneration(context.userId, input);
            }
            // Handle video generation (Enterprise only)
            if (this.isVideoRequest(lowerInput)) {
                return await this.handleVideoGeneration(context.userId, input, context);
            }
            // Handle content analysis
            if (this.isAnalysisRequest(lowerInput)) {
                return await this.handleContentAnalysis(context.userId, input);
            }
            // Handle summarization
            if (this.isSummaryRequest(lowerInput)) {
                return await this.handleSummarization(context.userId, input);
            }
            // Handle translation
            if (this.isTranslationRequest(lowerInput)) {
                return await this.handleTranslation(context.userId, input);
            }
            // Handle code generation
            if (this.isCodeRequest(lowerInput)) {
                return await this.handleCodeGeneration(context.userId, input);
            }
            // Handle content editing
            if (this.isEditRequest(lowerInput)) {
                return await this.handleContentEditing(context.userId, input);
            }
            // Default: text generation
            return await this.handleTextGeneration(context.userId, input, context);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Content agent execution failed');
            return {
                success: false,
                message: `Content generation failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Check if request is for image generation
     */
    isImageRequest(input) {
        const imageKeywords = ['image', 'picture', 'photo', 'illustration', 'drawing', 'artwork', 'graphic', 'poster', 'dall-e'];
        return imageKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for video generation
     */
    isVideoRequest(input) {
        const videoKeywords = ['video', 'animation', 'clip', 'movie', 'film', 'footage', 'motion'];
        return videoKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for analysis
     */
    isAnalysisRequest(input) {
        const analysisKeywords = ['analyze', 'analysis', 'sentiment', 'review', 'evaluate', 'assess'];
        return analysisKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for summarization
     */
    isSummaryRequest(input) {
        const summaryKeywords = ['summarize', 'summary', 'tldr', 'sum up', 'condense', 'brief'];
        return summaryKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for translation
     */
    isTranslationRequest(input) {
        const translationKeywords = ['translate', 'translation', 'convert to', 'in spanish', 'in french', 'in german', 'in japanese'];
        return translationKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for code generation
     */
    isCodeRequest(input) {
        const codeKeywords = ['code', 'function', 'script', 'program', 'algorithm', 'class', 'method', 'api', 'endpoint', 'sql', 'query'];
        return codeKeywords.some(k => input.includes(k));
    }
    /**
     * Check if request is for content editing
     */
    isEditRequest(input) {
        const editKeywords = ['edit', 'revise', 'modify', 'change', 'update', 'improve', 'rewrite', 'fix', 'correct'];
        return editKeywords.some(k => input.includes(k));
    }
    /**
     * Extract a clean prompt from input
     */
    extractPrompt(input) {
        let prompt = input;
        const actionWords = [
            'generate', 'create', 'make', 'write', 'produce', 'compose',
            'draft', 'build', 'develop', 'craft', 'design'
        ];
        for (const word of actionWords) {
            prompt = prompt.replace(new RegExp(`^${word}\\s+`, 'i'), '');
        }
        // Remove quotes
        prompt = prompt.replace(/^["']|["']$/g, '');
        return prompt.trim();
    }
    /**
     * Extract size specification from input
     */
    extractSize(input) {
        const sizeMatch = input.match(/(\d+x\d+)/);
        if (sizeMatch)
            return sizeMatch[1];
        if (input.includes('wide') || input.includes('landscape'))
            return '1792x1024';
        if (input.includes('tall') || input.includes('portrait'))
            return '1024x1792';
        if (input.includes('square'))
            return '1024x1024';
        if (input.includes('small'))
            return '512x512';
        return undefined;
    }
    /**
     * Extract quality specification from input
     */
    extractQuality(input) {
        if (input.includes('hd') || input.includes('high quality') || input.includes('high res'))
            return 'hd';
        if (input.includes('standard') || input.includes('normal'))
            return 'standard';
        return undefined;
    }
    /**
     * Extract style specification from input
     */
    extractStyle(input) {
        if (input.includes('vivid') || input.includes('vibrant') || input.includes('colorful'))
            return 'vivid';
        if (input.includes('natural') || input.includes('realistic') || input.includes('photorealistic'))
            return 'natural';
        return undefined;
    }
    /**
     * Handle image generation
     */
    async handleImageGeneration(userId, input) {
        try {
            const prompt = this.extractPrompt(input);
            if (!prompt || prompt.length < 3) {
                return {
                    success: false,
                    message: 'Please provide a description of the image you want to generate.',
                    action: 'provide_prompt',
                };
            }
            const size = this.extractSize(input) || '1024x1024';
            const quality = this.extractQuality(input) || 'standard';
            const style = this.extractStyle(input) || 'vivid';
            logger_1.logger.info({ userId, prompt: prompt.substring(0, 100), size, quality, style }, 'Image generation requested');
            const result = await content_tools_1.ContentTools.generateImage({
                prompt,
                size: size,
                quality,
                style,
                numImages: 1,
            });
            return {
                success: true,
                message: 'Image generated successfully!',
                images: result.content,
                metadata: {
                    prompt,
                    size,
                    quality,
                    style,
                    costUsd: result.metadata.costUsd,
                    generationTimeMs: result.metadata.generationTimeMs,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
            logger_1.logger.error({ error, userId }, 'Image generation failed');
            return {
                success: false,
                message: `Image generation failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle video generation
     */
    async handleVideoGeneration(userId, input, context) {
        try {
            // Check plan access
            if (context.plan?.id !== 'ENTERPRISE') {
                return {
                    success: false,
                    message: 'Video generation is only available on the Enterprise plan. Please upgrade to access this feature.',
                    action: 'upgrade_plan',
                    requiredPlan: 'ENTERPRISE',
                };
            }
            const prompt = this.extractPrompt(input);
            const durationMatch = input.match(/(\d+)\s*seconds?/i);
            const duration = durationMatch ? Math.min(parseInt(durationMatch[1]), 12) : 4;
            logger_1.logger.info({ userId, prompt: prompt.substring(0, 100), duration }, 'Video generation requested');
            const result = await content_tools_1.ContentTools.generateVideo({
                prompt,
                duration,
            });
            return {
                success: true,
                message: 'Video generated successfully!',
                video: result.content,
                metadata: {
                    prompt,
                    duration,
                    costUsd: result.metadata.costUsd,
                    generationTimeMs: result.metadata.generationTimeMs,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Video generation failed';
            logger_1.logger.error({ error, userId }, 'Video generation failed');
            return {
                success: false,
                message: `Video generation failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle text generation
     */
    async handleTextGeneration(userId, input, context) {
        try {
            const prompt = this.extractPrompt(input);
            if (!prompt || prompt.length < 3) {
                return {
                    success: false,
                    message: 'Please provide a prompt describing what you want to generate.',
                    action: 'provide_prompt',
                };
            }
            // Determine system prompt based on content type
            const isCode = this.isCodeRequest(input.toLowerCase());
            const isProfessional = input.toLowerCase().includes('professional') || input.toLowerCase().includes('formal');
            const isCreative = input.toLowerCase().includes('creative') || input.toLowerCase().includes('story') || input.toLowerCase().includes('poem');
            let systemPrompt = 'You are a helpful AI assistant. Generate high-quality, well-structured content.';
            if (isCode) {
                systemPrompt = 'You are an expert software developer. Write clean, well-documented code with proper error handling and comments.';
            }
            else if (isProfessional) {
                systemPrompt = 'You are a professional business writer. Generate formal, well-structured business content with proper tone.';
            }
            else if (isCreative) {
                systemPrompt = 'You are a creative writer. Generate engaging, imaginative content with vivid descriptions.';
            }
            logger_1.logger.info({ userId, prompt: prompt.substring(0, 100), isCode }, 'Text generation requested');
            const result = await content_tools_1.ContentTools.generateText({
                prompt,
                systemPrompt,
                temperature: isCreative ? 0.9 : 0.7,
                maxTokens: isCode ? 2000 : 1000,
            });
            return {
                success: true,
                message: 'Content generated successfully!',
                content: result.content,
                metadata: {
                    model: result.metadata.model,
                    provider: result.metadata.provider,
                    tokensUsed: result.metadata.tokensUsed,
                    costUsd: result.metadata.costUsd,
                    generationTimeMs: result.metadata.generationTimeMs,
                    type: isCode ? 'code' : 'text',
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Text generation failed';
            logger_1.logger.error({ error, userId }, 'Text generation failed');
            return {
                success: false,
                message: `Text generation failed: ${errorMessage}. Please try again.`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle content analysis
     */
    async handleContentAnalysis(userId, input) {
        try {
            // Extract the content to analyze
            const contentMatch = input.match(/(?:analyze|review|evaluate)\s+["']?([^"']{10,})["']?/i);
            const content = contentMatch?.[1] || input;
            if (content.length < 10) {
                return {
                    success: false,
                    message: 'Please provide sufficient content to analyze (minimum 10 characters).',
                    action: 'provide_content',
                };
            }
            logger_1.logger.info({ userId, contentLength: content.length }, 'Content analysis requested');
            const result = await content_tools_1.ContentTools.analyzeContent(content, 'text');
            return {
                success: true,
                message: 'Content analyzed successfully!',
                analysis: {
                    sentiment: result.sentiment,
                    topics: result.topics,
                    keywords: result.keywords,
                    readabilityScore: result.readabilityScore,
                    toxicityScore: result.toxicityScore,
                    suggestedImprovements: result.suggestedImprovements,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
            logger_1.logger.error({ error, userId }, 'Content analysis failed');
            return {
                success: false,
                message: `Content analysis failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle summarization
     */
    async handleSummarization(userId, input) {
        try {
            const contentMatch = input.match(/(?:summarize|summary of|tldr)\s+["']?([^"']{20,})["']?/i);
            const content = contentMatch?.[1] || input;
            if (content.length < 20) {
                return {
                    success: false,
                    message: 'Please provide sufficient content to summarize (minimum 20 characters).',
                    action: 'provide_content',
                };
            }
            const maxLength = parseInt(input.match(/(\d+)\s*(?:words|word)/i)?.[1] || '200');
            logger_1.logger.info({ userId, contentLength: content.length, maxLength }, 'Summarization requested');
            const result = await content_tools_1.ContentTools.summarizeText(content, maxLength);
            return {
                success: true,
                message: 'Content summarized successfully!',
                summary: result.summary,
                metadata: {
                    originalLength: result.originalLength,
                    summaryLength: result.summaryLength,
                    compressionRatio: `${((result.summaryLength / result.originalLength) * 100).toFixed(1)}%`,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Summarization failed';
            logger_1.logger.error({ error, userId }, 'Summarization failed');
            return {
                success: false,
                message: `Summarization failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle translation
     */
    async handleTranslation(userId, input) {
        try {
            const languageMatch = input.match(/(?:to|in)\s+(spanish|french|german|japanese|chinese|korean|italian|portuguese|dutch|russian|arabic)/i);
            const targetLanguage = languageMatch?.[1] || 'spanish';
            const contentMatch = input.match(/(?:translate|convert)\s+["']?([^"']{5,})["']?/i);
            const content = contentMatch?.[1] || input.replace(/translate|convert|to\s+\w+/gi, '').trim();
            if (!content || content.length < 5) {
                return {
                    success: false,
                    message: 'Please provide text to translate (minimum 5 characters).',
                    action: 'provide_content',
                };
            }
            logger_1.logger.info({ userId, contentLength: content.length, targetLanguage }, 'Translation requested');
            const result = await content_tools_1.ContentTools.translateText(content, targetLanguage);
            return {
                success: true,
                message: `Translated to ${targetLanguage} successfully!`,
                original: result.original,
                translated: result.translated,
                language: result.language,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Translation failed';
            logger_1.logger.error({ error, userId }, 'Translation failed');
            return {
                success: false,
                message: `Translation failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle code generation
     */
    async handleCodeGeneration(userId, input) {
        try {
            const prompt = this.extractPrompt(input);
            const languageMatch = input.match(/in\s+(python|javascript|typescript|java|go|rust|c\+\+|c#|ruby|php|swift|kotlin)/i);
            const language = languageMatch?.[1] || 'javascript';
            const enhancedPrompt = `Write ${language} code: ${prompt}`;
            logger_1.logger.info({ userId, language, promptLength: prompt.length }, 'Code generation requested');
            const result = await content_tools_1.ContentTools.generateText({
                prompt: enhancedPrompt,
                systemPrompt: `You are an expert ${language} developer. Write clean, well-documented code with proper error handling, type annotations, and comments.`,
                temperature: 0.3,
                maxTokens: 2000,
            });
            return {
                success: true,
                message: `${language} code generated successfully!`,
                code: result.content,
                metadata: {
                    language,
                    model: result.metadata.model,
                    tokensUsed: result.metadata.tokensUsed,
                    costUsd: result.metadata.costUsd,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Code generation failed';
            logger_1.logger.error({ error, userId }, 'Code generation failed');
            return {
                success: false,
                message: `Code generation failed: ${errorMessage}`,
                error: errorMessage,
            };
        }
    }
    /**
     * Handle content editing
     */
    async handleContentEditing(userId, input) {
        try {
            const editInstructionMatch = input.match(/(?:edit|revise|modify|change|update|improve|rewrite|fix|correct)\s+["']?([^"']+)["']?\s+(?:to|by|with)\s+["']?([^"']+)["']?/i);
            let originalContent;
            let editInstruction;
            if (editInstructionMatch) {
                originalContent = editInstructionMatch[1];
                editInstruction = editInstructionMatch[2];
            }
            else {
                // Try alternative pattern
                const parts = input.split(/\s+(?:to|by|with)\s+/i);
                originalContent = parts[0]?.replace(/(?:edit|revise|modify|change|update|improve|rewrite|fix|correct)\s+/i, '').trim();
                editInstruction = parts[1] || 'improve this content';
            }
            if (!originalContent || originalContent.length < 5) {
                return {
                    success: false,
                    message: 'Please provide the original content and editing instructions.',
                    action: 'provide_content',
                };
            }
            logger_1.logger.info({ userId, contentLength: originalContent.length }, 'Content editing requested');
            const result = await content_tools_1.ContentTools.editContent({
                originalContent,
                editPrompt: editInstruction || 'improve this content',
                type: content_types_1.ContentGenerationType.TEXT,
            });
            return {
                success: true,
                message: 'Content edited successfully!',
                original: originalContent,
                edited: result.content,
                metadata: {
                    model: result.metadata.model,
                    tokensUsed: result.metadata.tokensUsed,
                    costUsd: result.metadata.costUsd,
                },
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Content editing failed';
            logger_1.logger.error({ error, userId }, 'Content editing failed');
            return {
                success: false,
                message: `Content editing failed: ${errorMessage}`,
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
                content: 'Analyzing your content request...',
                timestamp: new Date(),
            });
            const result = await this.doExecute(request, context);
            if (result.success !== false && result.content) {
                // Stream the content word by word for a typewriter effect
                const words = result.content.split(' ');
                for (const word of words) {
                    onChunk({
                        type: 'output',
                        content: word + ' ',
                        timestamp: new Date(),
                    });
                    // Small delay for typewriter effect
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }
            else {
                onChunk({
                    type: 'output',
                    content: result.message || JSON.stringify(result),
                    timestamp: new Date(),
                });
            }
            return {
                id: `content_${Date.now()}`,
                success: result.success !== false,
                output: result,
                metadata: {
                    agentType: this.agentType,
                    executionTimeMs: Date.now() - startTime,
                    tokensUsed: result.metadata?.tokensUsed || 0,
                    costUsd: result.metadata?.costUsd || 0,
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
                id: `content_${Date.now()}`,
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
exports.ContentAgent = ContentAgent;
//# sourceMappingURL=content.agent.js.map