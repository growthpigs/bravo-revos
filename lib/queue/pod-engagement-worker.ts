/**
 * Pod Engagement Worker
 * BullMQ worker that consumes scheduled engagement activities from the queue
 * and orchestrates execution flow for E-05 Pod Engagement Executor
 */

import { Worker, Job, Queue } from 'bullmq';
import { createClient } from '@/lib/supabase/server';
import { getRedisConnection } from '@/lib/redis';
import { LOGGING_CONFIG, FEATURE_FLAGS } from '@/lib/config';

const LOG_PREFIX = '[POD_ENGAGEMENT_WORKER]';
const QUEUE_NAME = 'pod-engagement';
const WORKER_NAME = 'pod-engagement-executor';
const JOB_TIMEOUT_MS = 30000; // 30 seconds max per engagement
const WORKER_CONCURRENCY = 5; // Process 5 jobs simultaneously

/**
 * Engagement activity from database
 */
export interface EngagementActivity {
  id: string;
  pod_id: string;
  engagement_type: 'like' | 'comment';
  post_id: string;
  profile_id: string;
  comment_text?: string;
  scheduled_for: string; // ISO timestamp
  status: string;
  created_at: string;
}

/**
 * Job data for engagement execution
 */
export interface EngagementJobData {
  podId: string;
  activityId: string;
  engagementType: 'like' | 'comment';
  postId: string;
  profileId: string;
  commentText?: string;
  scheduledFor: string;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  timestamp: string;
  activityId: string;
  engagementType: string;
  error?: string;
  errorType?: string;
}

// Global worker instance
let workerInstance: Worker<EngagementJobData> | null = null;
let queueInstance: Queue<EngagementJobData> | null = null;

/**
 * Get or create the engagement queue
 */
export function getEngagementQueue(): Queue<EngagementJobData> {
  if (!queueInstance) {
    queueInstance = new Queue<EngagementJobData>(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
        removeOnComplete: {
          count: 1000,
          age: 7 * 24 * 60 * 60, // 7 days
        },
        removeOnFail: {
          count: 500,
          age: 30 * 24 * 60 * 60, // 30 days
        },
      },
    });
  }
  return queueInstance || new Queue<EngagementJobData>(QUEUE_NAME, {
    connection: getRedisConnection(),
  });
}

/**
 * Initialize the engagement worker
 * Call this on application startup
 */
