/**
 * Pod Engagement Worker
 * BullMQ worker that consumes scheduled engagement activities from the queue
 * and orchestrates execution flow for E-05 Pod Engagement Executor
 */

import { Worker, Job, Queue } from 'bullmq';
import { createClient } from '@/lib/supabase/server';
import { getRedisConnectionSync } from '@/lib/redis';
import { LOGGING_CONFIG, FEATURE_FLAGS } from '@/lib/config';

const LOG_PREFIX = '[POD_ENGAGEMENT_WORKER]';
const QUEUE_NAME = 'pod-engagement';
const WORKER_NAME = 'pod-engagement-executor';
const JOB_TIMEOUT_MS = 30_000; // 30 seconds max per engagement
const API_CALL_TIMEOUT_MS = 25_000; // 25 seconds for individual API calls
const WORKER_CONCURRENCY = 5; // Process 5 jobs simultaneously

/**
 * Engagement activity from database
 * Note: Uses actual database column names (member_id, unipile_account_id)
 * The worker resolves member_id → unipile_account_id for Unipile API calls
 */
export interface EngagementActivity {
  id: string;
  pod_id: string;
  engagement_type: 'like' | 'comment';
  post_id: string;
  member_id: string; // Pod member ID (FK to pod_members)
  unipile_account_id?: string; // Unipile account ID (may be on activity or needs resolution)
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

/**
 * Custom error class for engagement job failures
 * Provides type-safe error information for retry logic
 */
export class EngagementJobError extends Error {
  constructor(
    message: string,
    public readonly errorType: 'rate_limit' | 'auth_error' | 'network_error' | 'not_found' | 'unknown_error' | 'validation_error' | 'timeout'
  ) {
    super(message);
    this.name = 'EngagementJobError';
    // Ensure prototype chain is correct for instanceof checks
    Object.setPrototypeOf(this, EngagementJobError.prototype);
  }
}

// Global worker instance
let workerInstance: Worker<EngagementJobData> | null = null;
let queueInstance: Queue<EngagementJobData> | null = null;

/**
 * Get or create the engagement queue
 * Singleton pattern ensures only one queue instance exists
 */
export function getEngagementQueue(): Queue<EngagementJobData> {
  if (!queueInstance) {
    queueInstance = new Queue<EngagementJobData>(QUEUE_NAME, {
      connection: getRedisConnectionSync(),
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
  return queueInstance;
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

  const redis = getRedisConnectionSync();

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

    // Step 3.5: Resolve Unipile account ID
    // Prefer job data profileId, fallback to activity data, then resolve from member
    const resolvedProfileId = profileId || await resolveUnipileAccountId(
      activity.member_id,
      activity.unipile_account_id
    );

    // Step 4: Execute the engagement
    let executionResult: ExecutionResult;

    switch (engagementType) {
      case 'like':
        executionResult = await executeLikeEngagement({
          podId,
          activityId,
          postId,
          profileId: resolvedProfileId,
        });
        break;

      case 'comment':
        executionResult = await executeCommentEngagement({
          podId,
          activityId,
          postId,
          profileId: resolvedProfileId,
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

    // Classify the error for retry logic
    const errorType = classifyError(errorMessage);
    const attempt = job.attemptsMade + 1;
    const maxAttempts = 3;

    console.error(
      `${LOG_PREFIX} ❌ Engagement execution failed (${engagementType}, attempt ${attempt}/${maxAttempts}, ${duration}ms): [${errorType}] ${errorMessage}`
    );

    // E-05-5: Error-type-specific retry logic
    // Determine if we should retry based on error classification
    const shouldRetry = determineRetryStrategy(errorType, attempt, maxAttempts);

    if (!shouldRetry && attempt >= maxAttempts) {
      // Move to dead-letter queue for permanent failures
      await handleFailedActivity(activityId, errorMessage, errorType, attempt);

      console.error(
        `${LOG_PREFIX} 💀 Activity ${activityId} moved to dead-letter queue (error: ${errorType})`
      );
    }

    // Throw custom error with type-safe error classification
    // BullMQ will handle retry based on queue configuration
    const jobError = new EngagementJobError(errorMessage, errorType);
    (jobError as any).shouldRetry = shouldRetry;
    throw jobError;
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

    // DB column is 'activity_type', code interface uses 'engagement_type'
    return {
      id: data.id,
      pod_id: data.pod_id,
      engagement_type: data.activity_type, // Map activity_type → engagement_type
      post_id: data.post_id,
      member_id: data.member_id, // Actual DB column name
      unipile_account_id: data.unipile_account_id, // May be null, needs resolution
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
 * Resolve Unipile account ID from member ID
 * Fast path: Use unipile_account_id if already on activity
 * Slow path: Lookup from pod_members.unipile_account_id directly
 *
 * Note: pod_members has unipile_account_id directly, not through linkedin_accounts
 *
 * Exported for use by E-04 (pod-automation-queue) when bridging to E-05
 */
export async function resolveUnipileAccountId(
  memberId: string,
  activityUnipileId?: string
): Promise<string> {
  // Fast path: activity already has unipile_account_id
  if (activityUnipileId) {
    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} Using activity's unipile_account_id: ${activityUnipileId}`);
    }
    return activityUnipileId;
  }

  // Slow path: lookup from pod_members directly
  if (FEATURE_FLAGS.ENABLE_LOGGING) {
    console.log(`${LOG_PREFIX} Resolving unipile_account_id for member ${memberId}`);
  }

  const supabase = await createClient();

  // pod_members has unipile_account_id directly
  const { data: member, error: memberError } = await supabase
    .from('pod_members')
    .select('unipile_account_id')
    .eq('id', memberId)
    .single();

  if (memberError) {
    throw new EngagementJobError(
      `Failed to fetch pod member ${memberId}: ${memberError.message}`,
      'unknown_error'
    );
  }

  if (!member?.unipile_account_id) {
    throw new EngagementJobError(
      `Pod member ${memberId} has no Unipile account ID`,
      'validation_error'
    );
  }

  if (FEATURE_FLAGS.ENABLE_LOGGING) {
    console.log(`${LOG_PREFIX} Resolved unipile_account_id: ${member.unipile_account_id}`);
  }

  return member.unipile_account_id;
}

/**
 * Execute like engagement
 * Calls Unipile API to like a LinkedIn post
 */
async function executeLikeEngagement(params: {
  podId: string;
  activityId: string;
  postId: string;
  profileId: string;
}): Promise<ExecutionResult> {
  const { activityId, postId, profileId } = params;

  try {
    // Validate required inputs
    if (!postId?.trim()) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Missing or empty postId`,
        'validation_error'
      );
    }

    if (!profileId?.trim()) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Missing or empty profileId`,
        'validation_error'
      );
    }

    if (!process.env.UNIPILE_API_KEY) {
      throw new EngagementJobError(
        `[Activity ${activityId}] UNIPILE_API_KEY not configured`,
        'auth_error'
      );
    }

    const unipileDsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
    const likeUrl = `${unipileDsn}/api/v1/posts/${postId}/reactions`;

    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} [Activity ${activityId}] Calling Unipile like API: ${likeUrl}`);
    }

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CALL_TIMEOUT_MS);

    try {
      const response = await fetch(likeUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          account_id: profileId,
          type: 'LIKE',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMsg = `[Activity ${activityId}] Unipile like failed: ${response.status} ${response.statusText}`;

        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.error(`${LOG_PREFIX} ${errorMsg}`, errorBody);
        }

        // Classify error based on status code
        if (response.status === 429) {
          throw new EngagementJobError(errorMsg, 'rate_limit');
        } else if (response.status === 401 || response.status === 403) {
          throw new EngagementJobError(errorMsg, 'auth_error');
        } else if (response.status === 404) {
          throw new EngagementJobError(`[Activity ${activityId}] Post ${postId} not found`, 'not_found');
        } else {
          throw new EngagementJobError(errorMsg, 'unknown_error');
        }
      }

      const result = await response.json();

      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log(`${LOG_PREFIX} [Activity ${activityId}] Like executed successfully for post ${postId}`);
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        activityId,
        engagementType: 'like',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Handle timeout errors specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`${LOG_PREFIX} [Activity ${activityId}] Like engagement timeout after 25s`);
      throw new EngagementJobError(
        `[Activity ${activityId}] Request timeout (25s) - Unipile API not responding`,
        'timeout'
      );
    }

    console.error(`${LOG_PREFIX} [Activity ${activityId}] Like engagement failed: ${errorMsg}`);

    // If it's already an EngagementJobError, throw it as-is
    if (error instanceof EngagementJobError) {
      throw error;
    }

    // Otherwise classify and throw
    const errorType = classifyError(errorMsg);
    throw new EngagementJobError(`[Activity ${activityId}] ${errorMsg}`, errorType);
  }
}

/**
 * Execute comment engagement with voice cartridge
 * E-05-3: Applies pod's voice personality to comment before posting
 */
async function executeCommentEngagement(params: {
  podId: string;
  activityId: string;
  postId: string;
  profileId: string;
  commentText: string;
}): Promise<ExecutionResult> {
  const { podId, activityId, postId, profileId, commentText } = params;

  try {
    // Validate inputs
    if (!postId?.trim()) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Missing or empty postId`,
        'validation_error'
      );
    }

    if (!profileId?.trim()) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Missing or empty profileId`,
        'validation_error'
      );
    }

    if (!commentText?.trim()) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Missing or empty comment text`,
        'validation_error'
      );
    }

    if (!process.env.UNIPILE_API_KEY) {
      throw new EngagementJobError(
        `[Activity ${activityId}] UNIPILE_API_KEY not configured`,
        'auth_error'
      );
    }

    // Fetch pod's voice cartridge to apply personality
    const supabase = await createClient();
    const { data: pod, error: podError } = await supabase
      .from('pods')
      .select('voice_cartridge_id')
      .eq('id', podId)
      .maybeSingle();

    if (podError) {
      throw new EngagementJobError(
        `[Activity ${activityId}] Failed to fetch pod ${podId}: ${podError.message}`,
        'unknown_error'
      );
    }

    let finalCommentText = commentText;

    // Apply voice transformation if cartridge is configured
    if (pod?.voice_cartridge_id) {
      const { data: cartridge, error: cartridgeError } = await supabase
        .from('cartridges')
        .select('voice_params')
        .eq('id', pod.voice_cartridge_id)
        .maybeSingle();

      if (!cartridgeError && cartridge?.voice_params) {
        // Apply voice parameters to the comment
        finalCommentText = applyVoiceParams(commentText, cartridge.voice_params);

        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.log(
            `${LOG_PREFIX} [Activity ${activityId}] Applied voice cartridge to comment`
          );
        }
      }
    }

