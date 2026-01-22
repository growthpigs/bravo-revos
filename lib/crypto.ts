/**
 * Cryptographic Utilities
 * Handles OAuth state signing, token encryption, and secure key derivation
 */

import { createHmac, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { IntegrationProvider } from '@/types/database'

// =============================================================================
// CONFIGURATION
// =============================================================================

const OAUTH_SECRET = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || ''
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || ''

// Algorithm constants
const HMAC_ALGORITHM = 'sha256'
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM recommended IV length
const AUTH_TAG_LENGTH = 16

// =============================================================================
// OAUTH STATE SIGNING (SEC-001)
// =============================================================================

export interface OAuthStatePayload {
  integrationId: string
  provider: IntegrationProvider
  timestamp: number
}

/**
 * Create a signed OAuth state parameter
 * Format: base64(payload).base64(hmac_signature)
 */
export function signOAuthState(payload: OAuthStatePayload): string {
  if (!OAUTH_SECRET) {
    console.warn('[crypto] OAUTH_STATE_SECRET not set - using insecure fallback')
  }

  const payloadStr = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadStr).toString('base64url')

  // Create HMAC signature
  const hmac = createHmac(HMAC_ALGORITHM, OAUTH_SECRET || 'insecure-fallback-key')
  hmac.update(payloadB64)
  const signature = hmac.digest('base64url')

  return `${payloadB64}.${signature}`
}

/**
 * Verify and decode a signed OAuth state parameter
 * Returns null if signature is invalid or state is malformed
 */
export function verifyOAuthState(signedState: string): OAuthStatePayload | null {
  try {
    const parts = signedState.split('.')
    if (parts.length !== 2) {
      return null
    }

    const [payloadB64, providedSignature] = parts

    // Recalculate signature
    const hmac = createHmac(HMAC_ALGORITHM, OAUTH_SECRET || 'insecure-fallback-key')
    hmac.update(payloadB64)
    const expectedSignature = hmac.digest('base64url')

    // Constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(providedSignature, expectedSignature)) {
      return null
    }

    // Decode payload
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString()
    const payload = JSON.parse(payloadStr) as OAuthStatePayload

    // Validate structure
    if (
      typeof payload.integrationId !== 'string' ||
      typeof payload.provider !== 'string' ||
      typeof payload.timestamp !== 'number'
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

// =============================================================================
// TOKEN ENCRYPTION (SEC-002)
// =============================================================================

interface EncryptedToken {
  iv: string // base64
  data: string // base64
  tag: string // base64
}

/**
 * Encrypt a token using AES-256-GCM
 * Returns encrypted data with IV and auth tag for storage
 */
export function encryptToken(plaintext: string): EncryptedToken | null {
  if (!TOKEN_ENCRYPTION_KEY) {
    console.warn('[crypto] TOKEN_ENCRYPTION_KEY not set - tokens will be stored unencrypted')
    return null
  }

  try {
    // Derive 32-byte key from the secret
    const key = deriveKey(TOKEN_ENCRYPTION_KEY)
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })

    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')

    const authTag = cipher.getAuthTag()

    return {
      iv: iv.toString('base64'),
      data: encrypted,
      tag: authTag.toString('base64'),
    }
  } catch (error) {
    console.error('[crypto] Encryption failed:', error)
    return null
  }
}

/**
 * Decrypt a token encrypted with encryptToken
 * Returns null if decryption fails (wrong key, tampered data, etc.)
 */
export function decryptToken(encrypted: EncryptedToken): string | null {
  if (!TOKEN_ENCRYPTION_KEY) {
    console.warn('[crypto] TOKEN_ENCRYPTION_KEY not set - cannot decrypt')
    return null
  }

  try {
    const key = deriveKey(TOKEN_ENCRYPTION_KEY)
    const iv = Buffer.from(encrypted.iv, 'base64')
    const authTag = Buffer.from(encrypted.tag, 'base64')

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    })
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.data, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('[crypto] Decryption failed:', error)
    return null
  }
}

/**
 * Serialize encrypted token for database storage
 */
export function serializeEncryptedToken(encrypted: EncryptedToken): string {
  return JSON.stringify(encrypted)
}

/**
 * Deserialize encrypted token from database storage
 */
export function deserializeEncryptedToken(serialized: string): EncryptedToken | null {
  try {
    const parsed = JSON.parse(serialized)
    if (
      typeof parsed.iv === 'string' &&
      typeof parsed.data === 'string' &&
      typeof parsed.tag === 'string'
    ) {
      return parsed as EncryptedToken
    }
    return null
  } catch {
    return null
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * Derive a 32-byte key from a secret using SHA-256
 */
function deriveKey(secret: string): Buffer {
  const hmac = createHmac('sha256', 'audienceos-token-key')
  hmac.update(secret)
  return hmac.digest()
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if crypto environment is properly configured
 */
export function validateCryptoConfig(): {
  oauthSigning: boolean
  tokenEncryption: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  if (!OAUTH_SECRET) {
    warnings.push('OAUTH_STATE_SECRET is not set - OAuth state signing is insecure')
  }

  if (!TOKEN_ENCRYPTION_KEY) {
    warnings.push('TOKEN_ENCRYPTION_KEY is not set - tokens will not be encrypted')
  }

  return {
    oauthSigning: !!OAUTH_SECRET,
    tokenEncryption: !!TOKEN_ENCRYPTION_KEY,
    warnings,
  }
}
