// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/intent-classifier.ts

import { v4 as uuidv4 } from 'uuid';
import { IntentResult, AgentType } from '../../types/agent.types';
import { OpenAIClient } from '../../services/ai/openai.client';
import { AnthropicClient } from '../../services/ai/anthropic.client';
import { GeminiClient } from '../../services/ai/gemini.client';
import { agentRegistry } from '../core/agent.registry';
import { logger } from '../../utils/logger';
import { prisma } from '../../db/client';
import Redis from 'ioredis';

// ============================================
// Enhanced Data Structures
// ============================================

export interface ClassificationOptions {
  confidenceThreshold?: number;
  maxAlternatives?: number;
  useCache?: boolean;
  cacheTTL?: number;
  useAIFallback?: boolean;
  extractEntities?: boolean;
  includeComplexityEstimation?: boolean;
  preferredMethod?: 'keyword' | 'ai' | 'hybrid' | 'auto';
  entityPatterns?: Record<string, RegExp>;
  domainKeywords?: Record<AgentType, string[]>;
  enableLearning?: boolean;
  enableAmbiguityDetection?: boolean;
  enableMultiIntent?: boolean;
  maxMultiIntents?: number;
  sessionId?: string;
  userId?: string;
}

export interface ClassificationResult extends IntentResult {
  classificationId: string;
  classificationMethod: 'keyword' | 'ai' | 'hybrid' | 'rule_based' | 'fallback' | 'learned';
  processingTimeMs: number;
  cacheHit: boolean;
  isAmbiguous: boolean;
  clarificationQuestions?: string[];
  multiIntents?: Array<{ intent: string; confidence: number; agentType: AgentType }>;
  complexity: ClassificationComplexity;
  metadata?: {
    modelUsed?: string;
    modelVersion?: string;
    promptTokens?: number;
    completionTokens?: number;
    costUsd?: number;
    entityConfidence?: Record<string, number>;
    keywordMatches?: Record<string, number>;
    aiRawResponse?: string;
    correctionHistory?: CorrectionRecord[];
    errorMessage?: string;
  };
}

export interface ClassificationComplexity {
  level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  agentCount: number;
  stepEstimate: number;
  reasoning: string;
}

export interface CorrectionRecord {
  id: string;
  timestamp: Date;
  originalIntent: string;
  correctedIntent: string;
  userId: string;
  feedback: 'correct' | 'incorrect' | 'partially_correct';
  input: string;
  context?: Record<string, any>;
}

export interface EntityExtractionResult {
  entities: Record<string, any>;
  confidence: Record<string, number>;
  rawMatches: Record<string, string[]>;
}

// ============================================
// Agent Capability Discovery
// ============================================

export interface AgentCapability {
  type: AgentType;
  name: string;
  description: string;
  keywords: string[];
  capabilities: string[];
  tools: Array<{ name: string; description: string }>;
  confidence: number;
  matchReason?: string;
}

// ============================================
// Enhanced Intent Classifier
// ============================================

export class IntentClassifier {
  private static redis: Redis | null = null;
  private static classificationHistory: Map<string, ClassificationResult> = new Map();
  private static correctionStore: CorrectionRecord[] = [];
  private static performanceMetrics = {
    totalClassifications: 0,
    keywordHits: 0,
    aiHits: 0,
    cacheHits: 0,
    averageTimeMs: 0,
    correctionRate: 0,
    ambiguityRate: 0,
  };

  // ============================================
  // Initialization
  // ============================================