    // Post comment to LinkedIn via Unipile
    const unipileDsn = process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211';
    const commentUrl = `${unipileDsn}/api/v1/posts/${postId}/comments`;

    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} [Activity ${activityId}] Posting comment to Unipile: ${commentUrl}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(commentUrl, {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          account_id: profileId,
          text: finalCommentText,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const errorMsg = `[Activity ${activityId}] Unipile comment failed: ${response.status} ${response.statusText}`;

        if (FEATURE_FLAGS.ENABLE_LOGGING) {
          console.error(`${LOG_PREFIX} ${errorMsg}`, errorBody);
        }

        // Classify error based on status code
        if (response.status === 429) {
          throw new EngagementJobError(errorMsg, 'rate_limit');
        } else if (response.status === 401 || response.status === 403) {
          throw new EngagementJobError(errorMsg, 'auth_error');
        } else if (response.status === 404) {
          throw new EngagementJobError(`[Activity ${activityId}] Post ${postId} not found`, 'not_found');
        } else {
          throw new EngagementJobError(errorMsg, 'unknown_error');
        }
      }

      await response.json();

      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log(
          `${LOG_PREFIX} [Activity ${activityId}] Comment posted successfully for post ${postId}`
        );
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        activityId,
        engagementType: 'comment',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Handle timeout errors specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error(`${LOG_PREFIX} [Activity ${activityId}] Comment engagement timeout after 25s`);
      throw new EngagementJobError(
        `[Activity ${activityId}] Request timeout (25s) - Unipile API not responding`,
        'timeout'
      );
    }

    console.error(`${LOG_PREFIX} [Activity ${activityId}] Comment engagement failed: ${errorMsg}`);

    // If it's already an EngagementJobError, throw it as-is
    if (error instanceof EngagementJobError) {
      throw error;
    }

    // Otherwise classify and throw
    const errorType = classifyError(errorMsg);
    throw new EngagementJobError(`[Activity ${activityId}] ${errorMsg}`, errorType);
  }
}

