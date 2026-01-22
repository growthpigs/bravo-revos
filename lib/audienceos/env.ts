/**
 * Centralized Environment Variable Validation
 *
 * This module provides type-safe, validated access to environment variables.
 * All env var access should go through this module to ensure:
 * 1. Required vars are present in production
 * 2. Type safety for all configuration
 * 3. Clear documentation of what's needed
 *
 * @module lib/env
 */

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

export const IS_PRODUCTION = process.env.NODE_ENV === 'production'
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
export const IS_TEST = process.env.NODE_ENV === 'test'

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

class EnvValidationError extends Error {
  constructor(varName: string, message: string) {
    super(`[ENV] ${varName}: ${message}`)
    this.name = 'EnvValidationError'
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    if (IS_PRODUCTION) {
      throw new EnvValidationError(name, 'Required in production but not set')
    }
    console.warn(`[ENV] ${name} not set (required in production)`)
    return ''
  }
  return value
}

function optional(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue
}

function requiredInProd(name: string, devDefault: string = ''): string {
  const value = process.env[name]
  if (!value) {
    if (IS_PRODUCTION) {
      throw new EnvValidationError(name, 'Required in production but not set')
    }
    return devDefault
  }
  return value
}

// =============================================================================
// PUBLIC ENVIRONMENT VARIABLES (Safe to expose to client)
// =============================================================================

export const publicEnv = {
  // Supabase
  supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),

  // App URLs
  appUrl: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  vercelUrl: optional('NEXT_PUBLIC_VERCEL_URL'),

  // Monitoring
  sentryDsn: optional('NEXT_PUBLIC_SENTRY_DSN'),

  // Feature flags
  mockMode: optional('NEXT_PUBLIC_MOCK_MODE') === 'true',
} as const

// =============================================================================
// SERVER ENVIRONMENT VARIABLES (Never expose to client)
// =============================================================================

export const serverEnv = {
  // Security (CRITICAL - must be set in production)
  oauthStateSecret: requiredInProd('OAUTH_STATE_SECRET', 'dev-oauth-secret'),
  tokenEncryptionKey: requiredInProd('TOKEN_ENCRYPTION_KEY', 'dev-encryption-key'),
  internalApiKey: requiredInProd('INTERNAL_API_KEY', 'dev-internal-key'),

  // Supabase Service
  supabaseServiceKey: requiredInProd('SUPABASE_SERVICE_ROLE_KEY'),

  // Google OAuth
  google: {
    clientId: requiredInProd('GOOGLE_CLIENT_ID'),
    clientSecret: requiredInProd('GOOGLE_CLIENT_SECRET'),
    aiApiKey: requiredInProd('GOOGLE_AI_API_KEY'),
  },

  // Google Ads (optional integration)
  googleAds: {
    clientId: optional('GOOGLE_ADS_CLIENT_ID'),
    clientSecret: optional('GOOGLE_ADS_CLIENT_SECRET'),
  },

  // Slack OAuth
  slack: {
    clientId: requiredInProd('SLACK_CLIENT_ID'),
    clientSecret: requiredInProd('SLACK_CLIENT_SECRET'),
    signingSecret: optional('SLACK_SIGNING_SECRET'),
  },

  // Meta/Facebook
  meta: {
    appId: optional('META_APP_ID'),
    appSecret: optional('META_APP_SECRET'),
  },

  // Unipile (LinkedIn integration)
  unipile: {
    apiKey: optional('UNIPILE_API_KEY'),
    clientId: optional('UNIPILE_CLIENT_ID'),
    clientSecret: optional('UNIPILE_CLIENT_SECRET'),
    dsn: optional('UNIPILE_DSN', 'https://api3.unipile.com:13344'),
    oauthEndpoint: optional('UNIPILE_OAUTH_ENDPOINT', 'https://account.unipile.com'),
    mockMode: optional('UNIPILE_MOCK_MODE') === 'true',
  },

  // Email (Resend)
  email: {
    apiKey: optional('RESEND_API_KEY'),
    fromEmail: optional('RESEND_FROM_EMAIL', 'noreply@audienceos.com'),
  },

  // Diiiploy Gateway
  diiiploy: {
    url: optional('DIIIPLOY_GATEWAY_URL'),
    apiKey: optional('DIIIPLOY_GATEWAY_API_KEY'),
  },

  // Monitoring
  sentryDsn: optional('SENTRY_DSN'),
} as const

// =============================================================================
// VALIDATION ON IMPORT
// =============================================================================

/**
 * Validate all required environment variables.
 * Called automatically on module import in production.
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check critical security vars
  if (!process.env.OAUTH_STATE_SECRET) {
    errors.push('OAUTH_STATE_SECRET is not set')
  }
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    errors.push('TOKEN_ENCRYPTION_KEY is not set')
  }

  // Check Supabase
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')
  }

  // Check OAuth providers (at least one should be configured)
  const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  const hasSlackOAuth = process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET

  if (IS_PRODUCTION && !hasGoogleOAuth && !hasSlackOAuth) {
    errors.push('At least one OAuth provider must be configured (Google or Slack)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Log validation status in development
if (IS_DEVELOPMENT) {
  const { valid, errors } = validateEnv()
  if (!valid) {
    console.warn('[ENV] Missing environment variables:')
    errors.forEach(err => console.warn(`  - ${err}`))
  }
}

// Fail fast in production
if (IS_PRODUCTION) {
  const { valid, errors } = validateEnv()
  if (!valid) {
    console.error('[ENV] CRITICAL: Missing required environment variables in production:')
    errors.forEach(err => console.error(`  - ${err}`))
    // Don't throw here - let individual modules handle their requirements
  }
}
