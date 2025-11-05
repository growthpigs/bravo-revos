/**
 * Pod Automation Engine - Job Queue
 * Processes engagement jobs (likes and comments) for pod members
 */

import { Queue, Worker, Job } from 'bullmq';
import {
  getPendingActivities,
  scheduleLikeActivities,
  scheduleCommentActivities,
  markActivityExecuted,
  updateMemberEngagementMetrics,
  getPodEngagementStats,
} from '../pods/engagement-scheduler';
import { getRedisConnection } from '../redis';
import { POD_AUTOMATION_CONFIG, LOGGING_CONFIG } from '../config';

const QUEUE_NAME = 'pod-automation';
const LOG_PREFIX = LOGGING_CONFIG.PREFIX_POD_AUTOMATION;

export interface PodAutomationJobData {
  podId: string;
  jobType: 'schedule-likes' | 'schedule-comments' | 'execute-engagement';
  activityId?: string; // For individual activity execution
}

/**
 * Pod automation queue for processing engagement jobs
 */
export const podAutomationQueue = new Queue<PodAutomationJobData>(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: POD_AUTOMATION_CONFIG.QUEUE_ATTEMPTS,
    backoff: {
      type: POD_AUTOMATION_CONFIG.BACKOFF_TYPE as any,
      delay: POD_AUTOMATION_CONFIG.BACKOFF_INITIAL_DELAY_MS,
    },
    removeOnComplete: {
      count: POD_AUTOMATION_CONFIG.COMPLETED_JOB_KEEP_COUNT,
      age: POD_AUTOMATION_CONFIG.COMPLETED_JOB_AGE_DAYS * POD_AUTOMATION_CONFIG.SECONDS_PER_DAY || 604800,
    },
    removeOnFail: {
      count: POD_AUTOMATION_CONFIG.FAILED_JOB_KEEP_COUNT,
      age: POD_AUTOMATION_CONFIG.FAILED_JOB_AGE_DAYS * POD_AUTOMATION_CONFIG.SECONDS_PER_DAY || 2592000,
    },
  },
});

/**
 * Schedule like jobs for pending activities
 */
export async function scheduleLikeJobs(podId: string): Promise<{
  jobId: string;
  scheduledCount: number;
  message: string;
}> {
  try {
    // Get pending like activities
    const pendingActivities = await getPendingActivities(podId, POD_AUTOMATION_CONFIG.BATCH_SIZE_LIKES);
    const likeActivities = pendingActivities.filter(
      (a) => a.engagement_type === 'like'
    );

    if (likeActivities.length === 0) {
      console.log(`${LOG_PREFIX} No pending like activities for pod ${podId}`);
      return {
        jobId: `like-empty-${Date.now()}`,
        scheduledCount: 0,
        message: 'No pending like activities',
      };
    }

    // Schedule likes with staggering
    const scheduledJobs = await scheduleLikeActivities(
      likeActivities,
      POD_AUTOMATION_CONFIG.LIKE_MAX_MEMBERS_PER_HOUR
    );

    // Add scheduling job to queue
    const job = await podAutomationQueue.add('schedule-likes', {
      podId,
      jobType: 'schedule-likes',
    });

    console.log(
      `${LOG_PREFIX} ✅ Scheduled ${scheduledJobs.length} like jobs for pod ${podId} (Job ID: ${job.id})`
    );

    return {
      jobId: job.id!,
      scheduledCount: scheduledJobs.length,
      message: `Scheduled ${scheduledJobs.length} like jobs`,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to schedule like jobs:`, error);
    throw error;
  }
}

/**
 * Schedule comment jobs for pending activities
 */
export async function scheduleCommentJobs(podId: string): Promise<{
  jobId: string;
  scheduledCount: number;
  message: string;
}> {
  try {
    // Get pending comment activities
    const pendingActivities = await getPendingActivities(podId, POD_AUTOMATION_CONFIG.BATCH_SIZE_COMMENTS);
    const commentActivities = pendingActivities.filter(
      (a) => a.engagement_type === 'comment'
    );

    if (commentActivities.length === 0) {
      console.log(`${LOG_PREFIX} No pending comment activities for pod ${podId}`);
      return {
        jobId: `comment-empty-${Date.now()}`,
        scheduledCount: 0,
        message: 'No pending comment activities',
      };
    }

    // Schedule comments with long delays
    const scheduledJobs = await scheduleCommentActivities(commentActivities);

    // Add scheduling job to queue
    const job = await podAutomationQueue.add('schedule-comments', {
      podId,
      jobType: 'schedule-comments',
    });

    console.log(
      `${LOG_PREFIX} ✅ Scheduled ${scheduledJobs.length} comment jobs for pod ${podId} (Job ID: ${job.id})`
    );

    return {
      jobId: job.id!,
      scheduledCount: scheduledJobs.length,
      message: `Scheduled ${scheduledJobs.length} comment jobs`,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to schedule comment jobs:`, error);
    throw error;
  }
}