/**
 * Apply voice parameters to comment text
 * Transforms tone, style, and personality based on voice cartridge settings
 */
function applyVoiceParams(text: string, voiceParams: any): string {
  let transformedText = text;

  // Apply tone adjustments
  if (voiceParams.tone?.formality === 'casual') {
    // Convert formal language to casual
    transformedText = transformedText
      .replace(/therefore,?/gi, 'so')
      .replace(/moreover,?/gi, 'plus')
      .replace(/nevertheless,?/gi, 'but')
      .replace(/regarding/gi, 'about');
  }

  // Apply emoji preferences
  if (voiceParams.style?.use_emojis && !transformedText.includes('😊')) {
    transformedText += ' 👍';
  }

  // Apply hashtag preferences
  if (voiceParams.style?.use_hashtags && voiceParams.personality?.traits) {
    // Could add relevant hashtags based on traits
  }

  // Apply vocabulary constraints
  if (voiceParams.vocabulary?.banned_words && Array.isArray(voiceParams.vocabulary.banned_words)) {
    for (const bannedWord of voiceParams.vocabulary.banned_words) {
      const regex = new RegExp(`\\b${bannedWord}\\b`, 'gi');
      transformedText = transformedText.replace(regex, '');
    }
  }

  return transformedText.trim();
}

