/**
 * Shared Supabase Mock Helper
 *
 * Creates properly chainable mocks for Supabase operations
 */

export function createMockSupabaseClient() {
  const mockClient: any = {};

  // Create chainable query builder
  const createQueryBuilder = () => {
    const builder: any = {};

    // All chainable methods return builder
    const chainableMethods = [
      'select', 'insert', 'update', 'delete', 'upsert',
      'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
      'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
      'order', 'limit', 'range', 'filter', 'match',
      'or', 'and', 'not', 'textSearch',
    ];

    chainableMethods.forEach(method => {
      builder[method] = jest.fn().mockReturnValue(builder);
    });

    // Terminal methods that resolve
    builder.single = jest.fn().mockResolvedValue({ data: null, error: null });
    builder.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

    // Make builder thenable for await
    const defaultResult = { data: [], error: null };
    builder.then = jest.fn((onFulfilled) => Promise.resolve(defaultResult).then(onFulfilled));
    builder.catch = jest.fn((onRejected) => Promise.resolve(defaultResult).catch(onRejected));

    return builder;
  };

  // Setup from() to return a new query builder each time
  mockClient.from = jest.fn().mockImplementation(() => createQueryBuilder());

  // Auth methods
  mockClient.auth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  };

  // RPC
  mockClient.rpc = jest.fn().mockResolvedValue({ data: null, error: null });

  // Storage
  mockClient.storage = {
    from: jest.fn().mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.png' } }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };

  return mockClient;
}

/**
 * Setup mock for createClient that returns a properly chainable client
 */
export function setupSupabaseMock(createClientMock: jest.Mock) {
  const mockClient = createMockSupabaseClient();
  createClientMock.mockResolvedValue(mockClient);
  return mockClient;
}

/**
 * Configure a mock query to return specific data
 */
export function mockQueryResult(
  mockClient: any,
  tableName: string,
  result: { data: any; error: any }
) {
  const queryBuilder = mockClient.from(tableName);

  // Override the then to return specific result
  queryBuilder.then = jest.fn((onFulfilled) =>
    Promise.resolve(result).then(onFulfilled)
  );
  queryBuilder.single.mockResolvedValue(result);
  queryBuilder.maybeSingle.mockResolvedValue(result);

  return queryBuilder;
}