/**
 * Execute individual engagement activity
 */
export async function executeEngagementActivity(
  activityId: string,
  engagementType: 'like' | 'comment'
): Promise<boolean> {
  try {
    const job = await podAutomationQueue.add('execute-engagement', {
      podId: '',
      jobType: 'execute-engagement',
      activityId,
    });

    console.log(
      `${LOG_PREFIX} ✅ Queued ${engagementType} execution for activity ${activityId} (Job ID: ${job.id})`
    );

    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to execute engagement activity:`, error);
    return false;
  }
}

/**
 * Process pod automation job
 */
async function processPodAutomationJob(
  job: Job<PodAutomationJobData>
): Promise<void> {
  const { podId, jobType, activityId } = job.data;

  try {
    switch (jobType) {
      case 'schedule-likes':
        console.log(`${LOG_PREFIX} Processing: Schedule likes for pod ${podId}`);
        await scheduleLikeJobs(podId);
        break;

      case 'schedule-comments':
        console.log(`${LOG_PREFIX} Processing: Schedule comments for pod ${podId}`);
        await scheduleCommentJobs(podId);
        break;

      case 'execute-engagement':
        if (activityId) {
          console.log(`${LOG_PREFIX} Processing: Execute engagement for activity ${activityId}`);
          // TODO: E-05 will implement actual engagement execution
          // For now, mark as executed
          await markActivityExecuted(activityId, true);
          console.log(`${LOG_PREFIX} ✅ Marked activity ${activityId} as executed`);
        }
        break;

      default:
        console.warn(`${LOG_PREFIX} Unknown job type: ${jobType}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error processing automation job:`, error);
    throw error;
  }
}

/**
 * Start pod automation worker
 */
export const podAutomationWorker = new Worker<PodAutomationJobData>(
  QUEUE_NAME,
  processPodAutomationJob,
  {
    connection: getRedisConnection(),
    concurrency: POD_AUTOMATION_CONFIG.QUEUE_CONCURRENCY,
  }
);

/**
 * Worker event handlers
 */
podAutomationWorker.on('completed', (job) => {
  console.log(`${LOG_PREFIX} ✅ Job ${job.id} completed`);
});

podAutomationWorker.on('failed', (job, error) => {
  console.error(`${LOG_PREFIX} ❌ Job ${job?.id} failed:`, error.message);
});

/**
 * Get queue health status
 */
export async function getAutomationQueueStatus(): Promise<{
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}> {
  try {
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      podAutomationQueue.getWaitingCount(),
      podAutomationQueue.getActiveCount(),
      podAutomationQueue.getDelayedCount(),
      podAutomationQueue.getCompletedCount(),
      podAutomationQueue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      delayed,
      completed,
      failed,
      total: waiting + active + delayed,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get queue status:`, error);
    return {
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };
  }
}

/**
 * Get pod automation statistics
 */
export async function getPodAutomationStats(podId: string): Promise<any> {
  try {
    const stats = await getPodEngagementStats(podId);
    const queueStatus = await getAutomationQueueStatus();

    return {
      pod: stats,
      queue: queueStatus,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get automation stats:`, error);
    return null;
  }
}

/**
 * Clear all automation jobs (for testing/cleanup)
 */
export async function clearAutomationJobs(): Promise<number> {
  try {
    const jobs = await podAutomationQueue.getJobs([
      'waiting',
      'delayed',
      'active',
      'completed',
      'failed',
    ]);

    for (const job of jobs) {
      await job.remove();
    }

    console.log(`${LOG_PREFIX} Cleared ${jobs.length} jobs from queue`);
    return jobs.length;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to clear jobs:`, error);
    return 0;
  }
}
