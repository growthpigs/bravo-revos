/**
 * Cryptographic utilities for secure token generation
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * Used for invite URLs, password reset links, etc.
 *
 * @param byteLength - Number of random bytes (default: 32)
 * @returns URL-safe base64-encoded token
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/**
 * Generate a simple numeric code for SMS/email verification
 *
 * @param length - Number of digits (default: 6)
 * @returns Numeric code as string
 */
export function generateVerificationCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}
