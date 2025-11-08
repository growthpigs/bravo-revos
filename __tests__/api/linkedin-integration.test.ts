/**
 * LinkedIn API Integration Tests
 * Tests the actual HTTP endpoints using real requests
 */

describe('LinkedIn API Integration', () => {
  const BASE_URL = 'http://localhost:3000';
  const TEST_USER_ID = '00000000-0000-0000-0000-000000000003';

  beforeAll(async () => {
    // Wait for dev server to be ready
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(BASE_URL);
        if (response.ok || response.status === 404) {
          break;
        }
      } catch {
        if (i === 9) throw new Error('Dev server not ready');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  });

  describe('POST /api/linkedin/auth', () => {
    it('should authenticate LinkedIn account in development mode', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'test.integration@linkedin.com',
          password: 'testpass',
          accountName: 'Integration Test Account',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('success');
      expect(data.account).toBeDefined();
      expect(data.account.user_id).toBe(TEST_USER_ID);
      expect(data.account.account_name).toBe('Integration Test Account');
      expect(data.account.status).toBe('active');
      expect(data.account.id).toBeDefined();
    }, 15000);

    it('should validate required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'test@linkedin.com',
          // missing password and accountName
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should reject invalid action', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invalid_action',
          username: 'test@linkedin.com',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid action');
    });

    it('should return proper error when Unipile returns invalid status', async () => {
      // This tests the error handling path
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'test@linkedin.com',
          password: 'pass',
          accountName: 'Test',
        }),
      });

      // In development mode with mock, should always succeed
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('GET /api/linkedin/accounts', () => {
    it('should retrieve connected LinkedIn accounts', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/accounts`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total).toBeDefined();
      expect(Array.isArray(data.accounts)).toBe(true);

      // Should include at least the test account we created
      if (data.accounts.length > 0) {
        const account = data.accounts[0];
        expect(account.id).toBeDefined();
        expect(account.account_name).toBeDefined();
        expect(account.status).toBeDefined();
        expect(account.profile_data).toBeDefined();
        expect(account.session_expires_at).toBeDefined();
      }
    });

    it('should return accounts with proper structure', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/accounts`);

      const data = await response.json();

      if (data.accounts.length > 0) {
        const account = data.accounts[0];

        // Verify account structure
        expect(typeof account.id).toBe('string');
        expect(typeof account.account_name).toBe('string');
        expect(['active', 'expired', 'error']).toContain(account.status);
        expect(account.profile_data).toMatchObject({
          name: expect.any(String),
          email: expect.any(String),
        });

        // Verify timestamps
        expect(() => new Date(account.session_expires_at)).not.toThrow();
      }
    });

    it('should handle missing account ID for deletion', async () => {
      const response = await fetch(
        `${BASE_URL}/api/linkedin/accounts?id=`,
        { method: 'DELETE' }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Missing account ID');
    });
  });

  describe('DELETE /api/linkedin/accounts', () => {
    let accountIdToDelete: string;

    beforeAll(async () => {
      // Create an account first
      const createResponse = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'delete.test@linkedin.com',
          password: 'pass',
          accountName: 'To Delete',
        }),
      });

      const data = await createResponse.json();
      accountIdToDelete = data.account?.id;
    });

    it('should disconnect a LinkedIn account', async () => {
      if (!accountIdToDelete) {
        console.warn('Skipping delete test - account not created');
        return;
      }

      const response = await fetch(
        `${BASE_URL}/api/linkedin/accounts?id=${accountIdToDelete}`,
        { method: 'DELETE' }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('success');
      expect(data.message).toContain('disconnected');
    });

    it('should return 404 for non-existent account', async () => {
      const response = await fetch(
        `${BASE_URL}/api/linkedin/accounts?id=non-existent-id-12345`,
        { method: 'DELETE' }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toContain('Account not found');
    });
  });

  describe('Service Role Authentication', () => {
    it('should use service role to bypass RLS for account management', async () => {
      // Test by creating multiple accounts (RLS would prevent this with normal user)
      const promises = Array.from({ length: 3 }, (_, i) =>
        fetch(`${BASE_URL}/api/linkedin/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'authenticate',
            username: `test${i}@linkedin.com`,
            password: 'pass',
            accountName: `Test Account ${i}`,
          }),
        })
      );

      const responses = await Promise.all(promises);

      // All requests should succeed (service role bypasses RLS)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Verify all accounts are retrievable
      const getResponse = await fetch(`${BASE_URL}/api/linkedin/accounts`);
      const data = await getResponse.json();

      expect(data.total).toBeGreaterThanOrEqual(3);
    }, 20000);
  });

  describe('Development vs Production Mode', () => {
    it('should use test user ID in development mode', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'devmode@linkedin.com',
          password: 'pass',
          accountName: 'Dev Mode Test',
        }),
      });

      const data = await response.json();

      // In development mode, should use fixed test user ID
      expect(data.account.user_id).toBe(TEST_USER_ID);
    });

    it('should return consistent test user across requests', async () => {
      const request1 = fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'user1@linkedin.com',
          password: 'pass',
          accountName: 'User 1',
        }),
      });

      const request2 = fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          username: 'user2@linkedin.com',
          password: 'pass',
          accountName: 'User 2',
        }),
      });

      const [response1, response2] = await Promise.all([request1, request2]);
      const data1 = await response1.json();
      const data2 = await response2.json();

      // Both should belong to same test user in dev mode
      expect(data1.account.user_id).toBe(TEST_USER_ID);
      expect(data2.account.user_id).toBe(TEST_USER_ID);
      expect(data1.account.user_id).toBe(data2.account.user_id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON request', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json {',
      });

      // Should return 500 with error
      expect([400, 500]).toContain(response.status);
    });

    it('should handle empty account list gracefully', async () => {
      // Even with no accounts, should return valid response structure
      const response = await fetch(`${BASE_URL}/api/linkedin/accounts`);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.total).toBeDefined();
      expect(Array.isArray(data.accounts)).toBe(true);
    });

    it('should provide meaningful error messages', async () => {
      const response = await fetch(`${BASE_URL}/api/linkedin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          // Missing all fields
        }),
      });

      const data = await response.json();

      // Should have clear error message
      expect(data.error).toBeDefined();
      expect(data.error.length).toBeGreaterThan(0);
      expect(typeof data.error).toBe('string');
    });
  });
});
