/**
 * Centralized Configuration Constants
 * All magic numbers, defaults, and configuration values
 */

/**
 * Unipile API Configuration
 */
export const UNIPILE_CONFIG = {
  DSN: process.env.UNIPILE_DSN || 'https://api1.unipile.com:13211',
  API_KEY: process.env.UNIPILE_API_KEY || '',
  API_VERSION: 'v1',

  // Validate API key is set
  validate(): void {
    if (!this.API_KEY) {
      console.warn('[CONFIG] Warning: UNIPILE_API_KEY not set, mock mode will be used');
    }
  },

  // Construct API endpoint
  getEndpoint(path: string): string {
    return `${this.DSN}/api/${this.API_VERSION}${path}`;
  },
};

/**
 * Comment Polling Configuration (C-02)
 */
export const COMMENT_POLLING_CONFIG = {
  // Polling interval (in minutes)
  MIN_POLL_DELAY_MIN: 15,
  MAX_POLL_DELAY_MIN: 45,
  JITTER_MIN: 5, // ±5 minutes

  // Working hours (9am-5pm)
  WORKING_HOURS_START: 9,
  WORKING_HOURS_END: 17,

  // Random skip probability (10%)
  SKIP_POLL_PERCENTAGE: 0.1,

  // Queue configuration
  QUEUE_ATTEMPTS: 3,
  QUEUE_CONCURRENCY: 3,
  BACKOFF_INITIAL_DELAY_MS: 60000, // 1 minute
  BACKOFF_TYPE: 'exponential',

  // Job retention
  COMPLETED_JOB_KEEP_COUNT: 100,
  COMPLETED_JOB_AGE_DAYS: 1,
  FAILED_JOB_KEEP_COUNT: 50,
  FAILED_JOB_AGE_DAYS: 7,
};

/**
 * DM Queue Configuration (C-03)
 */
export const DM_QUEUE_CONFIG = {
  // Rate limiting
  DM_DAILY_LIMIT: 100,

  // Queue configuration
  QUEUE_CONCURRENCY: 3,
  QUEUE_ATTEMPTS: 5,
  BACKOFF_INITIAL_DELAY_MS: 30000, // 30 seconds
  BACKOFF_TYPE: 'exponential',

  // Rate limiter (safety limit)
  RATE_LIMITER_MAX_JOBS: 10,
  RATE_LIMITER_DURATION_MS: 60000, // Per minute

  // Job retention
  COMPLETED_JOB_KEEP_COUNT: 1000,
  COMPLETED_JOB_AGE_DAYS: 7,
  FAILED_JOB_KEEP_COUNT: 500,
  FAILED_JOB_AGE_DAYS: 30,
  SECONDS_PER_DAY: 86400,
};

/**
 * Pod Post Detection Configuration (E-03)
 */
export const POD_POST_CONFIG = {
  // Polling interval (in milliseconds)
  POLLING_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes

  // Post deduplication
  POSTS_SEEN_KEY_PREFIX: 'pod-posts-seen',
  POSTS_RETENTION_DAYS: 7,

  // Queue configuration
  QUEUE_CONCURRENCY: 3,
  QUEUE_ATTEMPTS: 3,
  BACKOFF_INITIAL_DELAY_MS: 30000, // 30 seconds
  BACKOFF_TYPE: 'exponential',

  // Job retention
  COMPLETED_JOB_KEEP_COUNT: 100,
  COMPLETED_JOB_AGE_DAYS: 7,
  FAILED_JOB_KEEP_COUNT: 50,
  FAILED_JOB_AGE_DAYS: 30,
  SECONDS_PER_DAY: 86400,

  // Post fetching
  DEFAULT_POSTS_LIMIT: 10,
  POSTS_TO_CHECK_PER_POLL: 5,
};

/**
 * Comment Processing Configuration (C-02)
 */
