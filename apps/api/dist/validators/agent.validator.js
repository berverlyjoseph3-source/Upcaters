"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSessionStartSchema = exports.MultiPlatformPostSchema = exports.VideoGenerationSchema = exports.ImageGenerationSchema = exports.AgentStreamSchema = exports.AgentExecutionSchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/validators/agent.validator.ts
const zod_1 = require("zod");
/**
 * Agent execution request validator
 */
exports.AgentExecutionSchema = zod_1.z.object({
    input: zod_1.z.string().min(1, 'Input is required').max(10000, 'Input too long'),
    sessionId: zod_1.z.string().uuid().optional(),
    agentType: zod_1.z.enum(['orchestrator', 'email', 'drive', 'content', 'social', 'calendar', 'web', 'task']).optional(),
    action: zod_1.z.string().optional(),
    priority: zod_1.z.number().int().min(0).max(3).optional(),
    stream: zod_1.z.boolean().optional(),
    context: zod_1.z.record(zod_1.z.any()).optional(),
});
/**
 * Agent streaming request validator
 */
exports.AgentStreamSchema = zod_1.z.object({
    input: zod_1.z.string().min(1, 'Input is required').max(10000, 'Input too long'),
    sessionId: zod_1.z.string().uuid().optional(),
    agentType: zod_1.z.enum(['orchestrator', 'email', 'drive', 'content', 'social', 'calendar', 'web', 'task']).optional(),
});
/**
 * Image generation request validator
 */
exports.ImageGenerationSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
    size: zod_1.z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).optional(),
    quality: zod_1.z.enum(['standard', 'hd']).optional(),
    style: zod_1.z.enum(['vivid', 'natural']).optional(),
});
/**
 * Video generation request validator
 */
exports.VideoGenerationSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
    duration: zod_1.z.number().int().min(4).max(10).optional(),
    style: zod_1.z.string().optional(),
});
/**
 * Multi-platform post request validator
 */
exports.MultiPlatformPostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Content is required').max(5000, 'Content too long'),
    platforms: zod_1.z.array(zod_1.z.enum(['linkedin', 'instagram', 'facebook', 'x_twitter'])).min(1, 'At least one platform required'),
    mediaUrl: zod_1.z.string().url().optional(),
    scheduleAt: zod_1.z.string().datetime().optional(),
});
/**
 * Agent session start validator
 */
exports.AgentSessionStartSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid().optional(),
});
//# sourceMappingURL=agent.validator.js.map