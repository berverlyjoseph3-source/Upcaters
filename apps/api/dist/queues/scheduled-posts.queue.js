"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledPostsWorker = exports.scheduledPostsQueue = void 0;
exports.schedulePost = schedulePost;
exports.cancelScheduledPost = cancelScheduledPost;
exports.rescheduleFailedPosts = rescheduleFailedPosts;
exports.cleanupPublishedPosts = cleanupPublishedPosts;
// enterprise-ai-agent-platform/apps/api/src/queues/scheduled-posts.queue.ts
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const client_1 = require("../db/client");
const logger_1 = require("../utils/logger");
const social_tools_1 = require("../agents/social/social.tools");
// Initialize Redis connection
const redisConnection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 50, 2000),
});
// Queue name
const SCHEDULED_POSTS_QUEUE = 'scheduled-posts';
// Create queue
exports.scheduledPostsQueue = new bullmq_1.Queue(SCHEDULED_POSTS_QUEUE, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
/**
 * Schedule a post for future publishing
 */
async function schedulePost(postId, scheduledAt, platform, content, mediaUrl) {
    const delay = scheduledAt.getTime() - Date.now();
    if (delay <= 0) {
        // Post should be published immediately
        await processScheduledPost(postId);
        return;
    }
    await exports.scheduledPostsQueue.add(`post-${postId}`, {
        postId,
        platform,
        content,
        mediaUrl,
    }, {
        delay,
        jobId: `post-${postId}`,
    });
    logger_1.logger.info({ postId, scheduledAt, platform }, 'Post scheduled');
}
/**
 * Cancel a scheduled post
 */
async function cancelScheduledPost(postId) {
    const job = await exports.scheduledPostsQueue.getJob(`post-${postId}`);
    if (job) {
        await job.remove();
        logger_1.logger.info({ postId }, 'Scheduled post cancelled');
        return true;
    }
    return false;
}
/**
 * Process a scheduled post
 */
async function processScheduledPost(postId) {
    try {
        // Get post from database
        const post = await client_1.prisma.scheduledPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            logger_1.logger.warn({ postId }, 'Scheduled post not found');
            return;
        }
        if (post.status !== 'SCHEDULED') {
            logger_1.logger.info({ postId, status: post.status }, 'Post already processed');
            return;
        }
        // Update status to processing
        await client_1.prisma.scheduledPost.update({
            where: { id: postId },
            data: { status: 'PROCESSING', lastRetryAt: new Date() },
        });
        // Execute post based on platform
        let result;
        const mediaUrls = post.mediaUrls;
        const mediaUrl = mediaUrls?.[0];
        switch (post.platform) {
            case 'LINKEDIN':
                result = await social_tools_1.SocialTools.postToLinkedIn(post.userId, post.content, mediaUrl);
                break;
            case 'INSTAGRAM':
                if (!mediaUrl)
                    throw new Error('Instagram posts require an image');
                result = await social_tools_1.SocialTools.postToInstagram(post.userId, mediaUrl, post.content);
                break;
            case 'FACEBOOK':
                result = await social_tools_1.SocialTools.postToFacebook(post.userId, post.content, mediaUrl);
                break;
            case 'X_TWITTER':
                result = await social_tools_1.SocialTools.postToX(post.userId, post.content, mediaUrl);
                break;
            default:
                throw new Error(`Unsupported platform: ${post.platform}`);
        }
        if (result.success) {
            // Update post as published
            await client_1.prisma.scheduledPost.update({
                where: { id: postId },
                data: {
                    status: 'PUBLISHED',
                    publishedAt: new Date(),
                    postId: result.postId,
                },
            });
            logger_1.logger.info({ postId, platform: post.platform, platformPostId: result.postId }, 'Scheduled post published');
        }
        else {
            throw new Error(result.error || 'Post failed');
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.error({ error, postId }, 'Failed to process scheduled post');
        // Update post status
        await client_1.prisma.scheduledPost.update({
            where: { id: postId },
            data: {
                status: 'FAILED',
                errorMessage,
                retryCount: { increment: 1 },
            },
        });
    }
}
/**
 * Worker to process scheduled posts
 */
exports.scheduledPostsWorker = new bullmq_1.Worker(SCHEDULED_POSTS_QUEUE, async (job) => {
    const { postId } = job.data;
    await processScheduledPost(postId);
}, {
    connection: redisConnection,
    concurrency: 5,
});
/**
 * Reschedule failed posts
 */
async function rescheduleFailedPosts() {
    const failedPosts = await client_1.prisma.scheduledPost.findMany({
        where: {
            status: 'FAILED',
            retryCount: { lt: 3 },
            scheduledAt: { gt: new Date() },
        },
    });
    let rescheduled = 0;
    for (const post of failedPosts) {
        await schedulePost(post.id, post.scheduledAt, post.platform, post.content);
        await client_1.prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: 'SCHEDULED', errorMessage: null },
        });
        rescheduled++;
    }
    logger_1.logger.info({ rescheduled }, 'Failed posts rescheduled');
    return rescheduled;
}
/**
 * Clean up old published posts
 */
async function cleanupPublishedPosts(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const result = await client_1.prisma.scheduledPost.deleteMany({
        where: {
            status: 'PUBLISHED',
            publishedAt: { lt: cutoffDate },
        },
    });
    logger_1.logger.info({ deletedCount: result.count, daysToKeep }, 'Old published posts cleaned up');
    return result.count;
}
// Worker event handlers
exports.scheduledPostsWorker.on('completed', (job) => {
    logger_1.logger.info({ jobId: job.id, data: job.data }, 'Scheduled post job completed');
});
exports.scheduledPostsWorker.on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, error: err.message }, 'Scheduled post job failed');
});
// Graceful shutdown
process.on('SIGTERM', async () => {
    await exports.scheduledPostsWorker.close();
    await exports.scheduledPostsQueue.close();
    await redisConnection.quit();
    logger_1.logger.info('Scheduled posts queue shut down');
});
//# sourceMappingURL=scheduled-posts.queue.js.map