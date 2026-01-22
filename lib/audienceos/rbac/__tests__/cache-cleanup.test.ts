/**
 * Cache Cleanup Tests
 *
 * Verifies that cache cleanup prevents memory leaks by:
 * - Removing expired entries periodically
 * - Enforcing max cache size limit
 *
 * BLOCKER 4: Cache cleanup implementation
 */

import { PermissionService } from '../permission-service';
import type { PermissionCacheEntry } from '../types';

describe('Cache Cleanup', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe('Cache internals', () => {
    it('should have cleanup configuration', () => {
      expect((service as any).MAX_CACHE_SIZE).toBe(1000);
      expect((service as any).CLEANUP_INTERVAL).toBe(60 * 1000); // 1 minute
      expect((service as any).lastCleanupTime).toBeDefined();
    });

    it('should cleanup expired entries when triggered', () => {
      // Manually add expired entry to cache
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      cache.set('user-1:agency-1', {
        permissions: [],
        expires: Date.now() - 1000, // Expired 1 second ago
      });
      cache.set('user-2:agency-1', {
        permissions: [],
        expires: Date.now() + 5 * 60 * 1000, // Valid for 5 minutes
      });

      expect(cache.size).toBe(2);

      // Force cleanup to run
      (service as any).lastCleanupTime = 0; // Make interval pass
      (service as any).cleanupCacheIfNeeded();

      // Expired entry should be removed
      expect(cache.size).toBe(1);
      expect(cache.has('user-2:agency-1')).toBe(true);
      expect(cache.has('user-1:agency-1')).toBe(false);
    });

    it('should not cleanup if interval has not passed', () => {
      // Add expired entry
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      cache.set('user-1:agency-1', {
        permissions: [],
        expires: Date.now() - 1000, // Expired
      });

      // Set last cleanup to now (interval hasn't passed)
      (service as any).lastCleanupTime = Date.now();

      // Try to cleanup
      (service as any).cleanupCacheIfNeeded();

      // Entry should still be there (cleanup skipped)
      expect(cache.size).toBe(1);
    });

    it('should enforce max cache size', () => {
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;

      // Set small max size for testing
      (service as any).MAX_CACHE_SIZE = 5;

      // Add 10 entries
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        cache.set(`user-${i}:agency-1`, {
          permissions: [],
          expires: now + i * 1000, // Stagger expiry times
        });
      }

      expect(cache.size).toBe(10);

      // Force cleanup
      (service as any).lastCleanupTime = 0;
      (service as any).cleanupCacheIfNeeded();

      // Should be at or below max size
      expect(cache.size).toBeLessThanOrEqual(5);
    });

    it('should remove oldest entries when over limit', () => {
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      (service as any).MAX_CACHE_SIZE = 3;

      const now = Date.now();

      // Add entries with different expiry times
      cache.set('oldest:agency-1', { permissions: [], expires: now + 1000 });
      cache.set('middle:agency-1', { permissions: [], expires: now + 2000 });
      cache.set('newest:agency-1', { permissions: [], expires: now + 3000 });
      cache.set('extra1:agency-1', { permissions: [], expires: now + 4000 });
      cache.set('extra2:agency-1', { permissions: [], expires: now + 5000 });

      expect(cache.size).toBe(5);

      // Force cleanup
      (service as any).lastCleanupTime = 0;
      (service as any).cleanupCacheIfNeeded();

      // Should keep newest 3 entries
      expect(cache.size).toBe(3);
      expect(cache.has('newest:agency-1')).toBe(true);
      expect(cache.has('extra1:agency-1')).toBe(true);
      expect(cache.has('extra2:agency-1')).toBe(true);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
      expect(stats.size).toBe(0);
    });

    it('should show expired entries', () => {
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      cache.set('user-1:agency-1', {
        permissions: [],
        expires: Date.now() - 1000, // Expired
      });

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].expired).toBe(true);
    });

    it('should show non-expired entries', () => {
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      cache.set('user-1:agency-1', {
        permissions: [],
        expires: Date.now() + 5 * 60 * 1000, // Valid for 5 minutes
      });

      const stats = service.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].expired).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      const cache = (service as any).cache as Map<string, PermissionCacheEntry>;
      cache.set('user-1:agency-1', { permissions: [], expires: Date.now() + 5000 });
      cache.set('user-2:agency-1', { permissions: [], expires: Date.now() + 5000 });

      expect(service.getCacheStats().size).toBe(2);

      service.clearCache();

      expect(service.getCacheStats().size).toBe(0);
    });
  });
});
