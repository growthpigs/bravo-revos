/**
 * F-02: Mem0 Memory System Unit Tests
 * Validates multi-tenant key generation and tenant isolation logic
 */

import { describe, it, expect } from '@jest/globals';
import {
  buildTenantKey,
  verifyTenantKey,
  extractTenantFromKey,
} from '@/lib/mem0/client';

describe('F-02: Mem0 Memory System - Tenant Isolation', () => {
  const testAgencyId = 'agency-prod-123';
  const testClientId = 'client-acme-456';
  const testUserId = 'user-john-doe-789';

  /**
   * Test 1: Build tenant key correctly
   */
  it('should build tenant key with correct format', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    expect(key).toBe(`${testAgencyId}::${testClientId}::${testUserId}`);
    expect(key).toContain('::');
    expect(key.split('::').length).toBe(3);
  });

  /**
   * Test 2: Verify tenant key matches expected values
   */
  it('should verify tenant key matches expected identifiers', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    const isValid = verifyTenantKey(
      key,
      testAgencyId,
      testClientId,
      testUserId
    );

    expect(isValid).toBe(true);
  });

  /**
   * Test 3: Verify tenant key rejects mismatched identifiers
   */
  it('should reject tenant key with mismatched agencyId', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    const isValid = verifyTenantKey(
      key,
      'different-agency-id', // Wrong agency
      testClientId,
      testUserId
    );

    expect(isValid).toBe(false);
  });

  /**
   * Test 4: Verify tenant key rejects mismatched clientId
   */
  it('should reject tenant key with mismatched clientId', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    const isValid = verifyTenantKey(
      key,
      testAgencyId,
      'different-client-id', // Wrong client
      testUserId
    );

    expect(isValid).toBe(false);
  });

  /**
   * Test 5: Verify tenant key rejects mismatched userId
   */
  it('should reject tenant key with mismatched userId', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    const isValid = verifyTenantKey(
      key,
      testAgencyId,
      testClientId,
      'different-user-id' // Wrong user
    );

    expect(isValid).toBe(false);
  });

  /**
   * Test 6: Extract tenant information from key
   */
  it('should extract tenant identifiers from key', () => {
    const key = buildTenantKey(testAgencyId, testClientId, testUserId);

    const extracted = extractTenantFromKey(key);

    expect(extracted).not.toBeNull();
    expect(extracted?.agencyId).toBe(testAgencyId);
    expect(extracted?.clientId).toBe(testClientId);
    expect(extracted?.userId).toBe(testUserId);
  });

  /**
   * Test 7: Reject invalid tenant key format
   */
  it('should reject invalid tenant key format', () => {
    const invalidKey = 'invalid-key-no-separators';

    const extracted = extractTenantFromKey(invalidKey);

    expect(extracted).toBeNull();
  });

  /**
   * Test 8: Reject tenant key with too many parts
   */
  it('should reject tenant key with too many parts', () => {
    const invalidKey = `${testAgencyId}::${testClientId}::${testUserId}::extra-part`;

    const extracted = extractTenantFromKey(invalidKey);

    expect(extracted).toBeNull();
  });

  /**
   * Test 9: Handle missing agencyId
   */
  it('should throw error when agencyId is missing', () => {
    expect(() => {
      buildTenantKey('', testClientId, testUserId);
    }).toThrow();
  });

  /**
   * Test 10: Handle missing clientId
   */
  it('should throw error when clientId is missing', () => {
    expect(() => {
      buildTenantKey(testAgencyId, '', testUserId);
    }).toThrow();
  });

  /**
   * Test 11: Handle missing userId
   */
  it('should throw error when userId is missing', () => {
    expect(() => {
      buildTenantKey(testAgencyId, testClientId, '');
    }).toThrow();
  });

  /**
   * Test 12: Tenant isolation - different tenants produce different keys
   */
  it('should produce different keys for different tenants', () => {
    const key1 = buildTenantKey('agency1', 'client1', 'user1');
    const key2 = buildTenantKey('agency2', 'client2', 'user2');

    expect(key1).not.toBe(key2);
  });

  /**
   * Test 13: Tenant isolation - same agency, different clients
   */
  it('should produce different keys for same agency but different clients', () => {
    const key1 = buildTenantKey(testAgencyId, 'client1', testUserId);
    const key2 = buildTenantKey(testAgencyId, 'client2', testUserId);

    expect(key1).not.toBe(key2);
    expect(key1.split('::')[0]).toBe(key2.split('::')[0]); // Same agency
    expect(key1.split('::')[1]).not.toBe(key2.split('::')[1]); // Different client
  });

  /**
   * Test 14: Tenant isolation - same client, different users
   */
  it('should produce different keys for same client but different users', () => {
    const key1 = buildTenantKey(testAgencyId, testClientId, 'user1');
    const key2 = buildTenantKey(testAgencyId, testClientId, 'user2');

    expect(key1).not.toBe(key2);
    expect(key1.split('::')[0]).toBe(key2.split('::')[0]); // Same agency
    expect(key1.split('::')[1]).toBe(key2.split('::')[1]); // Same client
    expect(key1.split('::')[2]).not.toBe(key2.split('::')[2]); // Different user
  });

  /**
   * Test 15: Tenant key stability - same inputs produce same output
   */
  it('should produce same key for same inputs', () => {
    const key1 = buildTenantKey(testAgencyId, testClientId, testUserId);
    const key2 = buildTenantKey(testAgencyId, testClientId, testUserId);

    expect(key1).toBe(key2);
  });
});
