// enterprise-ai-agent-platform/apps/api/src/queues/scheduled-posts.queue.ts
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { SocialTools } from '../agents/social/social.tools';

// Initialize Redis connection
const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Queue name
const SCHEDULED_POSTS_QUEUE = 'scheduled-posts';

// Create queue
export const scheduledPostsQueue = new Queue(SCHEDULED_POSTS_QUEUE, {
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
export async function schedulePost(
  postId: string,
  scheduledAt: Date,
  platform: string,
  content: string,
  mediaUrl ? : string
): Promise < void > {
  const delay = scheduledAt.getTime() - Date.now();
  
  if (delay <= 0) {
    // Post should be published immediately
    await processScheduledPost(postId);
    return;
  }
  
  await scheduledPostsQueue.add(
    `post-${postId}`,
    {
      postId,
      platform,
      content,
      mediaUrl,
    },
    {
      delay,
      jobId: `post-${postId}`,
    }
  );
  
  logger.info({ postId, scheduledAt, platform }, 'Post scheduled');
}

/**
 * Cancel a scheduled post
 */
export async function cancelScheduledPost(postId: string): Promise < boolean > {
  const job = await scheduledPostsQueue.getJob(`post-${postId}`);
  if (job) {
    await job.remove();
    logger.info({ postId }, 'Scheduled post cancelled');
    return true;
  }
  return false;
}

/**
 * Process a scheduled post
 */
async function processScheduledPost(postId: string): Promise < void > {
  try {
    // Get post from database
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
    });
    
    if (!post) {
      logger.warn({ postId }, 'Scheduled post not found');
      return;
    }
    
    if (post.status !== 'SCHEDULED') {
      logger.info({ postId, status: post.status }, 'Post already processed');
      return;
    }
    
    // Update status to processing
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: 'PROCESSING', lastRetryAt: new Date() },
    });
    
    // Execute post based on platform
    let result;
    const mediaUrls = post.mediaUrls as string[];
    const mediaUrl = mediaUrls?.[0];
    
    switch (post.platform) {
      case 'LINKEDIN':
        result = await SocialTools.postToLinkedIn(post.userId, post.content, mediaUrl);
        break;
      case 'INSTAGRAM':
        if (!mediaUrl) throw new Error('Instagram posts require an image');
        result = await SocialTools.postToInstagram(post.userId, mediaUrl, post.content);
        break;
      case 'FACEBOOK':
        result = await SocialTools.postToFacebook(post.userId, post.content, mediaUrl);
        break;
      case 'X_TWITTER':
        result = await SocialTools.postToX(post.userId, post.content, mediaUrl);
        break;
      default:
        throw new Error(`Unsupported platform: ${post.platform}`);
    }
    
    if (result.success) {
      // Update post as published
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          postId: result.postId,
        },
      });
      logger.info({ postId, platform: post.platform, platformPostId: result.postId }, 'Scheduled post published');
    } else {
      throw new Error(result.error || 'Post failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error, postId }, 'Failed to process scheduled post');
    
    // Update post status
    await prisma.scheduledPost.update({
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
export const scheduledPostsWorker = new Worker(
  SCHEDULED_POSTS_QUEUE,
  async (job: Job) => {
    const { postId } = job.data;
    await processScheduledPost(postId);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

/**
 * Reschedule failed posts
 */
export async function rescheduleFailedPosts(): Promise < number > {
  const failedPosts = await prisma.scheduledPost.findMany({
    where: {
      status: 'FAILED',
      retryCount: { lt: 3 },
      scheduledAt: { gt: new Date() },
    },
  });
  
  let rescheduled = 0;
  for (const post of failedPosts) {
    await schedulePost(post.id, post.scheduledAt, post.platform, post.content);
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: 'SCHEDULED', errorMessage: null },
    });
    rescheduled++;
  }
  
  logger.info({ rescheduled }, 'Failed posts rescheduled');
  return rescheduled;
}

/**
 * Clean up old published posts
 */
export async function cleanupPublishedPosts(daysToKeep: number = 30): Promise < number > {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await prisma.scheduledPost.deleteMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { lt: cutoffDate },
    },
  });
  
  logger.info({ deletedCount: result.count, daysToKeep }, 'Old published posts cleaned up');
  return result.count;
}

// Worker event handlers
scheduledPostsWorker.on('completed', (job) => {
  logger.info({ jobId: job.id, data: job.data }, 'Scheduled post job completed');
});

scheduledPostsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Scheduled post job failed');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await scheduledPostsWorker.close();
  await scheduledPostsQueue.close();
  await redisConnection.quit();
  logger.info('Scheduled posts queue shut down');
});