/**
 * Update activity in database with execution result (idempotent)
 * E-05-4: State Manager - ensures exactly-once execution semantics
 */
async function updateActivityInDatabase(
  activityId: string,
  result: ExecutionResult
): Promise<void> {
  try {
    const supabase = await createClient();

    // Step 1: Check current status for idempotency
    // Only update if status is still 'pending' or 'scheduled'
    const { data: currentActivity, error: fetchError } = await supabase
      .from('pod_activities')
      .select('status, execution_attempts, execution_result')
      .eq('id', activityId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch current activity: ${fetchError.message}`);
    }

    // Already executed? Check if same result to prevent duplicates
    if (currentActivity?.status === 'completed' || currentActivity?.status === 'executed') {
      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log(
          `${LOG_PREFIX} Activity ${activityId} already executed (idempotency check passed)`
        );
      }
      return; // Idempotent: already completed, no duplicate update
    }

    // Step 2: Prepare update data with full execution result
    const executionAttempts = (currentActivity?.execution_attempts || 0) + 1;
    const updateData = {
      status: result.success ? 'completed' : 'failed',
      executed_at: new Date().toISOString(),
      execution_attempts: executionAttempts,
      execution_result: {
        success: result.success,
        timestamp: result.timestamp,
        error: result.error || null,
        error_type: result.errorType || null,
        attempt: executionAttempts,
      },
      last_error: result.error || null,
    };

    // Step 3: Perform atomic update (only if status hasn't changed)
    // This prevents race conditions from concurrent execution attempts
    const { data: updated, error: updateError } = await supabase
      .from('pod_activities')
      .update(updateData)
      .eq('id', activityId)
      .eq('status', 'scheduled') // Atomic: only update if still scheduled (E-04 sets this)
      .select();

    if (updateError) {
      throw new Error(`Database update error: ${updateError.message}`);
    }

    // If no rows were updated, activity was already modified (idempotency)
    if (!updated || updated.length === 0) {
      if (FEATURE_FLAGS.ENABLE_LOGGING) {
        console.log(
          `${LOG_PREFIX} Activity ${activityId} was already updated by another process (idempotency check passed)`
        );
      }
      return; // Idempotent: concurrent request beat us, no duplicate update
    }

    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(
        `${LOG_PREFIX} Activity ${activityId} updated: status=${updateData.status}, attempts=${executionAttempts}`
      );
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating activity:`, error);
    throw error;
  }
}

/**
 * Validate engagement job data
 * Ensures all required fields are present and valid
 */
function validateEngagementJobData(data: EngagementJobData): void {
  if (!data.activityId || !data.podId) {
    throw new Error('Missing required fields: activityId and podId');
  }

  if (!data.engagementType || !['like', 'comment'].includes(data.engagementType)) {
    throw new Error(`Invalid engagement type: ${data.engagementType}`);
  }

  if (!data.scheduledFor) {
    throw new Error('Missing required field: scheduledFor');
  }

  if (data.engagementType === 'comment' && !data.commentText) {
    throw new Error('Comment engagement requires commentText');
  }
}

/**
 * Classify error type for retry logic
 * Returns specific error type for intelligent retry strategy
 */
