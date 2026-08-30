// enterprise-ai-agent-platform/apps/api/src/agents/orchestrator/memory-manager.ts

import { prisma } from '../../db/client';
import { Prisma } from '@prisma/client';
import { RedisInitService } from '../../services/redis-init.service';
import { logger } from '../../utils/logger';
import { MemoryEntry, AgentContext, AgentResponse } from '../../types/agent.types';
import { OpenAIService } from '../../services/ai/openai.service';
import { AnthropicService } from '../../services/ai/anthropic.service';
import { GeminiService } from '../../services/ai/gemini.service';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import crypto from 'crypto';

// ============================================
// Enhanced Types
// ============================================

export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SEMANTIC = 'semantic',
  PROCEDURAL = 'procedural',
  WORKING = 'working',
}

export interface MemoryOptions {
  maxShortTermEntries?: number;
  shortTermTTLSeconds?: number;
  longTermImportanceThreshold?: number;
  enableVectorSearch?: boolean;
  enableDeduplication?: boolean;
  deduplicationThreshold?: number;
  enableCompression?: boolean;
  compressionThreshold?: number;
  enableBatchOperations?: boolean;
  batchSize?: number;
  enableAccessTracking?: boolean;
  enableRelationshipTracking?: boolean;
}

export interface EnhancedMemoryEntry extends MemoryEntry {
  id: string;
  content: string;
  contentHash?: string;
  type: MemoryType;
  importance: number;
  timestamp: Date;
  accessCount: number;
  lastAccessedAt?: Date;
  ttlHours?: number;
  expiresAt?: Date;
  source?: 'user_input' | 'agent_output' | 'reflection' | 'system' | 'external';
  sessionId?: string;
  agentType?: string;
  tags?: string[];
  embedding?: number[];
  embeddingModel?: string;
  embeddingVersion?: string;
  relatedMemories?: string[];
  similarity?: number;
  metadata?: Record<string, any>;
  compressedSummary?: string;
  version: number;
}

export interface MemoryQueryOptions {
  query?: string;
  type?: MemoryType | MemoryType[];
  limit?: number;
  offset?: number;
  minImportance?: number;
  maxImportance?: number;
  timeRange?: { start: Date; end: Date };
  agentType?: string;
  sessionId?: string;
  tags?: string[];
  sortBy?: 'importance' | 'recency' | 'accessCount' | 'similarity';
  sortDirection?: 'asc' | 'desc';
  includeSimilarity?: boolean;
  useVectorSearch?: boolean;
  useHybridSearch?: boolean;
  hybridWeight?: number; // 0-1, weight of vector vs keyword
  minSimilarity?: number;
  deduplicate?: boolean;
  includeExpired?: boolean;
}

export interface MemoryStats {
  totalMemories: number;
  shortTermCount: number;
  longTermCount: number;
  episodicCount: number;
  semanticCount: number;
  proceduralCount: number;
  workingCount: number;
  averageImportance: number;
  totalEmbeddingTokens: number;
  totalEmbeddingCostUsd: number;
  retrievalStats: {
    totalRetrievals: number;
    averageRetrievalTimeMs: number;
    cacheHitRate: number;
    vectorSearchRate: number;
    hybridSearchRate: number;
  };
  byAgentType: Record<string, number>;
  bySession: Record<string, number>;
  bySource: Record<string, number>;
  byTag: Record<string, number>;
  accessPatterns: {
    mostAccessed: Array<{ id: string; content: string; accessCount: number }>;
    leastAccessed: Array<{ id: string; content: string; accessCount: number }>;
    averageAccessCount: number;
  };
  storageStats: {
    totalSizeBytes: number;
    averageSizeBytes: number;
    largestMemoryBytes: number;
    compressionRatio: number;
  };
  relationshipStats: {
    totalRelationships: number;
    averageRelationships: number;
    isolatedCount: number;
  };
}

export interface BatchMemoryResult {
  success: boolean;
  stored: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  totalTimeMs: number;
}

export interface MemoryRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'related' | 'parent' | 'child' | 'reference' | 'contradiction' | 'extension';
  strength: number;
  createdAt: Date;
}

// ============================================
// Enhanced Memory Manager
// ============================================

export class MemoryManager {
  private static redis: Redis;
  private static readonly SHORT_TERM_PREFIX = 'memory:short:';
  private static readonly SESSION_PREFIX = 'memory:session:';
  private static readonly EMBEDDING_CACHE_PREFIX = 'memory:embedding:';
  private static readonly ACCESS_LOG_PREFIX = 'memory:access:';
  private static readonly CACHE_TTL = 3600; // 1 hour
  private static readonly MAX_BATCH_SIZE = 100;
  private static readonly EMBEDDING_MODELS = ['text-embedding-3-small', 'text-embedding-3-large', 'embedding-001'];

  private static defaultOptions: MemoryOptions = {
    maxShortTermEntries: 50,
    shortTermTTLSeconds: 3600,
    longTermImportanceThreshold: 0.7,
    enableVectorSearch: true,
    enableDeduplication: true,
    deduplicationThreshold: 0.85,
    enableCompression: true,
    compressionThreshold: 1000, // characters
    enableBatchOperations: true,
    batchSize: 50,
    enableAccessTracking: true,
    enableRelationshipTracking: true,
  };

