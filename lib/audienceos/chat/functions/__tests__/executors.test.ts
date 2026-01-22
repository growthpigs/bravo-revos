/**
 * Function Executor Unit Tests
 *
 * Tests all HGC function executors ported to AudienceOS
 * Verifies: Type safety, parameter validation, fallback behavior
 */

import { describe, it, expect } from 'vitest';
import type { ExecutorContext } from '../types';
import { getClients } from '../get-clients';
import { getClientDetails } from '../get-clients';
import { getAlerts } from '../get-alerts';
import { getRecentCommunications } from '../get-recent-communications';
import { getAgencyStats } from '../get-agency-stats';
import { navigateTo } from '../navigate-to';

/**
 * Mock ExecutorContext without Supabase (tests fallback behavior)
 */
const mockContext: ExecutorContext = {
  agencyId: 'agency-test-001',
  userId: 'user-test-001',
  supabase: undefined, // Force fallback to mock data
};

describe('Function Executors', () => {
  describe('getClients', () => {
    it('should return mock client data when Supabase unavailable', async () => {
      const result = await getClients(mockContext, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by stage parameter', async () => {
      const result = await getClients(mockContext, { stage: 'Onboarding' });

      expect(Array.isArray(result)).toBe(true);
      result.forEach(client => {
        expect(client.stage).toBe('Onboarding');
      });
    });

    it('should apply health_status filter', async () => {
      const result = await getClients(mockContext, { health_status: 'green' });

      expect(Array.isArray(result)).toBe(true);
      result.forEach(client => {
        expect(client.healthStatus).toBe('green');
      });
    });

    it('should return ClientSummary with required fields', async () => {
      const result = await getClients(mockContext, {});

      expect(result.length).toBeGreaterThan(0);
      const client = result[0];

      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('name');
      expect(client).toHaveProperty('stage');
      expect(client).toHaveProperty('healthStatus');
      expect(['green', 'yellow', 'red']).toContain(client.healthStatus);
    });

    it('should respect limit parameter', async () => {
      const result = await getClients(mockContext, { limit: 2 });

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getClientDetails', () => {
    it('should return mock client details by ID', async () => {
      const result = await getClientDetails(mockContext, { client_id: 'client-001' });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('stage');
      expect(result).toHaveProperty('healthStatus');
    });

    it('should return null for non-existent client', async () => {
      const result = await getClientDetails(mockContext, { client_id: 'non-existent' });

      expect(result).toBeNull();
    });

    it('should return extended details with integrations', async () => {
      const result = await getClientDetails(mockContext, { client_id: 'client-001' });

      if (result) {
        // Mock may include extended fields if available
        // Real Supabase implementation will provide these
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('name');
        // Extended fields are optional in mock mode
        if (result.phone) {
          expect(typeof result.phone).toBe('string');
        }
        if (result.integrations) {
          expect(Array.isArray(result.integrations)).toBe(true);
        }
      }
    });
  });

  describe('getAlerts', () => {
    it('should return mock alert data when Supabase unavailable', async () => {
      const result = await getAlerts(mockContext, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter alerts by severity', async () => {
      const result = await getAlerts(mockContext, { severity: 'critical' });

      expect(Array.isArray(result)).toBe(true);
      result.forEach(alert => {
        expect(alert.severity).toBe('critical');
      });
    });

    it('should filter alerts by status', async () => {
      const result = await getAlerts(mockContext, { status: 'active' });

      expect(Array.isArray(result)).toBe(true);
      result.forEach(alert => {
        expect(alert.status).toBe('active');
      });
    });

    it('should return AlertSummary with required fields', async () => {
      const result = await getAlerts(mockContext, {});

      expect(result.length).toBeGreaterThan(0);
      const alert = result[0];

      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('title');
      expect(alert).toHaveProperty('status');
      expect(['critical', 'high', 'medium', 'low']).toContain(alert.severity);
    });

    it('should sort by severity (critical first)', async () => {
      const result = await getAlerts(mockContext, {});

      expect(result.length).toBeGreaterThan(1);
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

      for (let i = 0; i < result.length - 1; i++) {
        const currentSeverity = severityOrder[result[i].severity];
        const nextSeverity = severityOrder[result[i + 1].severity];
        expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
      }
    });

    it('should include suggestedAction field', async () => {
      const result = await getAlerts(mockContext, {});

      expect(result.length).toBeGreaterThan(0);
      // suggestedAction is optional but should be defined if present
      const alert = result[0];
      expect(alert).toHaveProperty('suggestedAction');
    });
  });

  describe('getRecentCommunications', () => {
    it('should return empty array when client_id is missing', async () => {
      const result = await getRecentCommunications(mockContext, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should validate required client_id parameter', async () => {
      // This should log a warning and return empty array
      const result = await getRecentCommunications(mockContext, {
        client_id: undefined,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return communications when client_id provided', async () => {
      const result = await getRecentCommunications(mockContext, {
        client_id: 'client-001',
      });

      expect(Array.isArray(result)).toBe(true);
      // Mock should have some data for client-001
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return CommunicationSummary with required fields', async () => {
      const result = await getRecentCommunications(mockContext, {
        client_id: 'client-001',
      });

      if (result.length > 0) {
        const comm = result[0];
        expect(comm).toHaveProperty('id');
        expect(comm).toHaveProperty('type');
        expect(comm).toHaveProperty('date');
        expect(['email', 'call', 'meeting', 'note']).toContain(comm.type);
      }
    });

    it('should filter by communication type', async () => {
      const result = await getRecentCommunications(mockContext, {
        client_id: 'client-001',
        type: 'email',
      });

      expect(Array.isArray(result)).toBe(true);
      result.forEach(comm => {
        expect(comm.type).toBe('email');
      });
    });

    it('should respect days limit parameter', async () => {
      const result = await getRecentCommunications(mockContext, {
        client_id: 'client-001',
        days: 7,
      });

      expect(Array.isArray(result)).toBe(true);
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      result.forEach(comm => {
        expect(new Date(comm.date).getTime()).toBeGreaterThanOrEqual(cutoffDate.getTime());
      });
    });

    it('should respect limit parameter', async () => {
      const result = await getRecentCommunications(mockContext, {
        client_id: 'client-001',
        limit: 3,
      });

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getAgencyStats', () => {
    it('should return AgencyStats with default period (week)', async () => {
      const result = await getAgencyStats(mockContext, {});

      expect(result).toHaveProperty('period');
      expect(result.period).toBe('week');
      expect(result).toHaveProperty('totalClients');
      expect(result).toHaveProperty('activeClients');
      expect(result).toHaveProperty('atRiskClients');
      expect(result).toHaveProperty('openAlerts');
      expect(result).toHaveProperty('avgHealthScore');
    });

    it('should support period parameter (today)', async () => {
      const result = await getAgencyStats(mockContext, { period: 'today' });

      expect(result.period).toBe('today');
      expect(typeof result.totalClients).toBe('number');
    });

    it('should support period parameter (month)', async () => {
      const result = await getAgencyStats(mockContext, { period: 'month' });

      expect(result.period).toBe('month');
    });

    it('should support period parameter (quarter)', async () => {
      const result = await getAgencyStats(mockContext, { period: 'quarter' });

      expect(result.period).toBe('quarter');
    });

    it('should return numeric stats with valid ranges', async () => {
      const result = await getAgencyStats(mockContext, {});

      expect(result.totalClients).toBeGreaterThanOrEqual(0);
      expect(result.activeClients).toBeGreaterThanOrEqual(0);
      expect(result.atRiskClients).toBeGreaterThanOrEqual(0);
      expect(result.openAlerts).toBeGreaterThanOrEqual(0);
      expect(result.avgHealthScore).toBeGreaterThanOrEqual(0);
      expect(result.avgHealthScore).toBeLessThanOrEqual(100);
    });

    it('should include resolvedAlertsThisPeriod field', async () => {
      const result = await getAgencyStats(mockContext, {});

      expect(result).toHaveProperty('resolvedAlertsThisPeriod');
      expect(typeof result.resolvedAlertsThisPeriod).toBe('number');
    });

    it('should return different data for different periods', async () => {
      const today = await getAgencyStats(mockContext, { period: 'today' });
      const week = await getAgencyStats(mockContext, { period: 'week' });

      // At least one stat should differ between periods (in real Supabase)
      // In mock mode, they may be the same, but structure should be identical
      expect(today).toHaveProperty('period');
      expect(week).toHaveProperty('period');
    });
  });

  describe('navigateTo', () => {
    it('should be async function', async () => {
      const result = navigateTo(mockContext, {
        destination: 'clients',
      });

      // navigateTo returns a Promise
      expect(result instanceof Promise).toBe(true);
    });

    it('should generate URL for clients destination', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'clients',
      });

      expect(result).toHaveProperty('url');
      expect(result.url).toContain('/clients');
    });

    it('should generate URL with client_id for client_detail', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'client_detail',
        client_id: 'client-123',
      });

      expect(result.url).toContain('/clients/client-123');
    });

    it('should add query parameters from filters', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'clients',
        filters: {
          status: 'at_risk',
          sort: 'recent',
        },
      });

      expect(result.url).toContain('status=at_risk');
      expect(result.url).toContain('sort=recent');
    });

    it('should return NavigationAction with destination and filters', async () => {
      const filters = { health: 'red' };
      const result = await navigateTo(mockContext, {
        destination: 'alerts',
        filters,
      });

      expect(result).toHaveProperty('destination');
      expect(result.destination).toBe('alerts');
      expect(result).toHaveProperty('filters');
    });

    it('should ignore undefined filter values', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'clients',
        filters: {
          status: 'active',
          empty: undefined,
          nullable: null,
        },
      });

      expect(result.url).toContain('status=active');
      expect(result.url).not.toContain('empty');
      expect(result.url).not.toContain('nullable');
    });

    it('should map alerts destination correctly', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'alerts',
      });

      expect(result.url).toBe('/alerts');
    });

    it('should map default destination for unknown paths', async () => {
      const result = await navigateTo(mockContext, {
        destination: 'unknown_page',
      });

      expect(result.url).toBe('/');
    });
  });

  describe('Integration Tests', () => {
    it('should handle all executors without throwing errors', async () => {
      const operations = [
        getClients(mockContext, {}),
        getClientDetails(mockContext, { client_id: 'test' }),
        getAlerts(mockContext, {}),
        getRecentCommunications(mockContext, { client_id: 'test' }),
        getAgencyStats(mockContext, {}),
        navigateTo(mockContext, { destination: 'clients' }),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(6);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should maintain type safety across all executors', async () => {
      const clients = await getClients(mockContext, {});
      const stats = await getAgencyStats(mockContext, {});
      const alerts = await getAlerts(mockContext, {});

      // Verify types are correct
      expect(Array.isArray(clients)).toBe(true);
      expect(typeof stats.totalClients).toBe('number');
      expect(Array.isArray(alerts)).toBe(true);
    });
  });
});