function classifyError(
  errorMessage: string
): 'rate_limit' | 'auth_error' | 'network_error' | 'not_found' | 'unknown_error' {
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
 * E-05-5: Determine retry strategy based on error type
 * Different error types have different retry behavior
 */
function determineRetryStrategy(
  errorType: 'rate_limit' | 'auth_error' | 'network_error' | 'not_found' | 'unknown_error' | 'validation_error' | 'timeout',
  attempt: number,
  maxAttempts: number
): boolean {
  // Never retry auth errors - they won't succeed on retry
  if (errorType === 'auth_error') {
    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} Skipping retry for auth_error (permanent failure)`);
    }
    return false;
  }

  // Never retry validation errors - they won't succeed on retry
  if (errorType === 'validation_error') {
    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} Skipping retry for validation_error (permanent failure)`);
    }
    return false;
  }

  // Never retry not_found errors - post doesn't exist
  if (errorType === 'not_found') {
    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(`${LOG_PREFIX} Skipping retry for not_found error (post removed)`);
    }
    return false;
  }

  // Retry rate_limit and network errors up to max attempts
  if (errorType === 'rate_limit' || errorType === 'network_error' || errorType === 'timeout') {
    const shouldRetry = attempt < maxAttempts;
    if (FEATURE_FLAGS.ENABLE_LOGGING && shouldRetry) {
      console.log(`${LOG_PREFIX} Scheduling retry for ${errorType} (attempt ${attempt}/${maxAttempts})`);
    }
    return shouldRetry;
  }

  // Retry unknown errors up to max attempts
  if (errorType === 'unknown_error') {
    const shouldRetry = attempt < maxAttempts;
    if (FEATURE_FLAGS.ENABLE_LOGGING && shouldRetry) {
      console.log(`${LOG_PREFIX} Scheduling retry for unknown_error (attempt ${attempt}/${maxAttempts})`);
    }
    return shouldRetry;
  }

  return false;
}

/**
 * E-05-5: Handle permanently failed activities
 * Move to dead-letter queue and update database
 */
async function handleFailedActivity(
  activityId: string,
  errorMessage: string,
  errorType: string,
  attempt: number
): Promise<void> {
  try {
    const supabase = await createClient();

    // Mark activity as permanently failed with detailed error info
    const { error: updateError } = await supabase
      .from('pod_activities')
      .update({
        status: 'failed',
        executed_at: new Date().toISOString(),
        execution_attempts: attempt,
        last_error: errorMessage,
        execution_result: {
          success: false,
          timestamp: new Date().toISOString(),
          error: errorMessage,
          error_type: errorType,
          permanent_failure: true,
          moved_to_dlq: true,
        },
      })
      .eq('id', activityId);

    if (updateError) {
      console.error(
        `${LOG_PREFIX} Failed to update dead-letter activity ${activityId}: ${updateError.message}`
      );
      return;
    }

    if (FEATURE_FLAGS.ENABLE_LOGGING) {
      console.log(
        `${LOG_PREFIX} Activity ${activityId} marked as failed (error_type: ${errorType})`
      );
    }

    // Log to dead-letter queue table for monitoring/debugging
    const { error: dlqError } = await supabase
      .from('pod_activities_dlq')
      .insert({
        activity_id: activityId,
        error_message: errorMessage,
        error_type: errorType,
        attempts: attempt,
        created_at: new Date().toISOString(),
      })
      .select();

    if (dlqError && !dlqError.message.includes('relation.*not exist')) {
      console.error(
        `${LOG_PREFIX} Failed to log to dead-letter queue: ${dlqError.message}`
      );
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error handling failed activity:`, error);
  }
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
 * Validates job data before adding to ensure integrity
 */
export async function addEngagementJob(jobData: EngagementJobData): Promise<Job<EngagementJobData>> {
  // Validate input before adding to queue
  validateEngagementJobData(jobData);

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
 * Returns comprehensive health status with queue statistics and error details
 */
export async function getEngagementWorkerHealth(): Promise<{
  healthy: boolean;
  status: string;
  queueStats: Awaited<ReturnType<typeof getEngagementQueueStats>>;
  timestamp: string;
  error?: string;
}> {
  try {
    const queueStats = await getEngagementQueueStats();

    const healthy = workerInstance !== null && !workerInstance.isPaused();

    return {
      healthy,
      status: workerInstance?.isPaused() ? 'paused' : 'running',
      queueStats,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      healthy: false,
      status: 'error',
      queueStats: { waiting: 0, active: 0, delayed: 0, completed: 0, failed: 0, total: 0 },
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}
