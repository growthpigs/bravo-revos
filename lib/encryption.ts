/**
 * Encryption Utilities
 * Handles AES-256-GCM encryption/decryption for sensitive data
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';

/**
 * Get encryption key from environment
 * Falls back to a default if not set (for development only)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: ENCRYPTION_KEY environment variable is required in production. ' +
        'Generate one with: openssl rand -hex 32'
      );
    }
    console.warn(
      'Warning: ENCRYPTION_KEY not set. Using default development key. ' +
      'Set ENCRYPTION_KEY environment variable for production.'
    );
    // Default 32-byte key for development (DO NOT USE IN PRODUCTION)
    return Buffer.from(
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      ENCODING
    );
  }
  return Buffer.from(key, ENCODING);
}

/**
 * Encrypt data using AES-256-GCM
 * Returns encrypted data with IV and auth tag for decryption
 */
export function encryptData(data: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16); // 128-bit IV
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(data, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data (all hex-encoded for storage)
    const combined = iv.toString(ENCODING) + ':' + authTag.toString(ENCODING) + ':' + encrypted;
    return combined;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decryptData(encryptedString: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedString.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a random encryption key (32 bytes for AES-256)
 * Use this once to set ENCRYPTION_KEY environment variable
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString(ENCODING);
}

/**
 * Hash a password using bcrypt-style (for session tokens, etc.)
 */
export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest(ENCODING);
}
