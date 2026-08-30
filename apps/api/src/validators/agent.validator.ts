// enterprise-ai-agent-platform/apps/api/src/validators/agent.validator.ts
import { z } from 'zod';

/**
 * Agent execution request validator
 */
export const AgentExecutionSchema = z.object({
  input: z.string().min(1, 'Input is required').max(10000, 'Input too long'),
  sessionId: z.string().uuid().optional(),
  agentType: z.enum(['orchestrator', 'email', 'drive', 'content', 'social', 'calendar', 'web', 'task']).optional(),
  action: z.string().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  stream: z.boolean().optional(),
  context: z.record(z.any()).optional(),
});

export type AgentExecutionInput = z.infer < typeof AgentExecutionSchema > ;

/**
 * Agent streaming request validator
 */
export const AgentStreamSchema = z.object({
  input: z.string().min(1, 'Input is required').max(10000, 'Input too long'),
  sessionId: z.string().uuid().optional(),
  agentType: z.enum(['orchestrator', 'email', 'drive', 'content', 'social', 'calendar', 'web', 'task']).optional(),
});

export type AgentStreamInput = z.infer < typeof AgentStreamSchema > ;

/**
 * Image generation request validator
 */
export const ImageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
});

export type ImageGenerationInput = z.infer < typeof ImageGenerationSchema > ;

/**
 * Video generation request validator
 */
export const VideoGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  duration: z.number().int().min(4).max(10).optional(),
  style: z.string().optional(),
});

export type VideoGenerationInput = z.infer < typeof VideoGenerationSchema > ;

/**
 * Multi-platform post request validator
 */
export const MultiPlatformPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  platforms: z.array(z.enum(['linkedin', 'instagram', 'facebook', 'x_twitter'])).min(1, 'At least one platform required'),
  mediaUrl: z.string().url().optional(),
  scheduleAt: z.string().datetime().optional(),
});

export type MultiPlatformPostInput = z.infer < typeof MultiPlatformPostSchema > ;

/**
 * Agent session start validator
 */
export const AgentSessionStartSchema = z.object({
  sessionId: z.string().uuid().optional(),
});

export type AgentSessionStartInput = z.infer < typeof AgentSessionStartSchema > ;