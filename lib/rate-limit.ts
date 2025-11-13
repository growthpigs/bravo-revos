/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiting for API endpoints
 * Uses sliding window algorithm with automatic cleanup
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Store rate limit records by identifier (user ID or IP address)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Identifier for this rate limit (user ID, IP, etc.)
   */
  identifier: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request is within rate limit
 *
 * @example
 * const result = checkRateLimit({
 *   maxRequests: 10,
 *   windowMs: 60 * 1000, // 1 minute
 *   identifier: userId || ipAddress
 * });
 *
 * if (!result.success) {
 *   return Response with 429 Too Many Requests
 * }
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowMs, identifier } = config;
  const now = Date.now();

  // Get or create record
  let record = rateLimitStore.get(identifier);

  // Reset if window expired
  if (!record || now > record.resetAt) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, record);
  }

  // Increment count
  record.count++;

  // Check if over limit
  const success = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);

  return {
    success,
    limit: maxRequests,
    remaining,
    reset: record.resetAt,
  };
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
export function getClientIp(request: Request): string {
  // Check headers set by proxies/load balancers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address (not available in edge runtime)
  return 'unknown';
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Public health status: 30 requests per minute per IP
  PUBLIC_HEALTH: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },

  // Authenticated health checks: 60 requests per minute per user
  AUTH_HEALTH: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },

  // Manual verification: 5 requests per minute per user (expensive operation)
  VERIFY: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
} as const;