export async function initializeEngagementWorker(): Promise<Worker<EngagementJobData>> {
  if (workerInstance) {
    console.log(`${LOG_PREFIX} Worker already initialized`);
    return workerInstance;
  }

  console.log(`${LOG_PREFIX} Initializing engagement worker...`);

  const redis = getRedisConnection();

  workerInstance = new Worker<EngagementJobData>(QUEUE_NAME, processEngagementJob, {
    connection: redis,
    concurrency: WORKER_CONCURRENCY,
    lockDuration: JOB_TIMEOUT_MS + 5000, // Add 5s buffer
    lockRenewTime: JOB_TIMEOUT_MS / 2, // Renew halfway through timeout
  });

  // Event handlers
  workerInstance.on('completed', (job) => {
    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} ✅ Job completed: ${job.id}`);
    }
  });

  workerInstance.on('failed', (job, error) => {
    console.error(`${LOG_PREFIX} ❌ Job failed: ${job?.id}`, error?.message);
  });

  workerInstance.on('error', (error) => {
    console.error(`${LOG_PREFIX} Worker error:`, error);
  });

  workerInstance.on('paused', () => {
    console.log(`${LOG_PREFIX} Worker paused`);
  });

  workerInstance.on('resumed', () => {
    console.log(`${LOG_PREFIX} Worker resumed`);
  });

  console.log(`${LOG_PREFIX} ✅ Worker initialized (concurrency: ${WORKER_CONCURRENCY})`);

  return workerInstance;
}

/**
 * Process a single engagement job
 * This is the main job processor called by BullMQ
 */
async function processEngagementJob(job: Job<EngagementJobData>): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { podId, activityId, engagementType, postId, profileId, commentText, scheduledFor } =
    job.data;

  console.log(`${LOG_PREFIX} Processing job ${job.id}: ${engagementType} for activity ${activityId}`);

  try {
    // Step 1: Fetch activity from database to verify it exists and is ready
    const activity = await fetchActivityFromDatabase(activityId);

    if (!activity) {
      throw new Error(`Activity ${activityId} not found in database`);
    }

    // Step 2: Verify activity is in 'scheduled' status (not already executed)
    if (activity.status !== 'scheduled') {
      throw new Error(
        `Activity ${activityId} is in '${activity.status}' status, expected 'scheduled'`
      );
    }

    // Step 3: Check if scheduled_for time has arrived
    const scheduledTime = new Date(activity.scheduled_for);
    const now = new Date();

    if (scheduledTime > now) {
      // Not yet time to execute - reschedule job
      const delayMs = scheduledTime.getTime() - now.getTime();
      console.log(`${LOG_PREFIX} Activity not yet ready. Rescheduling in ${delayMs}ms`);
      throw new Error(`Activity not ready for execution yet (scheduled for ${activity.scheduled_for})`);
    }

    // Step 4: Execute the engagement
    let executionResult: ExecutionResult;

    switch (engagementType) {
      case 'like':
        executionResult = await executeLikeEngagement({
          podId,
          activityId,
          postId,
          profileId,
        });
        break;

      case 'comment':
        executionResult = await executeCommentEngagement({
          podId,
          activityId,
          postId,
          profileId,
          commentText: commentText || '',
        });
        break;

      default:
        throw new Error(`Unknown engagement type: ${engagementType}`);
    }

    // Step 5: Update database with result
    await updateActivityInDatabase(activityId, executionResult);

    const duration = Date.now() - startTime;
    console.log(
      `${LOG_PREFIX} ✅ Engagement executed successfully (${engagementType}, ${duration}ms)`
    );

    return executionResult;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `${LOG_PREFIX} ❌ Engagement execution failed (${engagementType}, ${duration}ms): ${errorMessage}`
    );

    // Classify the error for retry logic
    const errorType = classifyError(errorMessage);

    // Throw error to trigger BullMQ retry logic
    const err = new Error(errorMessage);
    (err as any).type = errorType;
    throw err;
  }
}

/**
 * Fetch activity from database
 */
async function fetchActivityFromDatabase(activityId: string): Promise<EngagementActivity | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('pod_activities')
      .select('*')
      .eq('id', activityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Database fetch error: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      pod_id: data.pod_id,
      engagement_type: data.engagement_type,
      post_id: data.post_id,
      profile_id: data.profile_id,
      comment_text: data.comment_text,
      scheduled_for: data.scheduled_for,
      status: data.status,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error(`${LOG_PREFIX} Error fetching activity:`, error);
    throw error;
  }
}

/**
 * Execute like engagement
 * (Calls E-05-2 implementation)
 */
async function executeLikeEngagement(params: {
  podId: string;
  activityId: string;
  postId: string;
  profileId: string;
}): Promise<ExecutionResult> {
  const { activityId, postId } = params;

  // TODO: E-05-2 will implement this
  // For now, return placeholder
  console.log(`${LOG_PREFIX} [TODO: E-05-2] Executing like: post=${postId}`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    activityId,
    engagementType: 'like',
  };
}

/**
 * Execute comment engagement with voice cartridge
 * (Calls E-05-3 implementation)
 */
async function executeCommentEngagement(params: {
  podId: string;
  activityId: string;
  postId: string;
  profileId: string;
  commentText: string;
}): Promise<ExecutionResult> {
  const { activityId, postId, commentText } = params;

  // TODO: E-05-3 will implement this
  // For now, return placeholder
  console.log(`${LOG_PREFIX} [TODO: E-05-3] Executing comment: post=${postId}, text="${commentText}"`);

  return {
    success: true,
    timestamp: new Date().toISOString(),
    activityId,
    engagementType: 'comment',
  };
}

/**
 * Update activity in database with execution result
 */
async function updateActivityInDatabase(
  activityId: string,
  result: ExecutionResult
): Promise<void> {
  try {
    const supabase = await createClient();

    const updateData = {
      status: result.success ? 'executed' : 'failed',
      executed_at: new Date().toISOString(),
      execution_result: {
        success: result.success,
        timestamp: result.timestamp,
        error: result.error || null,
        error_type: result.errorType || null,
      },
    };

    const { error } = await supabase
      .from('pod_activities')
      .update(updateData)
      .eq('id', activityId);

    if (error) {
      throw new Error(`Database update error: ${error.message}`);
    }

    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} Activity ${activityId} updated: status=${updateData.status}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating activity:`, error);
    throw error;
  }
}

