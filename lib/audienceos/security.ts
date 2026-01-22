/**
 * Security Utilities
 * Provides input sanitization, rate limiting, and security helpers
 *
 * TD-004: Distributed rate limiting via Supabase
 * TD-006: Email validation via email-validator library
 * TD-008: IP validation to prevent spoofing
 */

import { NextRequest, NextResponse } from 'next/server'
import * as EmailValidator from 'email-validator'

// Lazy load DOMPurify to avoid jsdom dependency issues on Vercel serverless
let DOMPurify: typeof import('isomorphic-dompurify').default | null = null
async function getDOMPurify() {
  if (!DOMPurify) {
    const mod = await import('isomorphic-dompurify')
    DOMPurify = mod.default
  }
  return DOMPurify
}
import { createClient } from '@supabase/supabase-js'

// Service role client for rate limiting (bypasses RLS)
const getRateLimitClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[RateLimit] Missing Supabase credentials, falling back to in-memory')
    return null
  }
  return createClient(url, key)
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Sanitize search input for SQL LIKE patterns
 * Escapes special characters (%, _) and limits length to prevent abuse
 */
export function sanitizeSearchPattern(input: unknown, maxLength: number = 100): string {
  if (typeof input !== 'string') return ''
  return sanitizeString(input)
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .slice(0, maxLength)
}

/**
 * Sanitize HTML content using DOMPurify (TD-003 fix)
 * Handles XSS vectors including encoding bypasses, SVG, data URIs
 * Note: This is async to enable lazy loading of DOMPurify (jsdom dependency)
 */
export async function sanitizeHtml(input: unknown): Promise<string> {
  if (typeof input !== 'string') return ''
  const purify = await getDOMPurify()
  return purify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  }).trim()
}

/**
 * Validate and sanitize email (TD-006 fix)
 * Uses email-validator library for RFC-compliant validation
 */
export function sanitizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const email = input.trim().toLowerCase()

  // Use email-validator for proper RFC 5322 validation
  if (!EmailValidator.validate(email)) return null

  return email
}

/**
 * Validate UUID format
 */
export function isValidUUID(input: unknown): boolean {
  if (typeof input !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(input)
}

/**
 * Sanitize object keys and values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key)
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[sanitizedKey] = value
    }
  }
  return sanitized as T
}

// =============================================================================
// RATE LIMITING (Distributed via Supabase - TD-004 fix)
// =============================================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Fallback in-memory store (used when Supabase unavailable)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (fallback only)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
}

/**
 * Extract and validate client IP address (TD-008 fix)
 * Validates X-Forwarded-For chain to prevent IP spoofing
 */
export function getClientIp(request: NextRequest): string {
  // Priority 1: Cloudflare's trusted header (cannot be spoofed)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp && isValidIpAddress(cfConnectingIp)) {
    return cfConnectingIp
  }

  // Priority 2: Vercel's real IP header
  const xRealIp = request.headers.get('x-real-ip')
  if (xRealIp && isValidIpAddress(xRealIp)) {
    return xRealIp
  }

  // Priority 3: X-Forwarded-For (validate rightmost trusted entry)
  const xForwardedFor = request.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // The rightmost IP is added by our reverse proxy and is most trustworthy
    // Left IPs can be spoofed by the client
    const ips = xForwardedFor.split(',').map(ip => ip.trim())
    // Take the rightmost valid IP (closest to our infrastructure)
    for (let i = ips.length - 1; i >= 0; i--) {
      if (isValidIpAddress(ips[i])) {
        return ips[i]
      }
    }
  }

  // Fallback: unknown (will still rate limit, just not per-IP)
  return 'unknown'
}

/**
 * Validate IP address format (IPv4 or IPv6)
 */
function isValidIpAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/
  // IPv6 pattern (simplified)
  const ipv6Regex = /^(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}$|^::1$|^::$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Check if request is rate limited (distributed)
 * Uses Supabase for distributed rate limiting across instances
 * Falls back to in-memory if Supabase unavailable
 */
export async function checkRateLimitDistributed(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const supabase = getRateLimitClient()
  const now = Date.now()
  const windowStart = new Date(now - (now % config.windowMs))
  const expiresAt = new Date(windowStart.getTime() + config.windowMs * 2)

  // If no Supabase client, fall back to in-memory
  if (!supabase) {
    return checkRateLimitInMemory(identifier, config)
  }

  try {
    // Upsert rate limit entry with atomic increment
    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_window_start: windowStart.toISOString(),
      p_expires_at: expiresAt.toISOString(),
      p_max_requests: config.maxRequests,
    })

    if (error) {
      console.warn('[RateLimit] Supabase error, falling back to in-memory:', error.message)
      return checkRateLimitInMemory(identifier, config)
    }

    const count = data?.count ?? 1
    const allowed = count <= config.maxRequests

    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime: windowStart.getTime() + config.windowMs,
    }
  } catch (err) {
    console.warn('[RateLimit] Error, falling back to in-memory:', err)
    return checkRateLimitInMemory(identifier, config)
  }
}

/**
 * In-memory rate limit check (fallback)
 */
function checkRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Synchronous rate limit check (uses in-memory only)
 * For backwards compatibility - prefer withRateLimitAsync
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimitInMemory(identifier, config)
}