export const COMMENT_PROCESSOR_CONFIG = {
  // Bot detection scoring
  BOT_SCORE_HEADLINE_KEYWORD: 50,
  BOT_SCORE_LOW_CONNECTIONS: 30,
  BOT_SCORE_SHORT_COMMENT: 15,
  BOT_SCORE_ONLY_EMOJIS: 25,
  BOT_SCORE_THRESHOLD: 50, // Score >= 50 = bot

  // Comment validation
  MIN_COMMENT_LENGTH_FOR_SUBSTANCE: 10,
  MIN_WORD_LENGTH: 5,

  // Generic comment filtering
  GENERIC_COMMENT_PATTERNS: [
    /^(great|nice|awesome|excellent|good|cool|interesting)\s+(post|content|article|share)!?$/i,
    /^thanks?\s+for\s+sharing!?$/i,
    /^love\s+this!?$/i,
    /^agreed?!?$/i,
    /^exactly!?$/i,
    /^\ud83d\udc4d+$/, // Just thumbs up emojis
    /^\ud83d\udc4f+$/, // Just clap emojis
    /^[\u2764\ufe0f]+$/, // Just heart emojis
  ],

  // Bot headline patterns
  BOT_HEADLINE_PATTERNS: [
    /bot/i,
    /automation/i,
    /automated/i,
    /auto[ -]?post/i,
    /scheduler/i,
  ],
};

/**
 * Pod Automation Engine Configuration (E-04)
 */
export const POD_AUTOMATION_CONFIG = {
  // Like engagement delays
  LIKE_MIN_DELAY_MS: 5 * 60 * 1000, // 5 minutes
  LIKE_MAX_DELAY_MS: 30 * 60 * 1000, // 30 minutes
  LIKE_MAX_MEMBERS_PER_HOUR: 3, // Stagger to avoid detection

  // Comment engagement delays
  COMMENT_MIN_DELAY_MS: 1 * 60 * 60 * 1000, // 1 hour
  COMMENT_MAX_DELAY_MS: 6 * 60 * 60 * 1000, // 6 hours

  // Queue configuration
  QUEUE_CONCURRENCY: 5, // More concurrency for engagement jobs
  QUEUE_ATTEMPTS: 3,
  BACKOFF_INITIAL_DELAY_MS: 30000, // 30 seconds
  BACKOFF_TYPE: 'exponential',

  // Job retention
  COMPLETED_JOB_KEEP_COUNT: 1000,
  COMPLETED_JOB_AGE_DAYS: 7,
  FAILED_JOB_KEEP_COUNT: 500,
  FAILED_JOB_AGE_DAYS: 30,
  SECONDS_PER_DAY: 86400,

  // Engagement settings
  BATCH_SIZE_LIKES: 20, // Process 20 likes per batch
  BATCH_SIZE_COMMENTS: 10, // Process 10 comments per batch
};

/**
 * Logging Configuration
 */
export const LOGGING_CONFIG = {
  PREFIX_COMMENT_POLLING: '[COMMENT_POLLING]',
  PREFIX_DM_QUEUE: '[DM_QUEUE]',
  PREFIX_POD_POST: '[POD_POST_QUEUE]',
  PREFIX_POD_AUTOMATION: '[POD_AUTOMATION]',
  PREFIX_REDIS: '[REDIS]',
  PREFIX_UNIPILE: '[UNIPILE]',
  PREFIX_CONFIG: '[CONFIG]',
};

/**
 * Feature Flags
 */
export const FEATURE_FLAGS = {
  // Mock mode (testing without credentials)
  MOCK_MODE: process.env.UNIPILE_MOCK_MODE === 'true',

  // Enable logging
  ENABLE_LOGGING: process.env.ENABLE_LOGGING !== 'false',

  // Enable detailed debug logging
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
};

/**
 * Validate all configurations on startup
 */
export function validateConfig(): void {
  UNIPILE_CONFIG.validate();

  if (FEATURE_FLAGS.MOCK_MODE) {
    console.log('[CONFIG] Running in MOCK mode (no real credentials needed)');
  }

  if (FEATURE_FLAGS.DEBUG_MODE) {
    console.log('[CONFIG] DEBUG mode enabled');
  }
}