/**
 * Classify error type for retry logic
 */
function classifyError(errorMessage: string): string {
  if (
    errorMessage.includes('rate') ||
    errorMessage.includes('429') ||
    errorMessage.includes('limit')
  ) {
    return 'rate_limit';
  }

  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('credential')
  ) {
    return 'auth_error';
  }

  if (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('network')
  ) {
    return 'network_error';
  }

  if (errorMessage.includes('not found') || errorMessage.includes('404')) {
    return 'not_found';
  }

  return 'unknown_error';
}

/**
 * Pause the worker (stop processing new jobs)
 */
export async function pauseEngagementWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.pause();
    console.log(`${LOG_PREFIX} Worker paused`);
  }
}

/**
 * Resume the worker (continue processing)
 */
export async function resumeEngagementWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.resume();
    console.log(`${LOG_PREFIX} Worker resumed`);
  }
}

/**
 * Shutdown the worker gracefully
 */
export async function shutdownEngagementWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    console.log(`${LOG_PREFIX} Worker shut down`);
    workerInstance = null;
  }

  if (queueInstance) {
    await queueInstance.close();
    console.log(`${LOG_PREFIX} Queue closed`);
    queueInstance = null;
  }
}

/**
 * Add a job to the engagement queue
 */
export async function addEngagementJob(jobData: EngagementJobData): Promise<Job<EngagementJobData>> {
  const queue = getEngagementQueue();

  const job = await queue.add('execute-engagement', jobData, {
    jobId: `engagement-${jobData.activityId}-${Date.now()}`,
    priority: calculateJobPriority(jobData),
  });

  console.log(
    `${LOG_PREFIX} Job added to queue: ${job.id} (activity: ${jobData.activityId})`
  );

  return job;
}

/**
 * Calculate priority for a job based on scheduled_for time
 * Jobs scheduled sooner get higher priority
 */
function calculateJobPriority(jobData: EngagementJobData): number {
  const scheduledTime = new Date(jobData.scheduledFor);
  const now = new Date();
  const delayMs = scheduledTime.getTime() - now.getTime();

  // Priority: lower number = higher priority
  // If scheduled in past (delayMs <= 0), priority = 0 (highest)
  // If scheduled in 1 hour, priority = 100
  // Max priority = 1000
  return Math.max(0, Math.min(1000, Math.floor(delayMs / 360000))); // 360000ms = 6 minutes
}

/**
 * Get queue statistics
 */
export async function getEngagementQueueStats(): Promise<{
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
}> {
  const queue = getEngagementQueue();

  const counts = await queue.getJobCounts();

  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    delayed: counts.delayed || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    total: (counts.waiting || 0) + (counts.active || 0) + (counts.delayed || 0),
  };
}

/**
 * Health check for the worker
 */
export async function getEngagementWorkerHealth(): Promise<{
  healthy: boolean;
  status: string;
  queueStats: Awaited<ReturnType<typeof getEngagementQueueStats>>;
}> {
  try {
    const queueStats = await getEngagementQueueStats();

    const healthy = workerInstance !== null && !workerInstance.isPaused();

    return {
      healthy,
      status: workerInstance?.isPaused() ? 'paused' : 'running',
      queueStats,
    };
  } catch (error) {
    return {
      healthy: false,
      status: 'error',
      queueStats: { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0, total: 0 },
    };
  }
}