  // ============================================
  // Initialization
  // ============================================

  static initialize(): void {
    try {
      this.redis = RedisInitService.getClient();
      logger.info('Memory Manager initialized with Redis and PostgreSQL');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize Memory Manager');
      throw error;
    }
  }

  // ============================================
  // Enhanced Embedding Generation
  // ============================================

  /**
   * Generate embeddings with fallback across multiple providers
   */
  private static async generateEmbeddingEnhanced(
    text: string,
  ): Promise<{ embedding: number[]; model: string; tokens: number; costUsd: number }> {
    const startTime = Date.now();

    // Try multiple providers with fallback
    const providers = [
      {
        name: 'openai',
        generate: async () => {
          const result = await OpenAIService.createEmbedding({
            input: text,
            model: this.EMBEDDING_MODELS[0],
          });
          return {
            embedding: result.embeddings[0],
            model: 'text-embedding-3-small',
            tokens: result.tokensUsed,
            costUsd: result.tokensUsed * 0.00000002, // $0.02 per 1M tokens
          };
        },
      },
      {
        name: 'gemini',
        generate: async () => {
          const result = await GeminiService.createEmbedding(text);
          return {
            embedding: result.embeddings[0],
            model: 'embedding-001',
            tokens: result.tokensUsed,
            costUsd: result.tokensUsed * 0.00000001, // $0.01 per 1M tokens
          };
        },
      },
      {
        name: 'anthropic',
        generate: async () => {
          // Anthropic uses a different embedding approach
          const result = await AnthropicService.estimateTokens(text);
          // Fallback to hash-based pseudo-embedding
          const hash = crypto.createHash('sha256').update(text).digest();
          const embedding = Array.from(new Uint8Array(hash)).map(b => b / 255);
          return {
            embedding,
            model: 'anthropic-fallback',
            tokens: result,
            costUsd: 0,
          };
        },
      },
    ];

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        const result = await provider.generate();
        logger.debug({
          provider: provider.name,
          model: result.model,
          tokens: result.tokens,
          durationMs: Date.now() - startTime,
        }, 'Embedding generated');
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn({ provider: provider.name, error: lastError.message }, 'Embedding provider failed, trying next');
      }
    }

    // Ultimate fallback: hash-based embedding
    logger.error({ error: lastError }, 'All embedding providers failed, using hash fallback');
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding = Array.from(new Uint8Array(hash)).map(b => b / 255);
    return {
      embedding,
      model: 'hash-fallback',
      tokens: 0,
      costUsd: 0,
    };
  }

  // ============================================
  // Enhanced Short-Term Memory
  // ============================================

  /**
   * Store with deduplication and compression
   */
  static async storeShortTermEnhanced(
    userId: string,
    content: string,
    metadata?: Record<string, any>,
    options?: MemoryOptions,
  ): Promise<EnhancedMemoryEntry> {
    const opts = { ...this.defaultOptions, ...options };
    const key = `${this.SHORT_TERM_PREFIX}${userId}`;

    // Generate content hash for deduplication
    const contentHash = crypto.createHash('md5').update(content).digest('hex');

    // Get existing memories
    const existing = await this.redis.get(key);
    let memories: EnhancedMemoryEntry[] = existing ? JSON.parse(existing) : [];

    // Deduplication check
    if (opts.enableDeduplication) {
      const duplicate = memories.find(m => m.contentHash === contentHash);
      if (duplicate) {
        // Update access count and timestamp instead of creating duplicate
        duplicate.accessCount = (duplicate.accessCount || 0) + 1;
        duplicate.lastAccessedAt = new Date();
        duplicate.timestamp = new Date();
        await this.redis.setex(key, opts.shortTermTTLSeconds!, JSON.stringify(memories));
        logger.debug({ userId, memoryId: duplicate.id }, 'Updated existing short-term memory');
        return duplicate;
      }
    }

    // Compress content if too long
    let compressedContent = content;
    let compressedSummary: string | undefined;

    if (opts.enableCompression && content.length > opts.compressionThreshold!) {
      const compressed = await this.compressContent(content);
      compressedSummary = compressed.summary;
      compressedContent = compressed.content;
    }

    // Create entry
    const entry: EnhancedMemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: compressedContent,
      contentHash,
      type: MemoryType.SHORT_TERM,
      importance: 0.5,
      timestamp: new Date(),
      accessCount: 0,
      source: metadata?.source || 'user_input',
      sessionId: metadata?.sessionId,
      agentType: metadata?.agentType,
      tags: metadata?.tags || [],
      compressedSummary,
      version: 1,
      metadata,
    };

    // Add to list
    memories.unshift(entry);

    // Trim if exceeding limit
    if (memories.length > opts.maxShortTermEntries!) {
      // Move oldest to long-term
      const toConsolidate = memories.splice(opts.maxShortTermEntries!);
      for (const memory of toConsolidate) {
        if (memory.importance >= opts.longTermImportanceThreshold!) {
          await this.storeLongTermEnhanced(userId, memory.content, memory.importance, {
            ...memory.metadata,
            consolidatedFrom: 'short_term',
            shortTermId: memory.id,
          });
        }
      }
    }

    // Store back to Redis
    await this.redis.setex(key, opts.shortTermTTLSeconds!, JSON.stringify(memories));

    logger.debug({ userId, memoryId: entry.id, compressionApplied: !!compressedSummary }, 'Enhanced short-term memory stored');

    return entry;
  }

  // ============================================
  // Enhanced Long-Term Memory
  // ============================================

  /**
   * Store with embedding caching and relationship building
   */
  static async storeLongTermEnhanced(
    userId: string,
    content: string,
    importance: number,
    metadata?: Record<string, any>,
    generateEmbedding: boolean = true,
    options?: MemoryOptions,
  ): Promise<EnhancedMemoryEntry> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      // Generate content hash
      const contentHash = crypto.createHash('md5').update(content).digest('hex');

      // Check for exact duplicates in DB
      if (opts.enableDeduplication) {
        const existing = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM agent_memory 
          WHERE user_id = ${userId}::uuid 
            AND content_hash = ${contentHash}
          LIMIT 1
        `;

        if (existing.length > 0) {
          // Update existing memory
          await prisma.$executeRaw`
            UPDATE agent_memory 
            SET access_count = access_count + 1,
                last_accessed_at = NOW(),
                importance = GREATEST(importance, ${importance}),
                version = version + 1,
                updated_at = NOW()
            WHERE id = ${existing[0].id}::uuid
          `;

          logger.debug({ userId, memoryId: existing[0].id }, 'Updated existing long-term memory');
          return await this.getMemoryById(existing[0].id);
        }
      }

      // Compress if needed
      let compressedContent = content;
      let compressedSummary: string | undefined;

      if (opts.enableCompression && content.length > opts.compressionThreshold!) {
        const compressed = await this.compressContent(content);
        compressedSummary = compressed.summary;
        compressedContent = compressed.content;
      }

      // Generate embedding (with caching)
      let embedding: number[] | undefined;
      let embeddingModel: string | undefined;
      let embeddingTokens = 0;
      let embeddingCost = 0;

      if (generateEmbedding && opts.enableVectorSearch) {
        // Check embedding cache
        const cacheKey = `${this.EMBEDDING_CACHE_PREFIX}${contentHash}`;
        const cachedEmbedding = await this.redis.get(cacheKey);

        if (cachedEmbedding) {
          const cached = JSON.parse(cachedEmbedding);
          embedding = cached.embedding;
          embeddingModel = cached.model;
          logger.debug({ userId, cacheHit: true }, 'Embedding cache hit');
        } else {
          // Generate new embedding
          const result = await this.generateEmbeddingEnhanced(compressedContent);
          embedding = result.embedding;
          embeddingModel = result.model;
          embeddingTokens = result.tokens;
          embeddingCost = result.costUsd;

          // Cache the embedding
          await this.redis.setex(
            cacheKey,
            this.CACHE_TTL,
            JSON.stringify({ embedding: result.embedding, model: result.model }),
          );
        }
      }

      // Calculate TTL
      const ttlHours = Math.max(1, Math.floor(importance * 720)); // Up to 30 days
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      // Create entry
      const entryId = uuidv4();

      await prisma.$executeRaw`
        INSERT INTO agent_memory (
          id, user_id, memory_type, content, content_hash,
          compressed_summary, embedding, embedding_model,
          importance, access_count, ttl_hours, expires_at,
          source, session_id, agent_type, tags,
          version, metadata, created_at, updated_at
        ) VALUES (
          ${entryId}::uuid,
          ${userId}::uuid,
          ${MemoryType.LONG_TERM},
          ${compressedContent},
          ${contentHash},
          ${compressedSummary || null},
          ${embedding ? `[${embedding.join(',')}]` : null}::vector,
          ${embeddingModel || null},
          ${importance},
          0,
          ${ttlHours},
          ${expiresAt},
          ${metadata?.source || 'system'},
          ${metadata?.sessionId || null},
          ${metadata?.agentType || null},
          ${metadata?.tags ? JSON.stringify(metadata.tags) : null}::jsonb,
          1,
          ${JSON.stringify(metadata || {})}::jsonb,
          NOW(),
          NOW()
        )
      `;

      // Build relationships if enabled
      if (opts.enableRelationshipTracking) {
        await this.buildRelationships(entryId, compressedContent, userId);
      }

      const entry: EnhancedMemoryEntry = {
        id: entryId,
        content: compressedContent,
        contentHash,
        type: MemoryType.LONG_TERM,
        importance,
        timestamp: new Date(),
        accessCount: 0,
        ttlHours,
        expiresAt,
        source: metadata?.source || 'system',
        sessionId: metadata?.sessionId,
        agentType: metadata?.agentType,
        tags: metadata?.tags || [],
        embedding,
        embeddingModel,
        compressedSummary,
        version: 1,
        metadata,
      };

      logger.info({
        userId,
        memoryId: entry.id,
        importance,
        embeddingGenerated: generateEmbedding,
        compressionApplied: !!compressedSummary,
        storeTimeMs: Date.now() - startTime,
      }, 'Enhanced long-term memory stored');

      return entry;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to store enhanced long-term memory');
      throw error;
    }
  }

  // ============================================
  // Enhanced Retrieval
  // ============================================

  /**
   * Hybrid retrieval: vector + keyword + relationship-based
   */
  static async retrieveMemoriesEnhanced(
    userId: string,
    options: MemoryQueryOptions,
  ): Promise<{
    memories: EnhancedMemoryEntry[];
    total: number;
    retrievalTimeMs: number;
    method: 'vector' | 'keyword' | 'hybrid';
    queryEmbedding?: number[];
  }> {
    const startTime = Date.now();
    const opts = {
      limit: options.limit || 10,
      offset: options.offset || 0,
      minImportance: options.minImportance || 0,
      sortBy: options.sortBy || 'recency',
      sortDirection: options.sortDirection || 'desc',
      useHybridSearch: options.useHybridSearch ?? true,
      hybridWeight: options.hybridWeight ?? 0.6, // 60% vector, 40% keyword
    };

    let retrievalMethod: 'vector' | 'keyword' | 'hybrid' = 'keyword';
    let queryEmbedding: number[] | undefined;

    // Step 1: Try vector search if enabled and query provided
    if (options.useVectorSearch !== false && options.query && this.defaultOptions.enableVectorSearch) {
      try {
        const embeddingResult = await this.generateEmbeddingEnhanced(options.query);
        queryEmbedding = embeddingResult.embedding;

        if (options.useHybridSearch) {
          // Hybrid: combine vector + keyword
          const results = await this.hybridSearch(userId, options.query, queryEmbedding, opts);
          retrievalMethod = 'hybrid';
          return {
            memories: results.memories,
            total: results.total,
            retrievalTimeMs: Date.now() - startTime,
            method: retrievalMethod,
            queryEmbedding,
          };
        } else {
          // Pure vector search
          const results = await this.vectorSearch(userId, queryEmbedding, opts);
          retrievalMethod = 'vector';
          return {
            memories: results.memories,
            total: results.total,
            retrievalTimeMs: Date.now() - startTime,
            method: retrievalMethod,
            queryEmbedding,
          };
        }
      } catch (error) {
        logger.warn({ error }, 'Vector search failed, falling back to keyword search');
      }
    }

    // Step 2: Keyword search as fallback
    const keywordResults = await this.keywordSearch(userId, options, opts);
    retrievalMethod = 'keyword';

    return {
      memories: keywordResults.memories,
      total: keywordResults.total,
      retrievalTimeMs: Date.now() - startTime,
      method: retrievalMethod,
    };
  }

  /**
   * Hybrid search combining vector similarity and keyword relevance
   */
  private static async hybridSearch(
    userId: string,
    query: string,
    queryEmbedding: number[],
    options: any,
  ): Promise<{ memories: EnhancedMemoryEntry[]; total: number }> {
    const startTime = Date.now();

    try {
      // Get results from both methods
      const [vectorResults, keywordResults] = await Promise.all([
        this.vectorSearch(userId, queryEmbedding, { ...options, limit: options.limit * 2 }),
        this.keywordSearch(userId, { query, ...options }, { ...options, limit: options.limit * 2 }),
      ]);

      // Normalize scores
      const allResults = new Map<string, { memory: EnhancedMemoryEntry; vectorScore: number; keywordScore: number }>();

      // Add vector results
      for (const memory of vectorResults.memories) {
        allResults.set(memory.id, {
          memory,
          vectorScore: memory.similarity || 0,
          keywordScore: 0,
        });
      }

      // Add keyword results
      for (const memory of keywordResults.memories) {
        const existing = allResults.get(memory.id);
        if (existing) {
          existing.keywordScore = memory.similarity || 0;
        } else {
          allResults.set(memory.id, {
            memory,
            vectorScore: 0,
            keywordScore: memory.similarity || 0,
          });
        }
      }

      // Calculate hybrid score
      const hybridResults = Array.from(allResults.values())
        .map(item => ({
          ...item.memory,
          similarity:
            (item.vectorScore * options.hybridWeight) +
            (item.keywordScore * (1 - options.hybridWeight)),
        }))
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(options.offset, options.offset + options.limit);

      logger.debug({
        searchTimeMs: Date.now() - startTime,
        resultCount: hybridResults.length,
        method: 'hybrid',
      }, 'Hybrid search completed');

      return {
        memories: hybridResults,
        total: allResults.size,
      };
    } catch (error) {
      logger.error({ error }, 'Hybrid search failed');
      throw error;
    }
  }

  /**
   * Vector similarity search
   */
  private static async vectorSearch(
    userId: string,
    queryEmbedding: number[],
    options: any,
  ): Promise<{ memories: EnhancedMemoryEntry[]; total: number }> {
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const [results, countResult] = await Promise.all([
      prisma.$queryRaw<Array<any>>`
        SELECT 
          id, content, content_hash, compressed_summary,
          memory_type, importance, access_count,
          last_accessed_at, ttl_hours, expires_at,
          source, session_id, agent_type, tags,
          embedding_model, version, metadata,
          created_at, updated_at,
          1 - (embedding <=> ${embeddingStr}::vector) as similarity
        FROM agent_memory
        WHERE user_id = ${userId}::uuid
          AND memory_type = '${MemoryType.LONG_TERM}'
          AND importance >= ${options.minImportance}
          AND expires_at > NOW()
          AND embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT ${options.limit}
        OFFSET ${options.offset}
      `,
      prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid
          AND memory_type = '${MemoryType.LONG_TERM}'
          AND embedding IS NOT NULL
          AND expires_at > NOW()
      `,
    ]);

    const memories = results.map(r => this.mapDbRowToMemoryEntry(r));
    const total = parseInt(countResult[0]?.count || '0');

    return { memories, total };
  }

  /**
   * Keyword-based search
   */
  private static async keywordSearch(
    userId: string,
    options: MemoryQueryOptions,
    queryOptions: any,
  ): Promise<{ memories: EnhancedMemoryEntry[]; total: number }> {
    const keywords = options.query
      ? options.query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      : [];

    // SECURITY: every condition below uses Prisma.sql's tagged-template
    // parameter binding — values are never concatenated into the SQL string.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`user_id = ${userId}::uuid`,
      Prisma.sql`memory_type = ${MemoryType.LONG_TERM}`,
      Prisma.sql`expires_at > NOW()`,
    ];

    if (options.minImportance) {
      conditions.push(Prisma.sql`importance >= ${options.minImportance}`);
    }

    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      conditions.push(Prisma.sql`memory_type IN (${Prisma.join(types)})`);
    }

    if (options.agentType) {
      conditions.push(Prisma.sql`agent_type = ${options.agentType}`);
    }

    if (options.sessionId) {
      conditions.push(Prisma.sql`session_id = ${options.sessionId}`);
    }

    if (keywords.length > 0) {
      const keywordConditions = keywords.map(
        (k) => Prisma.sql`(content ILIKE ${'%' + k + '%'} OR compressed_summary ILIKE ${'%' + k + '%'})`
      );
      conditions.push(Prisma.sql`(${Prisma.join(keywordConditions, ' OR ')})`);
    }

    const whereClause = Prisma.join(conditions, ' AND ');

    // orderBy is derived from a fixed 3-value whitelist below (never raw user
    // input), so building it via Prisma.raw is safe.
    const orderByColumn = queryOptions.sortBy === 'importance'
    const orderByColumn = queryOptions.sortBy === 'importance'
      ? 'importance DESC'
      : queryOptions.sortBy === 'accessCount'
        ? 'access_count DESC'
        : 'created_at DESC';

    const similarityExpr = keywords.length > 0
      ? Prisma.sql`(CASE WHEN content ILIKE ${'%' + keywords.join('%') + '%'} THEN 1.0 ELSE 0.5 END) as similarity`
      : Prisma.sql`0.5 as similarity`;

    const [results, countResult] = await Promise.all([
      prisma.$queryRaw<Array<any>>`
        SELECT 
          id, content, content_hash, compressed_summary,
          memory_type, importance, access_count,
          last_accessed_at, ttl_hours, expires_at,
          source, session_id, agent_type, tags,
          embedding_model, version, metadata,
          created_at, updated_at,
          ${similarityExpr}
        FROM agent_memory
        WHERE ${whereClause}
        ORDER BY ${Prisma.raw(orderByColumn)}
        LIMIT ${queryOptions.limit}
        OFFSET ${queryOptions.offset}
      `,
      prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM agent_memory WHERE ${whereClause}
      `,
    ]);

    const memories = results.map(r => this.mapDbRowToMemoryEntry(r));
    const total = parseInt(countResult[0]?.count || '0');

    return { memories, total };
  }

  // ============================================
  // Content Compression
  // ============================================

  /**
   * Compress long content into a summary
   */
  private static async compressContent(
    content: string,
  ): Promise<{ content: string; summary: string }> {
    try {
      // For very long content, generate an AI summary
      if (content.length > 5000) {
        const prompt = `Summarize the following content in 2-3 sentences while preserving key information:

${content.substring(0, 10000)}

Summary:`;

        const result = await OpenAIService.complete({
          prompt,
          temperature: 0.3,
          maxTokens: 200,
        });

        return {
          content, // Keep original content
          summary: result.content.trim(),
        };
      }

      // For medium content, use extractive summarization
      const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
      if (sentences.length <= 3) {
        return { content, summary: content };
      }

      // Simple extractive: take first and last sentence
      const summary = `${sentences[0]!.trim()} ... ${sentences[sentences.length - 1]!.trim()}`;
      return { content, summary };
    } catch (error) {
      logger.warn({ error }, 'Content compression failed');
      return { content, summary: content.substring(0, 200) + '...' };
    }
  }

  // ============================================
  // Relationship Building
  // ============================================

  /**
   * Build semantic relationships between memories
   */
  private static async buildRelationships(
    memoryId: string,
    content: string,
    userId: string,
  ): Promise<void> {
    try {
      // Find similar memories
      const embedding = await this.generateEmbeddingEnhanced(content);
      const similarMemories = await this.vectorSearch(userId, embedding.embedding, {
        limit: 5,
        offset: 0,
        minImportance: 0.3,
      });

      // Create relationships
      for (const similar of similarMemories.memories) {
        if (similar.id !== memoryId && (similar.similarity || 0) > 0.7) {
          const relationshipType = (similar.similarity || 0) > 0.9
            ? 'extension'
            : (similar.similarity || 0) > 0.8
              ? 'related'
              : 'reference';

          await prisma.$executeRaw`
            INSERT INTO memory_relationships (
              id, source_id, target_id, type, strength, created_at
            ) VALUES (
              ${uuidv4()}::uuid,
              ${memoryId}::uuid,
              ${similar.id}::uuid,
              ${relationshipType},
              ${similar.similarity || 0.5},
              NOW()
            )
            ON CONFLICT (source_id, target_id) DO UPDATE
            SET strength = GREATEST(memory_relationships.strength, ${similar.similarity || 0.5}),
                updated_at = NOW()
          `;
        }
      }
    } catch (error) {
      logger.warn({ error, memoryId }, 'Failed to build relationships');
    }
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Batch store multiple memories
   */
  static async batchStoreMemories(
    userId: string,
    memories: Array<{ content: string; importance?: number; type?: MemoryType; metadata?: Record<string, any> }>,
    options?: MemoryOptions,
  ): Promise<BatchMemoryResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const results: BatchMemoryResult = {
      success: true,
      stored: 0,
      failed: 0,
      errors: [],
      totalTimeMs: 0,
    };

    // Process in batches
    for (let i = 0; i < memories.length; i += opts.batchSize!) {
      const batch = memories.slice(i, i + opts.batchSize!);
      const promises = batch.map(async (memory, index) => {
        try {
          const type = memory.type || MemoryType.LONG_TERM;
          const importance = memory.importance || 0.5;

          if (type === MemoryType.SHORT_TERM) {
            await this.storeShortTermEnhanced(userId, memory.content, memory.metadata, opts);
          } else {
            await this.storeLongTermEnhanced(userId, memory.content, importance, memory.metadata, true, opts);
          }
          return { success: true, index: i + index };
        } catch (error) {
          return {
            success: false,
            index: i + index,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });

      const batchResults = await Promise.all(promises);

      for (const result of batchResults) {
        if (result.success) {
          results.stored++;
        } else {
          results.failed++;
          results.errors.push({ index: result.index, error: result.error! });
        }
      }
    }

    results.success = results.failed === 0;
    results.totalTimeMs = Date.now() - startTime;

    logger.info({
      userId,
      total: memories.length,
      stored: results.stored,
      failed: results.failed,
      timeMs: results.totalTimeMs,
    }, 'Batch memory storage completed');

    return results;
  }

  // ============================================
  // Access Pattern Tracking
  // ============================================

  /**
   * Track memory access with logging
   */
  private static async trackAccess(memoryId: string, userId: string): Promise<void> {
    if (!this.defaultOptions.enableAccessTracking) return;

    try {
      const accessKey = `${this.ACCESS_LOG_PREFIX}${memoryId}`;
      const today = new Date().toISOString().split('T')[0];

      await Promise.all([
        // Increment access count
        prisma.$executeRaw`
          UPDATE agent_memory 
          SET access_count = access_count + 1,
              last_accessed_at = NOW()
          WHERE id = ${memoryId}::uuid
        `,
        // Log access for analytics
        this.redis.hincrby(accessKey, today, 1),
        this.redis.expire(accessKey, 86400 * 30), // 30 days
      ]);
    } catch (error) {
      logger.warn({ error, memoryId }, 'Failed to track access');
    }
  }

  // ============================================
  // Enhanced Statistics
  // ============================================

  /**
   * Get comprehensive memory statistics
   */
  static async getEnhancedMemoryStats(userId: string): Promise<MemoryStats> {
    const [
      typeDistribution,
      sourceDistribution,
      agentDistribution,
      sessionDistribution,
      tagDistribution,
      accessStats,
      storageStats,
      relationshipStats,
      totalCount,
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ memory_type: string; count: string }>>`
        SELECT memory_type, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
        GROUP BY memory_type
      `,
      prisma.$queryRaw<Array<{ source: string; count: string }>>`
        SELECT source, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
        GROUP BY source
      `,
      prisma.$queryRaw<Array<{ agent_type: string; count: string }>>`
        SELECT agent_type, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW() AND agent_type IS NOT NULL
        GROUP BY agent_type
      `,
      prisma.$queryRaw<Array<{ session_id: string; count: string }>>`
        SELECT session_id, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW() AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY count DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ tag: string; count: string }>>`
        SELECT jsonb_array_elements_text(tags) as tag, COUNT(*) as count
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW() AND tags IS NOT NULL
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `,
      prisma.$queryRaw<Array<{ most_accessed: any; least_accessed: any; avg_access: string }>>`
        SELECT 
          (SELECT json_agg(row_to_json(t)) FROM (
            SELECT id, content, access_count FROM agent_memory 
            WHERE user_id = ${userId}::uuid AND expires_at > NOW()
            ORDER BY access_count DESC LIMIT 5
          ) t) as most_accessed,
          (SELECT json_agg(row_to_json(t)) FROM (
            SELECT id, content, access_count FROM agent_memory 
            WHERE user_id = ${userId}::uuid AND expires_at > NOW()
            ORDER BY access_count ASC LIMIT 5
          ) t) as least_accessed,
          COALESCE(AVG(access_count), 0)::text as avg_access
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
      `,
      prisma.$queryRaw<Array<{ total_size: string; avg_size: string; max_size: string; avg_compression: string }>>`
        SELECT 
          COALESCE(SUM(LENGTH(content)), 0)::text as total_size,
          COALESCE(AVG(LENGTH(content)), 0)::text as avg_size,
          COALESCE(MAX(LENGTH(content)), 0)::text as max_size,
          COALESCE(AVG(CASE WHEN compressed_summary IS NOT NULL THEN LENGTH(compressed_summary)::float / NULLIF(LENGTH(content), 0) ELSE 1.0 END), 1.0)::text as avg_compression
        FROM agent_memory
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
      `,
      prisma.$queryRaw<Array<{ total_rel: string; avg_rel: string; isolated: string }>>`
        SELECT 
          COALESCE((SELECT COUNT(*) FROM memory_relationships), 0)::text as total_rel,
          CASE 
            WHEN (SELECT COUNT(*) FROM agent_memory WHERE user_id = ${userId}::uuid AND expires_at > NOW()) > 0 
            THEN (COALESCE((SELECT COUNT(*) FROM memory_relationships), 0)::float / (SELECT COUNT(*) FROM agent_memory WHERE user_id = ${userId}::uuid AND expires_at > NOW()))::text
            ELSE '0'
          END as avg_rel,
          COALESCE((SELECT COUNT(*) FROM agent_memory m 
            WHERE m.user_id = ${userId}::uuid AND m.expires_at > NOW()
            AND NOT EXISTS (SELECT 1 FROM memory_relationships r WHERE r.source_id = m.id OR r.target_id = m.id)
          ), 0)::text as isolated
      `,
      prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM agent_memory 
        WHERE user_id = ${userId}::uuid AND expires_at > NOW()
      `,
    ]);

    const total = parseInt(totalCount[0]?.count || '0');
    const stats: MemoryStats = {
      totalMemories: total,
      shortTermCount: 0,
      longTermCount: 0,
      episodicCount: 0,
      semanticCount: 0,
      proceduralCount: 0,
      workingCount: 0,
      averageImportance: 0,
      totalEmbeddingTokens: 0,
      totalEmbeddingCostUsd: 0,
      retrievalStats: {
        totalRetrievals: 0,
        averageRetrievalTimeMs: 0,
        cacheHitRate: 0,
        vectorSearchRate: 0,
        hybridSearchRate: 0,
      },
      byAgentType: {},
      bySession: {},
      bySource: {},
      byTag: {},
      accessPatterns: {
        mostAccessed: [],
        leastAccessed: [],
        averageAccessCount: parseFloat(accessStats[0]?.avg_access || '0'),
      },
      storageStats: {
        totalSizeBytes: parseInt(storageStats[0]?.total_size || '0'),
        averageSizeBytes: parseInt(storageStats[0]?.avg_size || '0'),
        largestMemoryBytes: parseInt(storageStats[0]?.max_size || '0'),
        compressionRatio: parseFloat(storageStats[0]?.avg_compression || '1'),
      },
      relationshipStats: {
        totalRelationships: parseInt(relationshipStats[0]?.total_rel || '0'),
        averageRelationships: parseFloat(relationshipStats[0]?.avg_rel || '0'),
        isolatedCount: parseInt(relationshipStats[0]?.isolated || '0'),
      },
    };

    // Map type distribution
    for (const row of typeDistribution) {
      const count = parseInt(row.count);
      switch (row.memory_type) {
        case MemoryType.SHORT_TERM: stats.shortTermCount = count; break;
        case MemoryType.LONG_TERM: stats.longTermCount = count; break;
        case MemoryType.EPISODIC: stats.episodicCount = count; break;
        case MemoryType.SEMANTIC: stats.semanticCount = count; break;
        case MemoryType.PROCEDURAL: stats.proceduralCount = count; break;
        case MemoryType.WORKING: stats.workingCount = count; break;
      }
    }

    // Map source distribution
    for (const row of sourceDistribution) {
      if (row.source) stats.bySource[row.source] = parseInt(row.count);
    }

    // Map agent distribution
    for (const row of agentDistribution) {
      if (row.agent_type) stats.byAgentType[row.agent_type] = parseInt(row.count);
    }

    // Map session distribution
    for (const row of sessionDistribution) {
      if (row.session_id) stats.bySession[row.session_id] = parseInt(row.count);
    }

    // Map tag distribution
    for (const row of tagDistribution) {
      if (row.tag) stats.byTag[row.tag] = parseInt(row.count);
    }

    // Map access patterns
    if (accessStats[0]?.most_accessed) {
      stats.accessPatterns.mostAccessed = JSON.parse(accessStats[0].most_accessed) || [];
    }
    if (accessStats[0]?.least_accessed) {
      stats.accessPatterns.leastAccessed = JSON.parse(accessStats[0].least_accessed) || [];
    }

    return stats;
  }

  // ============================================
  // Utility Methods
  // ============================================

  private static mapDbRowToMemoryEntry(row: any): EnhancedMemoryEntry {
    return {
      id: row.id,
      content: row.content,
      contentHash: row.content_hash,
      type: row.memory_type as MemoryType,
      importance: parseFloat(row.importance),
      timestamp: new Date(row.created_at),
      accessCount: parseInt(row.access_count),
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
      ttlHours: row.ttl_hours ? parseInt(row.ttl_hours) : undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      source: row.source,
      sessionId: row.session_id,
      agentType: row.agent_type,
      tags: row.tags ? (Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)) : [],
      embedding: row.embedding,
      embeddingModel: row.embedding_model,
      compressedSummary: row.compressed_summary,
      similarity: row.similarity ? parseFloat(row.similarity) : undefined,
      version: parseInt(row.version || '1'),
      metadata: row.metadata,
    };
  }

  private static async getMemoryById(id: string): Promise<EnhancedMemoryEntry> {
    const result = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM agent_memory WHERE id = ${id}::uuid
    `;
    if (result.length === 0) throw new Error(`Memory not found: ${id}`);
    return this.mapDbRowToMemoryEntry(result[0]);
  }

  // Legacy compatibility methods
  static async storeShortTerm(userId: string, content: string, metadata?: Record<string, any>): Promise<EnhancedMemoryEntry> {
    return this.storeShortTermEnhanced(userId, content, metadata);
  }

  static async storeLongTerm(userId: string, content: string, importance: number, metadata?: Record<string, any>, generateEmbedding?: boolean): Promise<EnhancedMemoryEntry> {
    return this.storeLongTermEnhanced(userId, content, importance, metadata, generateEmbedding);
  }

  static async getShortTerm(userId: string, limit?: number): Promise<EnhancedMemoryEntry[]> {
    const key = `${this.SHORT_TERM_PREFIX}${userId}`;
    const data = await this.redis.get(key);
    if (!data) return [];
    const memories: EnhancedMemoryEntry[] = JSON.parse(data);
    return limit ? memories.slice(0, limit) : memories;
  }

  static async retrieveRelevantMemories(userId: string, query: string, limit: number = 5, minImportance: number = 0.5): Promise<EnhancedMemoryEntry[]> {
    const result = await this.retrieveMemoriesEnhanced(userId, {
      query,
      limit,
      minImportance,
      useHybridSearch: true,
    });
    return result.memories;
  }

  static async getSessionMemories(sessionId: string, limit?: number): Promise<EnhancedMemoryEntry[]> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    if (!data) return [];
    const memories: EnhancedMemoryEntry[] = JSON.parse(data);
    return limit ? memories.slice(-limit) : memories;
  }

  static async storeSessionMemory(sessionId: string, content: string, metadata?: Record<string, any>): Promise<EnhancedMemoryEntry> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const entry: EnhancedMemoryEntry = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      contentHash: crypto.createHash('md5').update(content).digest('hex'),
      type: MemoryType.SHORT_TERM,
      importance: 0.6,
      timestamp: new Date(),
      accessCount: 0,
      version: 1,
      metadata: { ...metadata, sessionId },
    };

    const existing = await this.redis.get(key);
    let memories: EnhancedMemoryEntry[] = existing ? JSON.parse(existing) : [];
    memories.push(entry);
    if (memories.length > 100) memories = memories.slice(-100);
    await this.redis.setex(key, 86400, JSON.stringify(memories));

    return entry;
  }

  static async buildContext(userId: string, sessionId: string, query: string, includeShortTerm: boolean = true, includeLongTerm: boolean = true, maxMemories: number = 10): Promise<string> {
    const contextParts: string[] = [];

    if (includeShortTerm) {
      const sessionMemories = await this.getSessionMemories(sessionId, 5);
      if (sessionMemories.length > 0) {
        contextParts.push('## Recent Conversation History:');
        sessionMemories.forEach(m => {
          contextParts.push(`- ${m.content.substring(0, 200)}`);
        });
        contextParts.push('');
      }
    }

    if (includeLongTerm) {
      const relevantMemories = await this.retrieveRelevantMemories(userId, query, maxMemories);
      if (relevantMemories.length > 0) {
        contextParts.push('## Relevant Past Information:');
        relevantMemories.forEach(m => {
          contextParts.push(`- ${m.content.substring(0, 200)} (importance: ${Math.round(m.importance * 100)}%)`);
        });
        contextParts.push('');
      }
    }

    return contextParts.join('\n');
  }

  static async clearSession(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await this.redis.del(key);
    logger.info({ sessionId }, 'Session memories cleared');
  }

  static async clearShortTerm(userId: string): Promise<void> {
    const key = `${this.SHORT_TERM_PREFIX}${userId}`;
    await this.redis.del(key);
    logger.info({ userId }, 'Short-term memories cleared');
  }

  static async consolidateMemories(userId: string): Promise<number> {
    const startTime = Date.now();
    const shortTermMemories = await this.getShortTerm(userId);

    if (shortTermMemories.length === 0) return 0;

    let consolidated = 0;

    for (const memory of shortTermMemories) {
      if (memory.importance >= (this.defaultOptions.longTermImportanceThreshold || 0.7)) {
        try {
          await this.storeLongTermEnhanced(userId, memory.content, memory.importance, {
            ...memory.metadata,
            consolidatedFrom: 'short_term',
            consolidatedAt: new Date().toISOString(),
          });
          consolidated++;
        } catch (error) {
          logger.warn({ error, memoryId: memory.id }, 'Failed to consolidate memory');
        }
      }
    }

    logger.info({
      userId,
      consolidated,
      total: shortTermMemories.length,
      timeMs: Date.now() - startTime,
    }, 'Memories consolidated');

    return consolidated;
  }

  static async cleanupExpiredMemories(): Promise<number> {
    const result = await prisma.$executeRaw`
      DELETE FROM agent_memory 
      WHERE expires_at < NOW()
    `;
    logger.info({ deletedCount: result }, 'Expired long-term memories cleaned up');
    return result;
  }

  static async shutdown(): Promise<void> {
    logger.info('Memory Manager shut down');
  }
}

// Auto-initialize
MemoryManager.initialize();