/**
 * Rate limit middleware for API routes (async, distributed)
 * Uses Supabase for distributed rate limiting
 */
export async function withRateLimitAsync(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  const ip = getClientIp(request)
  const result = await checkRateLimitDistributed(ip, config)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_RATE_LIMIT.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}

/**
 * Rate limit middleware for API routes (sync, in-memory fallback)
 * For backwards compatibility - prefer withRateLimitAsync
 */
export function withRateLimit(
  request: NextRequest,
  config?: RateLimitConfig
): NextResponse | null {
  const ip = getClientIp(request)
  const result = checkRateLimitInMemory(ip, config)

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config?.maxRequests || DEFAULT_RATE_LIMIT.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
          'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000)),
        },
      }
    )
  }

  return null
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Sanitize error messages for client response
 * Removes sensitive details that could aid attackers
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose stack traces or internal details
    const message = error.message.toLowerCase()

    // Check for sensitive patterns
    if (message.includes('supabase') ||
        message.includes('postgres') ||
        message.includes('database') ||
        message.includes('connection') ||
        message.includes('timeout')) {
      return 'A database error occurred. Please try again.'
    }

    if (message.includes('unauthorized') || message.includes('auth')) {
      return 'Authentication required.'
    }

    if (message.includes('forbidden') || message.includes('permission')) {
      return 'You do not have permission to perform this action.'
    }

    if (message.includes('not found')) {
      return 'The requested resource was not found.'
    }

    // Return generic message for other errors
    return 'An unexpected error occurred. Please try again.'
  }

  return 'An unexpected error occurred. Please try again.'
}

/**
 * Create a safe error response (no sensitive data)
 */
export function createErrorResponse(
  status: number,
  message: string,
  logError?: unknown
): NextResponse {
  // Log the full error server-side (but not in production client response)
  if (logError && process.env.NODE_ENV !== 'production') {
    console.error('[API Error]', logError)
  }

  return NextResponse.json(
    { error: message },
    { status }
  )
}

// =============================================================================
// REQUEST VALIDATION
// =============================================================================

/**
 * Validate request body exists and is valid JSON
 * @param request - The incoming request
 * @param maxSize - Maximum body size in bytes (default: 1MB)
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest,
  maxSize: number = 1024 * 1024 // 1MB default
): Promise<{ data: T | null; error: string | null }> {
  try {
    // Check content-length header for early rejection
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return { data: null, error: `Request body too large (max ${Math.round(maxSize / 1024)}KB)` }
    }

    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return { data: null, error: 'Content-Type must be application/json' }
    }

    const body = await request.json()

    if (typeof body !== 'object' || body === null) {
      return { data: null, error: 'Request body must be an object' }
    }

    return { data: body as T, error: null }
  } catch {
    return { data: null, error: 'Invalid JSON in request body' }
  }
}

// =============================================================================
// TIMEOUT WRAPPER
// =============================================================================

/**
 * Wrap a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  errorMessage: string = 'Request timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ])
}

// =============================================================================
// CSRF PROTECTION (TD-005 fix)
// =============================================================================

const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

// Methods that require CSRF validation
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Validate CSRF token from request header against cookie
 */
export function validateCsrfToken(request: NextRequest, expectedToken: string): boolean {
  const token = request.headers.get(CSRF_HEADER_NAME)
  if (!token || !expectedToken) return false
  return constantTimeEqual(token, expectedToken)
}

/**
 * Get CSRF token from request cookies
 */
export function getCsrfTokenFromCookies(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Check if request method requires CSRF validation
 */
export function requiresCsrfValidation(request: NextRequest): boolean {
  return CSRF_PROTECTED_METHODS.includes(request.method)
}

/**
 * CSRF middleware for API routes (TD-005 fix)
 * Returns error response if CSRF validation fails, null if valid
 *
 * Usage in API routes:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const csrfError = withCsrfProtection(request)
 *   if (csrfError) return csrfError
 *   // ... rest of handler
 * }
 * ```
 */
export function withCsrfProtection(request: NextRequest): NextResponse | null {
  // Skip CSRF check for safe methods
  if (!requiresCsrfValidation(request)) {
    return null
  }

  // Get token from cookie
  const cookieToken = getCsrfTokenFromCookies(request)
  if (!cookieToken) {
    return NextResponse.json(
      { error: 'CSRF token missing. Please refresh the page.' },
      { status: 403 }
    )
  }

  // Validate header token matches cookie token
  if (!validateCsrfToken(request, cookieToken)) {
    return NextResponse.json(
      { error: 'CSRF token invalid. Please refresh the page.' },
      { status: 403 }
    )
  }

  return null
}

/**
 * Create a response with CSRF token cookie set
 * Use this when returning responses that need to include CSRF token
 */
export function withCsrfCookie(response: NextResponse, token?: string): NextResponse {
  const csrfToken = token || generateCsrfToken()

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}

/**
 * Get or create CSRF token for a request
 * Returns existing token from cookie or generates a new one
 */
export function getOrCreateCsrfToken(request: NextRequest): string {
  const existing = getCsrfTokenFromCookies(request)
  return existing || generateCsrfToken()
}