  static initialize(redisUrl?: string): void {
    try {
      this.redis = new Redis(redisUrl || process.env.REDIS_URL!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
      logger.info('Intent classifier initialized with Redis caching');
    } catch (error) {
      logger.warn('Redis not available for intent caching, using in-memory cache');
    }
    this.loadCorrectionHistory();
  }

  private static async loadCorrectionHistory(): Promise<void> {
    try {
      const corrections = await prisma.$queryRaw<CorrectionRecord[]>`
        SELECT * FROM intent_corrections 
        WHERE corrected_at > NOW() - INTERVAL '30 days'
        ORDER BY corrected_at DESC
        LIMIT 1000
      `;
      this.correctionStore = corrections || [];
      logger.info({ count: this.correctionStore.length }, 'Correction history loaded');
    } catch (error) {
      logger.warn('Failed to load correction history, running without learning');
    }
  }

  // ============================================
  // Agent Capability Discovery (NEW)
  // ============================================

  static async discoverAgentCapabilities(): Promise<Map<AgentType, AgentCapability>> {
    const capabilities = new Map<AgentType, AgentCapability>();
    const agents = agentRegistry.getAllAgents();

    for (const agent of agents) {
      const agentType = agent.getType();
      const tools = agent.getTools();

      capabilities.set(agentType, {
        type: agentType,
        name: agent.getName(),
        description: agent.getDescription(),
        keywords: (this.AGENT_KEYWORDS[agentType] || []).map((k) => k.word),
        capabilities: tools.map(t => t.name),
        tools: tools.map(t => ({ name: t.name, description: t.description })),
        confidence: agent.getMetrics().errorRate < 0.1 ? 0.9 : 0.7,
      });
    }

    return capabilities;
  }

  // ============================================
  // Enhanced Agent Keywords (with weights)
  // ============================================

  private static readonly AGENT_KEYWORDS: Record<AgentType, Array<{ word: string; weight: number }>> = {
    [AgentType.EMAIL]: [
      { word: 'email', weight: 1.0 },
      { word: 'mail', weight: 0.8 },
      { word: 'inbox', weight: 0.9 },
      { word: 'send', weight: 0.6 },
      { word: 'reply', weight: 0.8 },
      { word: 'gmail', weight: 0.9 },
      { word: 'outlook', weight: 0.7 },
      { word: 'message', weight: 0.5 },
      { word: 'compose', weight: 0.8 },
      { word: 'draft', weight: 0.7 },
      { word: 'attachment', weight: 0.6 },
      { word: 'spam', weight: 0.7 },
      { word: 'forward', weight: 0.7 },
    ],
    [AgentType.DRIVE]: [
      { word: 'drive', weight: 0.9 },
      { word: 'file', weight: 0.8 },
      { word: 'document', weight: 0.8 },
      { word: 'upload', weight: 0.9 },
      { word: 'download', weight: 0.9 },
      { word: 'folder', weight: 0.8 },
      { word: 'share', weight: 0.7 },
      { word: 'google drive', weight: 1.0 },
      { word: 'pdf', weight: 0.6 },
      { word: 'spreadsheet', weight: 0.6 },
      { word: 'storage', weight: 0.5 },
    ],
    [AgentType.CONTENT]: [
      { word: 'generate', weight: 0.8 },
      { word: 'create', weight: 0.6 },
      { word: 'write', weight: 0.7 },
      { word: 'image', weight: 0.9 },
      { word: 'video', weight: 0.9 },
      { word: 'article', weight: 0.8 },
      { word: 'blog', weight: 0.7 },
      { word: 'content', weight: 0.8 },
      { word: 'text', weight: 0.6 },
      { word: 'code', weight: 0.7 },
      { word: 'dall-e', weight: 0.9 },
    ],
    [AgentType.SOCIAL]: [
      { word: 'post', weight: 0.8 },
      { word: 'tweet', weight: 0.9 },
      { word: 'linkedin', weight: 0.9 },
      { word: 'instagram', weight: 0.9 },
      { word: 'facebook', weight: 0.9 },
      { word: 'social', weight: 0.8 },
      { word: 'share', weight: 0.5 },
      { word: 'x', weight: 0.7 },
      { word: 'twitter', weight: 0.9 },
      { word: 'schedule', weight: 0.6 },
    ],
    [AgentType.CALENDAR]: [
      { word: 'calendar', weight: 0.9 },
      { word: 'schedule', weight: 0.8 },
      { word: 'meeting', weight: 0.9 },
      { word: 'event', weight: 0.8 },
      { word: 'appointment', weight: 0.8 },
      { word: 'book', weight: 0.6 },
      { word: 'reminder', weight: 0.7 },
      { word: 'availability', weight: 0.8 },
      { word: 'free busy', weight: 0.9 },
    ],
    [AgentType.WEB]: [
      { word: 'search', weight: 0.8 },
      { word: 'google', weight: 0.7 },
      { word: 'weather', weight: 0.9 },
      { word: 'news', weight: 0.8 },
      { word: 'browse', weight: 0.7 },
      { word: 'lookup', weight: 0.7 },
      { word: 'find', weight: 0.6 },
      { word: 'research', weight: 0.9 },
      { word: 'perplexity', weight: 0.9 },
      { word: 'information', weight: 0.5 },
    ],
    [AgentType.TASK]: [
      { word: 'task', weight: 0.9 },
      { word: 'todo', weight: 0.8 },
      { word: 'asana', weight: 0.9 },
      { word: 'monday', weight: 0.9 },
      { word: 'reminder', weight: 0.6 },
      { word: 'to-do', weight: 0.8 },
      { word: 'complete', weight: 0.7 },
      { word: 'project', weight: 0.7 },
      { word: 'checklist', weight: 0.8 },
    ],
    [AgentType.ORCHESTRATOR]: [
      { word: 'help', weight: 0.3 },
      { word: 'assist', weight: 0.3 },
      { word: 'ai', weight: 0.2 },
      { word: 'automate', weight: 0.4 },
    ],
  };

  // ============================================
  // Enhanced Multi-Agent Patterns
  // ============================================

  private static readonly MULTI_AGENT_PATTERNS: Array<{
    pattern: RegExp;
    agents: AgentType[];
    weight: number;
    description: string;
  }> = [
    {
      pattern: /(?:create|generate).*(?:and|then).*(?:post|share)/i,
      agents: [AgentType.CONTENT, AgentType.SOCIAL],
      weight: 0.9,
      description: 'Content creation and social posting',
    },
    {
      pattern: /(?:read|check).*(?:email).*(?:and|then).*(?:create|schedule)/i,
      agents: [AgentType.EMAIL, AgentType.CALENDAR],
      weight: 0.85,
      description: 'Email reading and calendar scheduling',
    },
    {
      pattern: /(?:search|find).*(?:and|then).*(?:save|upload|store)/i,
      agents: [AgentType.WEB, AgentType.DRIVE],
      weight: 0.8,
      description: 'Web search and file storage',
    },
    {
      pattern: /(?:create|add).*(?:task|todo).*(?:for|about|regarding).*(?:meeting|email)/i,
      agents: [AgentType.CALENDAR, AgentType.TASK],
      weight: 0.85,
      description: 'Calendar event and task creation',
    },
    {
      pattern: /(?:generate|create).*(?:image|video).*(?:and|then).*(?:post|share|publish)/i,
      agents: [AgentType.CONTENT, AgentType.SOCIAL],
      weight: 0.95,
      description: 'Media generation and publishing',
    },
    {
      pattern: /(?:research|investigate).*(?:and|then).*(?:summarize|report|write)/i,
      agents: [AgentType.WEB, AgentType.CONTENT],
      weight: 0.85,
      description: 'Research and content creation',
    },
    {
      pattern: /(?:check|review).*(?:calendar|schedule).*(?:and|then).*(?:send|email)/i,
      agents: [AgentType.CALENDAR, AgentType.EMAIL],
      weight: 0.8,
      description: 'Calendar check and email notification',
    },
  ];

  // ============================================
  // Advanced Entity Extraction
  // ============================================

  private static readonly ENTITY_PATTERNS: Record<string, RegExp> = {
    email: /[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
    url: /https?:\/\/[^\s<>"']+/g,
    phone: /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/g,
    date: /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})|(tomorrow|today|next week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
    time: /(\d{1,2}:\d{2}\s*(?:am|pm)?)/gi,
    currency: /\$\d+(?:,\d{3})*(?:\.\d{2})?/g,
    percentage: /\d+(?:\.\d+)?%/g,
    hashtag: /#\w+/g,
    mention: /@\w+/g,
    fileExtension: /\.\w{2,4}\b/g,
    number: /\b\d+\b/g,
    person: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
  };

  // ============================================
  // AI Prompt Templates (Enhanced)
  // ============================================

  private static readonly INTENT_PROMPT_TEMPLATE = `
You are an expert intent classification system for an enterprise AI agent platform. Analyze the user's input with extreme precision.

### Available Agents & Capabilities:
{CAPABILITIES}

### User Context:
{CONTEXT}

### Classification Rules:
1. PRIMARY INTENT: The main action the user wants to accomplish
2. CONFIDENCE: 0.0-1.0 based on clarity of request (0.3+ = actionable, 0.7+ = highly confident)
3. ALTERNATIVES: Other possible interpretations (2-3 alternatives)
4. ENTITIES: Extract all mentioned entities (emails, dates, URLs, names, etc.)
5. AGENT MATCHING: Match to the most capable agent based on actual capabilities
6. MULTI-AGENT: Detect if multiple agents need to work together
7. COMPLEXITY: Estimate overall complexity of the task

### Input to classify:
"{INPUT}"

### Response Format (VALID JSON ONLY):
{
  "primaryIntent": "concise description of the main action",
  "confidence": 0.85,
  "alternativeIntents": [
    {"intent": "alternative interpretation", "confidence": 0.3, "agentType": "AGENT_TYPE"}
  ],
  "entities": {"emails": ["..."], "urls": ["..."], "dates": ["..."], "names": ["..."], "hashtags": ["..."], "custom": {"key": "value"}},
  "suggestedAgent": "AGENT_TYPE",
  "requiresMultipleAgents": false,
  "agentChain": ["AGENT_TYPE_1", "AGENT_TYPE_2"],
  "complexity": {
    "level": "moderate",
    "agentCount": 2,
    "stepEstimate": 3,
    "reasoning": "Requires web search followed by content generation"
  },
  "isAmbiguous": false,
  "clarificationQuestions": [],
  "estimatedTimeMs": 5000,
  "estimatedCostUsd": 0.005
}
`;

  // ============================================
  // Enhanced Classification Engine
  // ============================================

  /**
   * MAIN ENHANCED CLASSIFICATION METHOD
   */
  static async classify(
    input: string,
    options?: ClassificationOptions,
  ): Promise<ClassificationResult> {
    const startTime = Date.now();
    const classificationId = uuidv4();
    const opts = {
      confidenceThreshold: options?.confidenceThreshold ?? 0.5,
      maxAlternatives: options?.maxAlternatives ?? 3,
      useCache: options?.useCache ?? true,
      cacheTTL: options?.cacheTTL ?? 3600,
      useAIFallback: options?.useAIFallback ?? true,
      extractEntities: options?.extractEntities ?? true,
      includeComplexityEstimation: options?.includeComplexityEstimation ?? true,
      preferredMethod: options?.preferredMethod ?? 'auto',
      enableLearning: options?.enableLearning ?? true,
      enableAmbiguityDetection: options?.enableAmbiguityDetection ?? true,
      enableMultiIntent: options?.enableMultiIntent ?? true,
      userId: options?.userId,
      sessionId: options?.sessionId,
    };

    let result: ClassificationResult;
    let cacheHit = false;

    // Step 1: Check cache
    if (opts.useCache) {
      const cached = await this.checkCache(input);
      if (cached) {
        cacheHit = true;
        this.updateMetrics('cacheHit', Date.now() - startTime);
        return { ...cached, cacheHit: true, processingTimeMs: Date.now() - startTime };
      }
    }

    // Step 2: Discover agent capabilities
    const capabilities = await this.discoverAgentCapabilities();

    // Step 3: Try keyword classification first (fast path)
    const keywordResult = this.classifyByKeywords(input, capabilities);

    // Step 4: Determine if we need AI classification
    const needsAI =
      opts.preferredMethod === 'ai' ||
      !keywordResult ||
      keywordResult.confidence < opts.confidenceThreshold ||
      (opts.enableAmbiguityDetection && keywordResult.isAmbiguous);

    if (needsAI && opts.useAIFallback) {
      // Step 5: AI classification
      const aiResult = await this.classifyByAI(input, capabilities, opts);

      // Merge keyword and AI results for better accuracy
      result = this.mergeClassificationResults(keywordResult, aiResult, opts);
      result.classificationMethod = keywordResult ? 'hybrid' : 'ai';
    } else if (keywordResult) {
      result = {
        ...keywordResult,
        classificationMethod: 'keyword',
      };
    } else {
      // Fallback
      result = this.createFallbackClassification(input, capabilities);
      result.classificationMethod = 'fallback';
    }

    // Step 6: Apply learning corrections
    if (opts.enableLearning) {
      result = this.applyLearningCorrections(result, input);
    }

    // Step 7: Detect ambiguity and generate clarification questions
    if (opts.enableAmbiguityDetection && result.confidence < 0.7) {
      const ambiguity = this.detectAmbiguity(input, result);
      result.isAmbiguous = ambiguity.isAmbiguous;
      result.clarificationQuestions = ambiguity.questions;
    }

    // Step 8: Estimate complexity
    if (opts.includeComplexityEstimation) {
      result.complexity = this.estimateComplexity(result);
    }

    // Finalize
    result.classificationId = classificationId;
    result.processingTimeMs = Date.now() - startTime;
    result.cacheHit = cacheHit;

    // Cache the result
    if (opts.useCache) {
      await this.setCache(input, result, opts.cacheTTL);
    }

    // Update metrics
    this.updateMetrics(result.classificationMethod, result.processingTimeMs);

    return result;
  }

  // ============================================
  // Enhanced Keyword Classification
  // ============================================

  static classifyByKeywords(
    input: string,
    capabilities?: Map<AgentType, AgentCapability>,
  ): ClassificationResult | null {
    const lowerInput = input.toLowerCase();
    const scores = new Map<AgentType, { score: number; matches: string[] }>();

    // Score each agent based on weighted keyword matches
    for (const [agentType, keywords] of Object.entries(this.AGENT_KEYWORDS)) {
      let totalScore = 0;
      let maxPossible = 0;
      const matches: string[] = [];

      for (const { word, weight } of keywords) {
        maxPossible += weight;
        if (lowerInput.includes(word.toLowerCase())) {
          totalScore += weight;
          matches.push(word);
        }
      }

      const normalizedScore = maxPossible > 0 ? totalScore / maxPossible : 0;

      if (normalizedScore > 0) {
        scores.set(agentType as AgentType, {
          score: normalizedScore,
          matches,
        });
      }
    }

    // Find best agent
    const sortedScores = Array.from(scores.entries())
      .sort((a, b) => b[1].score - a[1].score);

    if (sortedScores.length === 0) {
      return null;
    }

    const [bestAgent, bestScore] = sortedScores[0];
    const confidence = Math.min(bestScore.score * 0.8 + 0.2, 0.95); // Cap at 0.95

    // Check for multi-agent patterns
    let requiresMultipleAgents = false;
    let agentChain: AgentType[] = [];
    let multiIntentReason = '';

    for (const { pattern, agents, weight, description } of this.MULTI_AGENT_PATTERNS) {
      if (pattern.test(input)) {
        requiresMultipleAgents = true;
        agentChain = agents;
        multiIntentReason = description;
        break;
      }
    }

    // Extract entities
    const entities = this.extractEntities(input);

    // Build alternatives
    const alternativeIntents = sortedScores.slice(1, 4).map(([agent, data]) => ({
      intent: this.generateIntentDescription(agent),
      confidence: data.score * 0.6,
      description: `Matched keywords: ${data.matches.join(', ')}`,
      suggestedAgent: agent,
    }));

    return {
      classificationId: uuidv4(),
      classificationMethod: 'keyword',
      processingTimeMs: 0,
      cacheHit: false,
      isAmbiguous: confidence < 0.6,
      primaryIntent: this.generateIntentDescription(bestAgent, input),
      confidence,
      alternativeIntents,
      entities,
      suggestedAgent: bestAgent,
      requiresMultipleAgents,
      agentChain: requiresMultipleAgents ? agentChain : undefined,
      multiIntents: requiresMultipleAgents
        ? agentChain.map(agent => ({
            intent: this.generateIntentDescription(agent),
            confidence: 0.8,
            agentType: agent,
          }))
        : undefined,
      complexity: this.estimateComplexity({
        requiresMultipleAgents,
        agentChain,
        suggestedAgent: bestAgent,
      } as any),
      metadata: {
        keywordMatches: Object.fromEntries(
          sortedScores.map(([agent, data]) => [agent, data.score])
        ),
        entityConfidence: {},
      },
    };
  }

  // ============================================
  // Enhanced AI Classification
  // ============================================

  static async classifyByAI(
    input: string,
    capabilities: Map<AgentType, AgentCapability>,
    options?: ClassificationOptions,
  ): Promise<ClassificationResult> {
    const startTime = Date.now();

    // Build capabilities summary for the prompt
    const capabilitiesSummary = Array.from(capabilities.entries())
      .map(([type, cap]) =>
        `- ${type.toUpperCase()}: ${cap.description} (Tools: ${cap.capabilities.join(', ')})`
      )
      .join('\n');

    // Build context
    const context = JSON.stringify({
      userId: options?.userId,
      sessionId: options?.sessionId,
      timestamp: new Date().toISOString(),
    });

    // Build the prompt
    const prompt = this.INTENT_PROMPT_TEMPLATE
      .replace('{CAPABILITIES}', capabilitiesSummary)
      .replace('{CONTEXT}', context)
      .replace('{INPUT}', input);

    // Try multiple AI providers with fallback
    let aiResponse: string | null = null;
    let modelUsed = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let costUsd = 0;

    try {
      const openai = OpenAIClient.getInstance();
      const response = await openai.complete({
        messages: [
          {
            role: 'system',
            content: 'You are an expert intent classification system. Respond ONLY with valid JSON. No explanations, no markdown formatting.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        maxTokens: 800,
      });

      aiResponse = response.choices[0].message.content;
      modelUsed = response.model;
      promptTokens = response.usage?.prompt_tokens || 0;
      completionTokens = response.usage?.completion_tokens || 0;
      costUsd = openai.calculateCost(response.model, response.usage?.total_tokens || 0);
    } catch (error) {
      logger.warn({ error }, 'OpenAI classification failed, trying Anthropic');

      try {
        const anthropic = AnthropicClient.getInstance();
        const response = await anthropic.complete({
          messages: [{ role: 'user', content: prompt }],
          system: 'You are an expert intent classification system. Respond ONLY with valid JSON.',
          temperature: 0.1,
          maxTokens: 800,
        });

        aiResponse = response.content[0]?.text || '';
        modelUsed = response.model;
        promptTokens = response.usage?.input_tokens || 0;
        completionTokens = response.usage?.output_tokens || 0;
        costUsd = anthropic.calculateCost(response.model, promptTokens, completionTokens);
      } catch (secondError) {
        logger.warn({ error: secondError }, 'Anthropic fallback failed');

        // Try Gemini as last resort
        try {
          const gemini = GeminiClient.getInstance();
          const response = await gemini.complete({
            contents: [{ parts: [{ text: prompt }], role: 'user' }],
            temperature: 0.1,
            maxOutputTokens: 800,
          });

          aiResponse = response.candidates[0]?.content.parts[0]?.text || '';
          modelUsed = response.modelVersion;
          promptTokens = response.usageMetadata?.promptTokenCount || 0;
          completionTokens = response.usageMetadata?.candidatesTokenCount || 0;
          costUsd = gemini.calculateCost(response.modelVersion, promptTokens, completionTokens);
        } catch (thirdError) {
          logger.error({ error: thirdError }, 'All AI providers failed');
          throw thirdError;
        }
      }
    }

    // Parse AI response
    let parsed: any;
    try {
      // Extract JSON from response (in case model returned non-JSON)
      const jsonMatch = aiResponse?.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

      if (!parsed) {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      logger.warn({ parseError, response: aiResponse?.substring(0, 500) }, 'Failed to parse AI classification response');
      
      // Return fallback
      return this.createFallbackClassification(input, capabilities);
    }

    // Build result from AI response
    const result: ClassificationResult = {
      classificationId: uuidv4(),
      classificationMethod: 'ai',
      processingTimeMs: Date.now() - startTime,
      cacheHit: false,
      isAmbiguous: parsed.isAmbiguous || false,
      clarificationQuestions: parsed.clarificationQuestions,
      primaryIntent: parsed.primaryIntent || 'general_assistance',
      confidence: Math.min(Math.max(parsed.confidence || 0.3, 0.1), 0.99),
      alternativeIntents: (parsed.alternativeIntents || []).slice(0, options?.maxAlternatives || 3),
      entities: parsed.entities || {},
      suggestedAgent: this.sanitizeAgentType(parsed.suggestedAgent),
      requiresMultipleAgents: parsed.requiresMultipleAgents || false,
      agentChain: parsed.agentChain?.map((a: string) => this.sanitizeAgentType(a)),
      multiIntents: parsed.multiIntents,
      complexity: parsed.complexity || {
        level: 'moderate',
        agentCount: 1,
        stepEstimate: 1,
        reasoning: 'Default estimate',
      },
      metadata: {
        modelUsed,
        modelVersion: modelUsed,
        promptTokens,
        completionTokens,
        costUsd,
        aiRawResponse: aiResponse?.substring(0, 200),
      },
    };

    return result;
  }

  // ============================================
  // Merge & Enhance Results
  // ============================================

  private static mergeClassificationResults(
    keywordResult: ClassificationResult | null,
    aiResult: ClassificationResult,
    options: ClassificationOptions,
  ): ClassificationResult {
    if (!keywordResult) return aiResult;

    // Weighted averaging of confidence
    const keywordWeight = 0.3;
    const aiWeight = 0.7;
    const mergedConfidence =
      (keywordResult.confidence * keywordWeight) + (aiResult.confidence * aiWeight);

    // Merge entities (AI entities take precedence)
    const mergedEntities = {
      ...keywordResult.entities,
      ...aiResult.entities,
    };

    // Merge alternatives (deduplicate)
    const seenIntents = new Set<string>();
    const mergedAlternatives = [
      ...keywordResult.alternativeIntents.filter(a => {
        const key = `${a.intent}-${a.suggestedAgent}`;
        if (seenIntents.has(key)) return false;
        seenIntents.add(key);
        return true;
      }),
      ...aiResult.alternativeIntents.filter(a => {
        const key = `${a.intent}-${a.suggestedAgent}`;
        if (seenIntents.has(key)) return false;
        seenIntents.add(key);
        return true;
      }),
    ].slice(0, options.maxAlternatives || 3);

    return {
      ...aiResult,
      confidence: Math.min(mergedConfidence, 0.99),
      entities: mergedEntities,
      alternativeIntents: mergedAlternatives,
      metadata: {
        ...aiResult.metadata,
        keywordMatches: keywordResult.metadata?.keywordMatches,
      },
    };
  }

  // ============================================
  // Learning & Corrections (NEW)
  // ============================================

  static async recordCorrection(
    correction: Omit<CorrectionRecord, 'id' | 'timestamp'>,
  ): Promise<void> {
    const record: CorrectionRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      ...correction,
    };

    this.correctionStore.unshift(record);

    // Keep only last 1000
    if (this.correctionStore.length > 1000) {
      this.correctionStore = this.correctionStore.slice(0, 1000);
    }

    // Persist to database
    try {
      await prisma.$executeRaw`
        INSERT INTO intent_corrections (id, user_id, original_intent, corrected_intent, feedback, input, context, corrected_at)
        VALUES (
          ${record.id}::uuid,
          ${record.userId}::uuid,
          ${record.originalIntent},
          ${record.correctedIntent},
          ${record.feedback},
          ${record.input},
          ${record.context ? JSON.stringify(record.context) : null}::jsonb,
          NOW()
        )
      `;

      logger.info({ correctionId: record.id }, 'Intent correction recorded');
    } catch (error) {
      logger.error({ error }, 'Failed to persist intent correction');
    }

    // Update performance metrics
    const total = this.correctionStore.length;
    const corrected = this.correctionStore.filter(c => c.feedback === 'incorrect').length;
    this.performanceMetrics.correctionRate = total > 0 ? corrected / total : 0;
  }

  private static applyLearningCorrections(
    result: ClassificationResult,
    input: string,
  ): ClassificationResult {
    // Find similar past corrections
    const similarCorrections = this.correctionStore.filter(c => {
      const similarity = this.calculateStringSimilarity(c.input, input);
      return similarity > 0.7 && c.feedback === 'incorrect';
    });

    if (similarCorrections.length === 0) return result;

    // Apply most frequent correction
    const correctionCounts = new Map<string, number>();
    for (const correction of similarCorrections) {
      const key = correction.correctedIntent;
      correctionCounts.set(key, (correctionCounts.get(key) || 0) + 1);
    }

    const mostFrequent = Array.from(correctionCounts.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (mostFrequent && mostFrequent[1] >= 2) {
      logger.info({
        originalIntent: result.primaryIntent,
        correctedIntent: mostFrequent[0],
        correctionCount: mostFrequent[1],
      }, 'Applied learning correction');

      result.classificationMethod = 'learned';
      result.primaryIntent = mostFrequent[0];
      result.metadata = {
        ...result.metadata,
        correctionHistory: similarCorrections.slice(0, 5),
      };
    }

    return result;
  }

  // ============================================
  // Ambiguity Detection (NEW)
  // ============================================

  private static detectAmbiguity(
    input: string,
    result: ClassificationResult,
  ): { isAmbiguous: boolean; questions: string[] } {
    const questions: string[] = [];

    // Check for conflicting keywords
    if (result.alternativeIntents.length >= 2) {
      const topAlternative = result.alternativeIntents[0];
      if (topAlternative.confidence > result.confidence * 0.8) {
        questions.push(
          `Did you mean "${topAlternative.intent}" or "${result.primaryIntent}"?`,
        );
      }
    }

    // Check for missing critical entities
    if (result.suggestedAgent === AgentType.EMAIL && !result.entities?.emails?.length) {
      questions.push('Who would you like to send the email to?');
    }

    if (result.suggestedAgent === AgentType.CALENDAR && !result.entities?.dates?.length) {
      questions.push('When would you like to schedule this?');
    }

    // Check for vague requests
    const vagueWords = ['something', 'thing', 'stuff', 'whatever'];
    const hasVague = vagueWords.some(w => input.toLowerCase().includes(w));
    if (hasVague && result.confidence < 0.6) {
      questions.push('Could you be more specific about what you need?');
    }

    return {
      isAmbiguous: questions.length > 0,
      questions: questions.slice(0, 3),
    };
  }

  // ============================================
  // Complexity Estimation (NEW)
  // ============================================

  private static estimateComplexity(
    result: Partial<ClassificationResult>,
  ): ClassificationComplexity {
    let agentCount = 1;
    let stepEstimate = 1;
    let level: ClassificationComplexity['level'] = 'simple';
    let reasoning = 'Single agent task';

    if (result.requiresMultipleAgents && result.agentChain) {
      agentCount = result.agentChain.length;
      stepEstimate = agentCount * 1.5; // Some steps may run in parallel

      if (agentCount >= 4) {
        level = 'very_complex';
        reasoning = `${agentCount} agents required for orchestration`;
      } else if (agentCount >= 3) {
        level = 'complex';
        reasoning = `${agentCount} agents needed for sequential execution`;
      } else {
        level = 'moderate';
        reasoning = `${agentCount} agents needed for the task`;
      }
    }

    // Adjust for entity complexity
    const entityCount = Object.keys(result.entities || {}).length;
    if (entityCount > 5) {
      level = 'very_complex';
      reasoning += `; ${entityCount} entities to process`;
    }

    return { level, agentCount, stepEstimate, reasoning };
  }

  // ============================================
  // Cache Management (NEW)
  // ============================================

  private static async checkCache(input: string): Promise<ClassificationResult | null> {
    const cacheKey = `intent:${this.hashInput(input)}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        // Redis failure — continue without cache
      }
    }

    return null;
  }

  private static async setCache(
    input: string,
    result: ClassificationResult,
    ttl: number,
  ): Promise<void> {
    const cacheKey = `intent:${this.hashInput(input)}`;

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
      } catch (error) {
        // Redis failure — continue without cache
      }
    }
  }

  private static hashInput(input: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 12);
  }

  // ============================================
  // Entity Extraction (Enhanced)
  // ============================================

  static extractEntities(input: string): Record<string, any> {
    const entities: Record<string, any> = {};
    const confidence: Record<string, number> = {};

    for (const [entityType, pattern] of Object.entries(this.ENTITY_PATTERNS)) {
      const matches = input.match(pattern);
      if (matches && matches.length > 0) {
        entities[entityType] = [...new Set(matches)]; // Deduplicate
        confidence[entityType] = 0.9; // High confidence for regex matches
      }
    }

    // Additional NLP-based entity extraction
    // (could add NER model here for names, locations, etc.)

    return entities;
  }

  // ============================================
  // Utility Methods
  // ============================================

  private static sanitizeAgentType(agentString: string): AgentType {
    const mapping: Record<string, AgentType> = {
      EMAIL: AgentType.EMAIL,
      DRIVE: AgentType.DRIVE,
      CONTENT: AgentType.CONTENT,
      SOCIAL: AgentType.SOCIAL,
      CALENDAR: AgentType.CALENDAR,
      WEB: AgentType.WEB,
      TASK: AgentType.TASK,
      ORCHESTRATOR: AgentType.ORCHESTRATOR,
      email: AgentType.EMAIL,
      drive: AgentType.DRIVE,
      content: AgentType.CONTENT,
      social: AgentType.SOCIAL,
      calendar: AgentType.CALENDAR,
      web: AgentType.WEB,
      task: AgentType.TASK,
      orchestrator: AgentType.ORCHESTRATOR,
    };
    return mapping[agentString?.toUpperCase()] || AgentType.ORCHESTRATOR;
  }

  private static generateIntentDescription(
    agentType: AgentType,
    input?: string,
  ): string {
    const descriptions: Record<AgentType, string> = {
      [AgentType.EMAIL]: 'Handle email-related request',
      [AgentType.DRIVE]: 'Manage files and documents',
      [AgentType.CONTENT]: 'Generate or analyze content',
      [AgentType.SOCIAL]: 'Post to social media',
      [AgentType.CALENDAR]: 'Manage calendar and scheduling',
      [AgentType.WEB]: 'Search web or get information',
      [AgentType.TASK]: 'Manage tasks and projects',
      [AgentType.ORCHESTRATOR]: 'General assistance',
    };

    const base = descriptions[agentType] || 'General assistance';
    return input ? `${base}: ${input.substring(0, 100)}` : base;
  }

  private static createFallbackClassification(
    input: string,
    capabilities?: Map<AgentType, AgentCapability>,
  ): ClassificationResult {
    return {
      classificationId: uuidv4(),
      classificationMethod: 'fallback',
      processingTimeMs: 0,
      cacheHit: false,
      isAmbiguous: true,
      clarityQuestions: [
        'Could you please provide more details about what you need?',
        'What kind of task would you like me to help with?',
      ],
      primaryIntent: 'General assistance',
      confidence: 0.3,
      alternativeIntents: [],
      entities: {},
      suggestedAgent: AgentType.ORCHESTRATOR,
      requiresMultipleAgents: false,
      complexity: {
        level: 'simple',
        agentCount: 1,
        stepEstimate: 1,
        reasoning: 'Fallback classification',
      },
      metadata: {
        errorMessage: 'All classification methods failed',
      },
    };
  }

  private static calculateStringSimilarity(a: string, b: string): number {
    // Normalize both strings
    const normalize = (s: string) =>
      s.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const s1 = normalize(a);
    const s2 = normalize(b);

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Simple bag-of-words Jaccard similarity
    const words1 = new Set(s1.split(' '));
    const words2 = new Set(s2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  private static updateMetrics(method: string, processingTimeMs: number): void {
    this.performanceMetrics.totalClassifications++;

    if (method === 'keyword' || method === 'hybrid') this.performanceMetrics.keywordHits++;
    if (method === 'ai') this.performanceMetrics.aiHits++;
    if (method === 'cache') this.performanceMetrics.cacheHits++;

    const total = this.performanceMetrics.totalClassifications;
    this.performanceMetrics.averageTimeMs =
      (this.performanceMetrics.averageTimeMs * (total - 1) + processingTimeMs) / total;
  }

  static getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  static getCorrectionHistory(limit: number = 50): CorrectionRecord[] {
    return this.correctionStore.slice(0, limit);
  }

  static async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
    logger.info('Intent classifier shut down');
  }
}

// Initialize on import
IntentClassifier.initialize();